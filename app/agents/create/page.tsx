'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  FileText,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Save,
  Camera
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import OfficeHeader from '@/components/OfficeHeader';
import OfficeSidebar from '@/components/OfficeSidebar';
import RdcLogo from '@/components/RdcLogo';
import { buildAuthHeaders, getCurrentUser } from '@/lib/accessControl';
import './create-agent.css';

type DocumentFile = {
  file: File;
  previewUrl?: string;
  name: string;
  size: string;
  type: string;
  saved?: boolean;
  ocrText?: string | null;
};

type Direction = {
  id: string;
  nom: string;
};

type Division = {
  id: string;
  nom: string;
  directionId?: string;
  directionNom?: string;
};

type Service = {
  id: string;
  nom: string;
  directionId: string;
  directionNom?: string;
  divisionId?: string;
  divisionNom?: string;
};

type Grade = {
  id: string;
  nom: string;
};

type FonctionItem = {
  id: string;
  nom: string;
};

type District = {
  id: string;
  nom: string;
};

type Ville = {
  id: string;
  nom: string;
  districtId: string;
};

type Commune = {
  id: string;
  nom: string;
  villeId: string;
};

type AgentForm = {
  nom: string;
  postNom: string;
  prenom: string;
  dateNaissance: string;
  dateEngagement: string;
  acteEngagement: string;
  sexe: string;
  nationalite: string;
  matricule: string;
  typeCarte: string;
  numeroCarte: string;
  expirationCarte: string;
  lieuDelivrance: string;
  directionId: string;
  gradeId: string;
  gradeNom: string;
  fonctionId: string;
  fonctionNom: string;
  divisionId: string;
  division: string;
  serviceId: string;
  service: string;

  email: string;
  telephone: string;

  provinceId: string;
  districtId: string;
  villeId: string;
  communeId: string;
  avenue: string;
  code: string;

  prime: 'OUI' | 'NON';
  montantPrime: string;
  statutPaiement: 'PAYE' | 'NON_PAYE';
  montantPaiement: string;
  remunerer: 'OUI' | 'NON';
};

function normalizeErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message || 'Erreur inconnue';
  if (typeof value === 'string') return value.trim() || 'Erreur inconnue';
  if (value && typeof value === 'object') {
    const maybeMessage = (value as { message?: unknown }).message;
    const maybeError = (value as { error?: unknown }).error;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
    if (typeof maybeError === 'string' && maybeError.trim()) return maybeError;
    try {
      return JSON.stringify(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }
  return String(value ?? 'Erreur inconnue');
}

export default function CreateAgentPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanLabel, setScanLabel] = useState('Pièce d’identité');
  const [scanMode, setScanMode] = useState<'preview' | 'autoSave'>('preview');
  const [frameSize, setFrameSize] = useState<'compact' | 'large'>('compact');
  const [ocrEnabled, setOcrEnabled] = useState(false);

  // Local scanner discovery and usage
  const [scannerServiceUrl, setScannerServiceUrl] = useState<string | null>(null);
  const [scanners, setScanners] = useState<Array<{ id: string; name: string; driver?: string }>>([]);
  const [scannerDiscoveryInProgress, setScannerDiscoveryInProgress] = useState(false);
  const [selectedScannerId, setSelectedScannerId] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [fonctions, setFonctions] = useState<FonctionItem[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [currentUserDirection, setCurrentUserDirection] = useState<string | null>(null);
  const [currentUserServiceId, setCurrentUserServiceId] = useState<string | null>(null);

  const API_BASE = '/api';

  const [form, setForm] = useState<AgentForm>({
    nom: '',
    postNom: '',
    prenom: '',
    dateNaissance: '',
    dateEngagement: '',
    acteEngagement: '',
    sexe: '',
    nationalite: 'Congolaise',
    matricule: '',
    typeCarte: '',
    numeroCarte: '',
    expirationCarte: '',
    lieuDelivrance: '',

    directionId: '',
    gradeId: '',
    gradeNom: '',
    fonctionId: '',
    fonctionNom: '',
    divisionId: '',
    division: '',
    serviceId: '',
    service: '',

    email: '',
    telephone: '',

    provinceId: '',
    districtId: '',
    villeId: '',
    communeId: '',
    avenue: '',
    code: '',
    prime: 'NON',
    montantPrime: '',
    statutPaiement: 'NON_PAYE',
    montantPaiement: '',
    remunerer: 'NON',
  });

  async function parseJsonResponse<T>(res: Response): Promise<T | null> {
    if (!res.ok) {
      console.error('Fetch failed', res.status, res.statusText, res.url);
      return null;
    }
    const text = await res.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      console.error('Invalid JSON response from', res.url, error);
      return null;
    }
  }

  async function loadDirections() {
    try {
      const res = await fetch(`${API_BASE}/directions`);
      const data = await parseJsonResponse<Direction[]>(res);
      setDirections(toArray<Direction>(data ?? []));
    } catch (err) {
      console.error('Unable to load directions', err);
    }
  }

  async function loadDivisions(directionId?: string) {
    try {
      const url = directionId
        ? `${API_BASE}/divisions?directionId=${encodeURIComponent(directionId)}`
        : `${API_BASE}/divisions`;
      const res = await fetch(url);
      const data = await parseJsonResponse<Division[]>(res);
      setDivisions(toArray<Division>(data ?? []));
    } catch (err) {
      console.error('Unable to load divisions', err);
    }
  }

  async function loadServices(directionId?: string, divisionId?: string) {
    try {
      const params = new URLSearchParams();
      if (directionId) params.set('directionId', directionId);
      if (divisionId) params.set('divisionId', divisionId);
      const url = `${API_BASE}/services${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      const data = await parseJsonResponse<Service[]>(res);
      const serviceList = toArray<Service>(data ?? []).map((service) => ({
        ...service,
        divisionId: service.divisionId || service.directionId,
      }));
      setServices(serviceList);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadGrades() {
    try {
      const res = await fetch(`${API_BASE}/grades`);
      const data = await parseJsonResponse<Grade[]>(res);
      setGrades(toArray<Grade>(data ?? []));
    } catch (err) {
      console.error('Unable to load grades', err);
    }
  }

  async function loadFonctions() {
    try {
      const res = await fetch(`${API_BASE}/fonctions`);
      const data = await parseJsonResponse<FonctionItem[]>(res);
      setFonctions(toArray<FonctionItem>(data ?? []));
    } catch (err) {
      console.error('Unable to load fonctions', err);
    }
  }

  function refreshAgentLists(directionId?: string) {
    loadDirections();
    loadDivisions(directionId);
    loadServices(directionId);
    loadGrades();
    loadFonctions();
  }

  async function loadDistricts() {
    try {
      const res = await fetch(`${API_BASE}/provinces`);
      const data = await res.json();
      setDistricts(toArray<District>(data));
    } catch (err) {
      console.error('Unable to load provinces', err);
      try {
        const fallback = await fetch(`${API_BASE}/districts`);
        const fallbackData = await fallback.json();
        setDistricts(toArray<District>(fallbackData));
      } catch (fallbackErr) {
        console.error('Unable to load legacy districts', fallbackErr);
      }
    }
  }

  async function loadVilles() {
    try {
      const res = await fetch(`${API_BASE}/villes`);
      const data = await res.json();
      setVilles(toArray<Ville>(data));
    } catch (err) {
      console.error(err);
    }
  }

  async function loadCommunes() {
    try {
      const res = await fetch(`${API_BASE}/communes`);
      const data = await res.json();
      setCommunes(toArray<Commune>(data));
    } catch (err) {
      console.error('Unable to load communes', err);
    }
  }

  useEffect(() => {
    const handleFunctionsUpdated = () => {
      loadFonctions();
    };

    const handleWindowFocus = () => {
      // Refresh is intentionally removed to avoid repeated fetch errors
      // when the app is focused while backend services are temporarily unavailable.
    };

    async function init() {
      loadDistricts();
      loadVilles();
      loadCommunes();

      window.addEventListener('functions:updated', handleFunctionsUpdated);

      try {
        const user = await getCurrentUser();
        if (user?.directionId) {
          setCurrentUserDirection(user.directionId);
          setCurrentUserServiceId(user.serviceId || null);
          updateField('directionId', user.directionId);
          updateField('divisionId', user.divisionId || '');
          updateField('division', user.divisionNom || user.directionNom || '');
          updateField('serviceId', user.serviceId || '');
          updateField('service', user.serviceNom || '');
          refreshAgentLists(user.directionId);
        } else {
          refreshAgentLists();
        }
      } catch (err) {
        console.error('Erreur chargement utilisateur courant', err);
        refreshAgentLists();
      }
    }

    init();

    return () => {
      window.removeEventListener('functions:updated', handleFunctionsUpdated);
    };
  }, []);

  function updateField(field: keyof AgentForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function toArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
      return value as T[];
    }
    if (
      value &&
      typeof value === 'object' &&
      'data' in value &&
      Array.isArray((value as { data?: unknown }).data)
    ) {
      return (value as { data: T[] }).data;
    }
    return [];
  }

  const filteredDivisions = divisions.filter((division) => {
    if (!form.directionId) return true;
    return division.directionId === form.directionId || division.id === form.directionId;
  });

  const selectedDirectionName = directions.find((direction) => direction.id === (currentUserDirection || form.directionId))?.nom || '';
  const selectedDivisionName = divisions.find((division) => division.id === form.divisionId)?.nom || '';
  const selectedServiceName = services.find((service) => service.id === form.serviceId)?.nom || '';

  const filteredServices = services.filter((service) => {
    if (currentUserServiceId && service.id !== currentUserServiceId) {
      return false;
    }

    if (form.divisionId) {
      return service.divisionId === form.divisionId;
    }

    if (form.directionId) {
      return service.directionId === form.directionId;
    }

    return true;
  });

  const steps = [
    { id: 1, title: 'Informations', icon: <User size={20} /> },
    { id: 2, title: 'Documents', icon: <FileText size={20} /> },
  ];

  function nextStep() {
    setError('');

    if (step === 1) {
      const hasRequiredIdentity = Boolean(form.nom?.trim()) && Boolean(form.postNom?.trim());

      if (!hasRequiredIdentity) {
        setError('Le nom et le postnom sont obligatoires');
        return;
      }
    }

    if (step < 2) {
      setStep(step + 1);
    }
  }

  function previousStep() {
    setError('');
    if (step > 1) {
      setStep(step - 1);
    }
  }

  function validateForm(): string | null {
    const hasRequiredIdentity = Boolean(form.nom?.trim()) && Boolean(form.postNom?.trim());
    if (!hasRequiredIdentity) {
      return 'Le nom et le postnom sont obligatoires';
    }

    if (!form.directionId && !currentUserDirection) {
      return 'La direction est obligatoire.';
    }

    if (!form.divisionId) {
      return 'La division est obligatoire.';
    }

    if (!form.serviceId) {
      return 'Le bureau est obligatoire.';
    }

    const selectedService = services.find((s) => s.id === form.serviceId);
    if (!selectedService) {
      return 'Le bureau sélectionné est invalide.';
    }

    const selectedDirection = directions.find((d) => d.id === (currentUserDirection || form.directionId));
    const selectedDivision = divisions.find((d) => d.id === form.divisionId);
    const selectedDivisionId = form.divisionId;
    const selectedDirectionId = currentUserDirection || form.directionId;

    if (!selectedDirection) {
      return 'La direction sélectionnée est introuvable.';
    }

    if (!selectedDivision) {
      return 'La division sélectionnée est introuvable.';
    }

    if (!form.gradeId) {
      return 'Le grade est obligatoire.';
    }

    if (!form.fonctionId) {
      return 'La fonction est obligatoire.';
    }

    const divisionMatches = selectedService && selectedDivisionId && (
      selectedService.divisionId === selectedDivisionId ||
      selectedService.divisionNom === selectedDivision?.nom
    );
    const directionMatches = selectedService && selectedDirectionId && (
      selectedService.directionId === selectedDirectionId ||
      selectedService.directionNom === selectedDirection?.nom
    );

    if (selectedService && selectedDivisionId && !divisionMatches) {
      return 'Le bureau sélectionné doit appartenir à la division choisie.';
    }

    if (selectedService && selectedDirectionId && !directionMatches) {
      return 'Le bureau sélectionné doit appartenir à la direction choisie.';
    }

    const matriculeRaw = form.matricule.trim();
    const isBlank = matriculeRaw === '';
    const isNU = /^(?:N\.?U)$/i.test(matriculeRaw);
    const normalizedDigits = matriculeRaw.replace(/[\.\s-]/g, '');
    const hasNumericMatricule = /^[0-9]+$/.test(normalizedDigits);

    if (!isBlank && !isNU && !hasNumericMatricule) {
      return 'Le matricule doit être soit N.U soit un numéro valide composé uniquement de chiffres, ou vide pour N.U.';
    }

    if (form.remunerer === 'OUI') {
      const montant = Number(form.montantPaiement);
      if (!form.montantPaiement.trim() || Number.isNaN(montant) || montant <= 0) {
        return 'Veuillez saisir un montant de paiement valide pour un agent rémunéré.';
      }
    }

    if (form.prime === 'OUI') {
      const montantPrime = Number(form.montantPrime);
      if (!form.montantPrime.trim() || Number.isNaN(montantPrime) || montantPrime <= 0) {
        return 'Veuillez saisir un montant de prime valide lorsque la prime est accordée.';
      }
    }

    return null;
  }

  async function handleDocuments(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const newFiles = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type,
    }));

    setDocuments((prev) => [...prev, ...newFiles]);
    event.target.value = '';
  }

  async function startScan() {
    try {
      setScanError('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('L’accès à la caméra n’est pas pris en charge par ce navigateur.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraStream(stream);
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      }

      // Auto capture after a short delay for smoother UX. If scanMode is 'autoSave' it will
      // mark the resulting document as saved in the list.
      window.setTimeout(() => {
        captureScan();
      }, 1800);
    } catch (error) {
      console.error('Erreur accès caméra', error);
      setScanError(error instanceof Error ? error.message : 'Impossible d’ouvrir la caméra.');
      setIsScanning(false);
    }
  }

  function stopScan() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsScanning(false);
  }

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  async function performOcr(file: File): Promise<string | null> {
    // Stub for OCR. Integrate a service (Tesseract.js or server-side OCR) later.
    // Returning null currently; after integration return extracted text.
    return null;
  }

  // Try to discover a local scanner service on common ports and endpoints.
  async function probeUrlForScanners(base: string, timeout = 3000): Promise<string | null> {
    const endpoints = ['/api/scanners', '/scanners', '/api/devices', '/devices', '/status', '/ping'];
    for (const ep of endpoints) {
      const url = `${base.replace(/\/$/, '')}${ep}`;
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(url, { method: 'GET', mode: 'cors', signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) continue;
        // if endpoint returns JSON array of scanners, consider it valid
        const text = await res.text();
        if (!text) return base;
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json)) return base;
          if (json && (json.scanners || json.devices)) return base;
          // if status/ping returns something, accept base
          return base;
        } catch {
          // non-json response but HTTP 200, accept base
          return base;
        }
      } catch (err) {
        // ignore and try next
      }
    }
    return null;
  }

  async function discoverLocalScannerService() {
    if (scannerDiscoveryInProgress) return;
    setScannerDiscoveryInProgress(true);
    setScannerError(null);

    const candidates = [
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:59152',
      'http://localhost:65100',
      'http://127.0.0.1:3001',
    ];

    for (const c of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const found = await probeUrlForScanners(c, 2000);
      if (found) {
        setScannerServiceUrl(found);
        setScannerDiscoveryInProgress(false);
        return found;
      }
    }

    setScannerDiscoveryInProgress(false);
    setScannerError('Aucun service de numérisation local détecté.');
    return null;
  }

  async function fetchScannersFromService(base: string) {
    setScannerError(null);
    try {
      const endpoints = ['/api/scanners', '/scanners', '/api/devices', '/devices'];
      for (const ep of endpoints) {
        try {
          const res = await fetch(`${base.replace(/\/$/, '')}${ep}`);
          if (!res.ok) continue;
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.scanners || data.devices || []);
          const mapped = (list || []).map((s: any) => ({ id: String(s.id || s.name || s.deviceId || s.uuid), name: s.name || s.label || s.device || String(s.id) }));
          setScanners(mapped);
          if (mapped.length) setSelectedScannerId(mapped[0].id);
          return mapped;
        } catch (err) {
          // try next endpoint
        }
      }
      setScannerError('Impossible de récupérer la liste des scanners depuis le service.');
      return [] as any;
    } catch (err) {
      setScannerError('Erreur de communication avec le service de numérisation.');
      return [] as any;
    }
  }

  async function startLocalScan() {
    setScannerError(null);
    if (!scannerServiceUrl) {
      const found = await discoverLocalScannerService();
      if (!found) return;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await fetchScannersFromService(found!);
    } else {
      await fetchScannersFromService(scannerServiceUrl);
    }
  }

  async function discoverInstalledScanners() {
    setScannerDiscoveryInProgress(true);
    setScannerError(null);
    try {
      const res = await fetch(`${API_BASE}/scan-local?devices=1`);
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Aucun scanner connecté détecté.');
      const mapped = Array.isArray(data.scanners) ? data.scanners : [];
      setScanners(mapped);
      if (mapped.length > 0) {
        setSelectedScannerId(mapped[0].id);
        setScannerServiceUrl('local-naps2');
      } else {
        throw new Error('Aucun scanner connecté détecté par NAPS2.');
      }
      return mapped;
    } catch (err) {
      setScannerError(err instanceof Error ? err.message : 'Impossible de détecter le scanner.');
      return [];
    } finally {
      setScannerDiscoveryInProgress(false);
    }
  }

  async function initiateLocalScan() {
    if (!scannerServiceUrl || !selectedScannerId) {
      setScannerError('Sélectionnez d’abord un scanner.');
      return;
    }

    setScannerError(null);
    try {
      const res = await fetch(`${scannerServiceUrl.replace(/\/$/, '')}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedScannerId, format: 'png', color: true }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Erreur lors du scan');
      }
      const blob = await res.blob();
      const file = new File([blob], `scan-${Date.now()}.png`, { type: blob.type || 'image/png' });
      setDocuments((prev) => [
        ...prev,
        { file, previewUrl: URL.createObjectURL(file), name: file.name, size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, type: file.type, saved: true },
      ]);
    } catch (err: unknown) {
      console.error('Local scan failed', err);
      setScannerError(err instanceof Error ? err.message : 'Erreur du scanner local');
    }
  }

  function captureScan() {
    const video = videoRef.current;
    if (!video || !cameraStream) {
      return;
    }

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      stopScan();
      return;
    }

    // Adjust crop depending on frameSize preference
    const cropFactor = frameSize === 'large' ? 0.88 : 0.72;
    const cropWidth = Math.min(width, height * cropFactor);
    const cropHeight = cropWidth * 0.6;
    const cropX = (width - cropWidth) / 2;
    const cropY = (height - cropHeight) / 2;

    context.fillStyle = '#111827';
    context.fillRect(0, 0, width, height);
    context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, width, height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        stopScan();
        return;
      }

      const label = scanLabel.trim() || 'piece-identite';
      const safeLabel = label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'piece-identite';

      const file = new File([blob], `${safeLabel}-${Date.now()}.png`, { type: 'image/png' });

      const newDoc: DocumentFile = {
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.type,
        saved: scanMode === 'autoSave',
        ocrText: null,
      };

      setDocuments((prev) => [...prev, newDoc]);

      // If OCR requested, run the stub (or real OCR when integrated) and attach result
      if (ocrEnabled) {
        try {
          const text = await performOcr(file);
          setDocuments((prev) => {
            const copy = [...prev];
            const idx = copy.findIndex((d) => d.name === newDoc.name);
            if (idx !== -1) {
              copy[idx] = { ...copy[idx], ocrText: text };
            }
            return copy;
          });
        } catch (err) {
          console.error('OCR failed', err);
        }
      }

      // reset scanMode to preview after an autosave capture
      setScanMode('preview');
      stopScan();
    }, 'image/png', 0.96);
  }

  function removeDocument(index: number) {
    const documentToRemove = documents[index];
    if (documentToRemove?.previewUrl) URL.revokeObjectURL(documentToRemove.previewUrl);
    setDocuments(documents.filter((_, i) => i !== index));
  }

  async function submitAgent() {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      const selectedService = services.find((s) => s.id === form.serviceId);
      const selectedDirection = directions.find((d) => d.id === (currentUserDirection || form.directionId));
      const selectedDivision = divisions.find((d) => d.id === form.divisionId);
      const matriculeRaw = form.matricule.trim();
      const isBlank = matriculeRaw === '';
      const isNU = /^(?:N\.?U)$/i.test(matriculeRaw);
      const normalizedDigits = matriculeRaw.replace(/[\.\s-]/g, '');
      const normalizedMatricule = isBlank || isNU ? 'N.U' : normalizedDigits;

      const payload: Record<string, unknown> = {
        nom: form.nom,
        postNom: form.postNom,
        prenom: form.prenom,
        dateNaissance: form.dateNaissance || undefined,
        dateEngagement: form.dateEngagement || undefined,
        acteEngagement: form.acteEngagement || undefined,
        sexe: form.sexe,
        nationalite: form.nationalite,
        matricule: normalizedMatricule,
        typeCarte: form.typeCarte,
        numeroCarte: form.numeroCarte,
        expirationCarte: form.expirationCarte,
        lieuDelivrance: form.lieuDelivrance,
        email: form.email.trim() || undefined,
        telephone: form.telephone,
        directionId: currentUserDirection || form.directionId || undefined,
        directionNom: selectedDirection?.nom || undefined,
        divisionId: form.divisionId || undefined,
        division: selectedDivision?.nom || form.division || undefined,
        serviceId: form.serviceId || undefined,
        service: selectedService?.nom,
        gradeId: form.gradeId || undefined,
        gradeNom: grades.find((grade) => grade.id === form.gradeId)?.nom || undefined,
        fonctionId: form.fonctionId || undefined,
        fonctionNom: fonctions.find((fonction) => fonction.id === form.fonctionId)?.nom || undefined,
        provinceId: form.provinceId || form.districtId || undefined,
        districtId: form.districtId || form.provinceId || undefined,
        communeId: form.communeId || undefined,
        avenue: form.avenue,
        code: form.code,
        prime: form.prime,
        montantPrime: form.prime === 'OUI' ? Number(form.montantPrime) : undefined,
        remunerer: form.remunerer,
        statutPaiement: form.remunerer === 'OUI' ? 'PAYE' : 'NON_PAYE',
        montantPaiement: form.remunerer === 'OUI' ? Number(form.montantPaiement) : undefined,
        statut: 'VERIFICATION',
      };

      console.log('JSON ENVOYE', JSON.stringify(payload));

      const response = await fetch(`${API_BASE}/agents`, {
        method: 'POST',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseBody: { id?: string; error?: string } | null = null;

      if (responseText) {
        try {
          responseBody = JSON.parse(responseText) as { id?: string; error?: string };
        } catch {
          responseBody = null;
        }
      }

      if (!response.ok) {
        const errorMessage = responseBody?.error || responseText || 'Erreur création agent';
        throw new Error(errorMessage);
      }

      const agent = responseBody && typeof responseBody === 'object' && 'id' in responseBody
        ? responseBody as { id: string }
        : null;

      if (!agent?.id) {
        throw new Error('La création a échoué : réponse invalide du serveur');
      }

      for (const doc of documents) {
        const data = new FormData();
        data.append('file', doc.file);
        data.append('agentId', agent.id);

        await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          headers: buildAuthHeaders(),
          body: data,
        });
      }

      setSuccess('Agent créé avec succès');

      setTimeout(() => {
        router.push(`/agents/${agent.id}`);
      }, 1500);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erreur création agent";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function scanLocalAndAddDocument() {
    try {
      setScannerError(null);
      setIsScanning(true);

      const res = await fetch(`${API_BASE}/scan-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device: scanners.find((scanner) => scanner.id === selectedScannerId)?.name || selectedScannerId,
          driver: scanners.find((scanner) => scanner.id === selectedScannerId)?.driver,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Erreur lors du scan local');
      }

      const data = await res.json();
      if (!data || !data.ok) {
        throw new Error(data?.error || 'Scan local retourné une réponse invalide');
      }

      // Convert dataUrl to File
      const dataUrl: string = data.dataUrl;
      const parts = dataUrl.split(',');
      const meta = parts[0];
      const b64 = parts[1];
      const byteChars = atob(b64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const file = new File([byteArray], data.filename || `scan-${Date.now()}.png`, { type: 'image/png' });

      const newDoc: DocumentFile = {
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.type,
        saved: true,
        ocrText: null,
      };

      setDocuments((prev) => [...prev, newDoc]);
      setIsScanning(false);
    } catch (err: unknown) {
      console.error('scan-local failed', err);
      setScannerError(normalizeErrorMessage(err));
      setIsScanning(false);
    }
  }

  return (
    <div className="office-layout">
      <OfficeHeader />

      <div className="office-body">
        <OfficeSidebar />

        <main className="office-content">
          <div className="create-agent-container">
            {/* RDC OFFICIAL BANNER */}
            <div
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px 28px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <RdcLogo size="lg" variant="full" />

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                      textTransform: 'uppercase',
                    }}
                  >
                    ENREGISTREMENT DOSSIER AGENT
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Secrétariat Général à la Décentralisation • RDC
                  </p>
                </div>
              </div>
            </div>

            <div className="create-top">
              <Link href="/agents" className="back-link">
                <ChevronLeft size={18} />
                Retour agents
              </Link>
              <h1>Nouveau dossier agent de l&apos;État</h1>
              <p>Renseignez la hiérarchie administrative (Direction, Division, Grade) et l&apos;état civil de l&apos;agent.</p>
            </div>

            <div className="stepper">
              {steps.map((item) => (
                <div
                  key={item.id}
                  className={
                    step === item.id
                      ? 'step active'
                      : step > item.id
                      ? 'step completed'
                      : 'step'
                  }
                >
                  <div className="step-icon">
                    {step > item.id ? <CheckCircle size={20} /> : item.icon}
                  </div>
                  <span>{item.title}</span>
                </div>
              ))}
            </div>

            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}

            <form className="agent-form" onSubmit={(e) => e.preventDefault()}>
              {/* ========================= ETAPE 1 INFORMATIONS ========================= */}
              {step === 1 && (
                <section className="form-step">
                  <div className="form-title">
                    <User />
                    <h2>Informations administratives de l&apos;agent</h2>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label>Nom *</label>
                      <input
                        value={form.nom}
                        onChange={(e) => updateField('nom', e.target.value)}
                        placeholder="Ex: KABAMBA"
                      />
                    </div>

                    <div className="field">
                      <label>Postnom *</label>
                      <input
                        value={form.postNom}
                        onChange={(e) => updateField('postNom', e.target.value)}
                        placeholder="Ex: MULAMBA"
                      />
                    </div>

                    <div className="field">
                      <label>Prénom</label>
                      <input
                        value={form.prenom}
                        onChange={(e) => updateField('prenom', e.target.value)}
                        placeholder="Ex: Jean-Luc"
                      />
                    </div>

                    <div className="field">
                      <label>Date de naissance *</label>
                      <input
                        type="date"
                        value={form.dateNaissance}
                        onChange={(e) => updateField('dateNaissance', e.target.value)}
                      />
                    </div>

                    <div className="field">
                      <label>Date d&apos;engagement *</label>
                      <input
                        type="date"
                        value={form.dateEngagement}
                        onChange={(e) => updateField('dateEngagement', e.target.value)}
                      />
                    </div>

                    <div className="field">
                      <label>Acte d&apos;engagement *</label>
                      <input
                        value={form.acteEngagement}
                        onChange={(e) => updateField('acteEngagement', e.target.value)}
                        placeholder="Ex: Acte N° 201"
                      />
                    </div>

                    <div className="field">
                      <label>Sexe *</label>
                      <select
                        value={form.sexe}
                        onChange={(e) => updateField('sexe', e.target.value)}
                      >
                        <option value="">Sélectionner</option>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                      </select>
                    </div>

                    <div className="field">
                      <label>Matricule</label>
                      <input
                        value={form.matricule}
                        onChange={(e) => updateField('matricule', e.target.value)}
                        placeholder="Ex: 100001 ou laisser vide pour N.U"
                      />
                    </div>

                    <div className="field">
                      <label>Grade *</label>
                      <select
                        value={form.gradeId}
                        onChange={(e) => updateField('gradeId', e.target.value)}
                      >
                        <option value="">Choisir un grade</option>
                        {grades.map((grade) => (
                          <option key={grade.id} value={grade.id}>
                            {grade.nom}
                          </option>
                        ))}
                      </select>
                      <small style={{ color: '#64748b', marginTop: '6px', display: 'block' }}>
                        Les grades ajoutés depuis la page Grades apparaissent ici automatiquement.
                      </small>
                    </div>

                    <div className="field">
                      <label>Fonction *</label>
                      <select
                        value={form.fonctionId}
                        onChange={(e) => updateField('fonctionId', e.target.value)}
                      >
                        <option value="">Choisir une fonction</option>
                        {fonctions.map((fonction) => (
                          <option key={fonction.id} value={fonction.id}>
                            {fonction.nom}
                          </option>
                        ))}
                      </select>
                      <small style={{ color: '#64748b', marginTop: '6px', display: 'block' }}>
                        Les fonctions ajoutées depuis la page Fonctions apparaissent ici automatiquement.
                      </small>
                    </div>

                    <div className="field">
                      <label>Direction *</label>
                      <select
                        value={form.directionId}
                        onChange={(e) => {
                          const nextDirectionId = e.target.value;
                          updateField('directionId', nextDirectionId);
                          updateField('divisionId', '');
                          updateField('serviceId', '');
                          updateField('service', '');
                          if (nextDirectionId) {
                            void loadDivisions(nextDirectionId);
                            void loadServices(nextDirectionId);
                          } else {
                            void loadDivisions();
                            void loadServices();
                          }
                        }}
                        disabled={Boolean(currentUserDirection)}
                      >
                        <option value="">Choisir une direction</option>
                        {directions.map((direction) => (
                          <option key={direction.id} value={direction.id}>
                            {direction.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Division *</label>
                      <select
                        value={form.divisionId}
                        onChange={(e) => {
                          const nextDivisionId = e.target.value;
                          updateField('divisionId', nextDivisionId);
                          updateField('serviceId', '');
                          updateField('service', '');
                          if (nextDivisionId) {
                            void loadServices(form.directionId || currentUserDirection || '', nextDivisionId);
                          } else if (form.directionId || currentUserDirection) {
                            void loadServices(form.directionId || currentUserDirection || '');
                          }
                        }}
                        disabled={!form.directionId}
                      >
                        <option value="">Choisir une division</option>
                        {filteredDivisions.map((division) => (
                          <option key={division.id} value={division.id}>
                            {division.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Bureau *</label>
                      <select
                        value={form.serviceId}
                        onChange={(e) => {
                          const selected = services.find((s) => s.id === e.target.value);
                          updateField('serviceId', e.target.value);
                          updateField('service', selected?.nom || '');
                        }}
                      >
                        <option value="">Choisir un bureau</option>
                        {filteredServices.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Téléphone</label>
                      <input
                        value={form.telephone}
                        onChange={(e) => updateField('telephone', e.target.value)}
                        placeholder="Ex: +243 81 123 4567"
                      />
                    </div>

                    <div className="field">
                      <label>Rémunération (Oui / Non) *</label>
                      <select
                        value={form.remunerer}
                        onChange={(e) => {
                          const remunererValue = e.target.value as 'OUI' | 'NON';
                          updateField('remunerer', remunererValue);
                          updateField('statutPaiement', remunererValue === 'OUI' ? 'PAYE' : 'NON_PAYE');
                          if (remunererValue === 'NON') {
                            updateField('montantPaiement', '');
                          }
                        }}
                      >
                        <option value="NON">Non</option>
                        <option value="OUI">Oui</option>
                      </select>
                    </div>

                    {form.remunerer === 'OUI' && (
                      <div className="field">
                        <label>Montant de paiement *</label>
                        <input
                          type="number"
                          min="0"
                          value={form.montantPaiement}
                          onChange={(e) => updateField('montantPaiement', e.target.value)}
                          placeholder="Ex: 500000"
                        />
                        <small style={{ color: '#64748b', marginTop: '6px', display: 'block' }}>
                          Saisissez le montant à verser uniquement si l&apos;agent est rémunéré.
                        </small>
                      </div>
                    )}

                    <div className="field">
                      <label>Prime (Oui / Non) *</label>
                      <select
                        value={form.prime}
                        onChange={(e) => {
                          const primeValue = e.target.value as 'OUI' | 'NON';
                          updateField('prime', primeValue);
                          if (primeValue === 'NON') {
                            updateField('montantPrime', '');
                          }
                        }}
                      >
                        <option value="NON">Non</option>
                        <option value="OUI">Oui</option>
                      </select>
                    </div>

                    {form.prime === 'OUI' && (
                      <div className="field">
                        <label>Montant de prime *</label>
                        <input
                          type="number"
                          min="0"
                          value={form.montantPrime}
                          onChange={(e) => updateField('montantPrime', e.target.value)}
                          placeholder="Ex: 100000"
                        />
                        <small style={{ color: '#64748b', marginTop: '6px', display: 'block' }}>
                          Saisissez le montant de la prime uniquement si une prime est accordée.
                        </small>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: '20px',
                      border: '1px solid #dbeafe',
                      borderRadius: '12px',
                      background: '#f8fbff',
                      padding: '14px 16px',
                      display: 'grid',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Chemin sélectionné
                    </div>
                    <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 600 }}>
                      {selectedDirectionName || 'Direction non sélectionnée'}
                      {' > '}
                      {selectedDivisionName || 'Division non sélectionnée'}
                      {' > '}
                      {selectedServiceName || 'Bureau non sélectionné'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Ces informations seront enregistrées dans la structure hiérarchique de la base MySQL.
                    </div>
                  </div>
                </section>
              )}

              {/* ========================= ETAPE 2 DOCUMENTS ========================= */}
              {step === 2 && (
                <section className="form-step">
                  <div className="form-title">
                    <FileText />
                    <h2>Documents administratifs</h2>
                  </div>

                  <div className="upload-zone">
                    <Upload size={35} />
                    <div className="upload-actions">
                      <label onClick={() => uploadInputRef.current?.click()}>
                        Ajouter les documents
                      </label>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="scan-btn"
                          onClick={async () => {
                            setScannerError(null);
                            const detected = await discoverInstalledScanners();
                            if (!detected.length) startScan();
                          }}
                        >
                          <Camera size={16} />
                          Scanner (matériel)
                        </button>

                        <button
                          type="button"
                          className="scan-btn"
                          onClick={startScan}
                        >
                          <Camera size={16} />
                          Scanner (caméra)
                        </button>
                      </div>
                    </div>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg"
                      hidden
                      onChange={handleDocuments}
                    />
                    {/* Local scanner discovery & controls */}
                    {scannerDiscoveryInProgress && <p style={{ marginTop: 8 }}>Recherche de périphériques de numérisation...</p>}

                    {scannerServiceUrl && scanners.length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                        <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>Scanner matériel détecté</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <select value={selectedScannerId || ''} onChange={(e) => setSelectedScannerId(e.target.value)} style={{ flex: 1, height: 38, borderRadius: 8, border: '1px solid #fecaca', padding: '0 10px' }}>
                            {scanners.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <button type="button" className="primary-scan-btn" onClick={scanLocalAndAddDocument}>
                            Lancer le scan
                          </button>
                        </div>
                      </div>
                    )}

                    {!scannerServiceUrl && !scannerDiscoveryInProgress && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input placeholder="URL service de numérisation (ex: http://localhost:3001)" value={scannerServiceUrl || ''} onChange={(e) => setScannerServiceUrl(e.target.value || null)} style={{ flex: 1, height: 36, borderRadius: 8, border: '1px solid #fecaca', padding: '0 10px' }} />
                        <button type="button" className="scan-btn" onClick={async () => {
                          if (!scannerServiceUrl) {
                            setScannerError('Entrez l’URL du service ou cliquez sur Scanner (matériel) pour rechercher.');
                            return;
                          }
                          await fetchScannersFromService(scannerServiceUrl);
                        }}>Utiliser</button>
                      </div>
                    )}

                    {scannerError && <p className="scan-error">{scannerError}</p>}

                    {isScanning && (
                      <div className="camera-preview">                        <div className="camera-frame">
                          <video ref={videoRef} autoPlay playsInline muted />
                          <div className={`capture-overlay ${frameSize === 'large' ? 'overlay-large' : 'overlay-compact'}`} />
                        </div>
                        <div className="scan-caption">Placez la pièce d’identité dans le cadre et gardez le document bien aligné.</div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 6 }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <input type="radio" name="frameSize" checked={frameSize === 'compact'} onChange={() => setFrameSize('compact')} />{' '}
                            Compact
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <input type="radio" name="frameSize" checked={frameSize === 'large'} onChange={() => setFrameSize('large')} />{' '}
                            Large
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" checked={ocrEnabled} onChange={(e) => setOcrEnabled(e.target.checked)} /> OCR
                          </label>
                        </div>

                        <div className="camera-actions">
                          <button type="button" className="primary-scan-btn" onClick={() => { setScanMode('autoSave'); captureScan(); }}>
                            Numériser et enregistrer
                          </button>

                          <button type="button" className="scan-btn" onClick={captureScan}>
                            Capturer maintenant
                          </button>

                          <button type="button" className="secondary-btn small-btn" onClick={stopScan}>
                            Fermer
                          </button>
                        </div>
                      </div>
                    )}
                    {scanError && <p className="scan-error">{scanError}</p>}
                    <p>PDF, JPG ou PNG • ou scanner depuis la caméra</p>
                  </div>

                  <div className="document-list">
                    {documents.length === 0 && <p>Aucun document ajouté</p>}

                    {documents.map((doc, index) => (
                      <div className="document-item" key={index}>
                        {doc.type.startsWith('image/') && doc.previewUrl ? (
                          <a href={doc.previewUrl} target="_blank" rel="noreferrer" className="document-preview-link" title="Ouvrir l’aperçu">
                            <img src={doc.previewUrl} alt={`Aperçu de ${doc.name}`} className="document-preview-image" />
                          </a>
                        ) : doc.type === 'application/pdf' && doc.previewUrl ? (
                          <a href={doc.previewUrl} target="_blank" rel="noreferrer" className="document-preview-pdf" title="Ouvrir le PDF">
                            <FileText size={24} /> PDF
                          </a>
                        ) : (
                          <FileText size={22} />
                        )}
                        <div>
                          <strong>{doc.name} {doc.saved ? <span style={{ color: '#059669', fontSize: 12, marginLeft: 8 }}>(Enregistré)</span> : null}</strong>
                          <span>{doc.size}</span>
                          {doc.previewUrl && <a href={doc.previewUrl} target="_blank" rel="noreferrer" className="document-open-link">Voir le fichier</a>}
                          {doc.ocrText ? (
                            <div style={{ marginTop: 6, fontSize: 13, color: '#334155' }}>
                              <strong>OCR :</strong>
                              <div style={{ fontSize: 13 }}>{doc.ocrText}</div>
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ========================= NAVIGATION ========================= */}
              <div className="form-navigation">
                {step > 1 && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={previousStep}
                  >
                    <ChevronLeft size={18} />
                    Retour
                  </button>
                )}

                {step < 2 && (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={nextStep}
                  >
                    Suivant
                    <ChevronRight size={18} />
                  </button>
                )}

                {step === 2 && (
                  <button
                    type="button"
                    className="submit-btn"
                    disabled={loading}
                    onClick={submitAgent}
                  >
                    <Save size={18} />
                    {loading ? "Soumission..." : "Soumettre l'agent"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
