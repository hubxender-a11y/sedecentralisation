"use client";

import React, { useRef, useState } from 'react';

type Props = {
  conversationId: string;
  onUploaded: (url: string, name: string) => void;
  uploadFn: (conversationId: string, filename: string, contentBase64: string, contentType?: string, contentSize?: number) => Promise<any>;
  allowedTypes?: string[]; // MIME types allowed
  maxSizeBytes?: number; // max file size in bytes
};

const DEFAULT_MAX = 10 * 1024 * 1024; // 10 MB
const DEFAULT_TYPES = ['image/*', 'audio/*', 'application/pdf', 'text/plain'];

export default function FileUploader({ conversationId, onUploaded, uploadFn, allowedTypes = DEFAULT_TYPES, maxSizeBytes = DEFAULT_MAX }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    setError(null);
    if (!file) return;

    // validate size
    if (file.size > maxSizeBytes) {
      setError(`Fichier trop volumineux. Taille max: ${Math.round(maxSizeBytes / 1024 / 1024)} MB`);
      return;
    }

    // validate type if provided
    if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      // try to provide a helpful message with extension fallback
      const ext = file.name.split('.').pop();
      setError(`Type de fichier non autorisé (${file.type || ext}). Types autorisés: ${allowedTypes.join(', ')}`);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setError('Erreur lors de la lecture du fichier');
      setUploading(false);
    };

    reader.onload = async () => {
      try {
        setUploading(true);
        setCurrentFileName(file.name);
        const result = reader.result as string;
        // data:*/*;base64,XXXXX
        const base64 = result.split(',')[1];
        const res = await uploadFn(conversationId, file.name, base64, file.type, file.size);
        setUploading(false);
        setCurrentFileName(null);
        if (res?.ok) {
          onUploaded(res.url, res.name);
        } else {
          setError(res?.error ?? 'Échec de l\'upload');
        }
      } catch (e: any) {
        setUploading(false);
        setCurrentFileName(null);
        setError(e?.message ?? 'Erreur lors de l\'upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const acceptAttr = allowedTypes && allowedTypes.length > 0 ? allowedTypes.join(',') : undefined;

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <button
        onClick={() => {
          setError(null);
          inputRef.current?.click();
        }}
        className={`px-2 py-1 rounded text-sm ${uploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'}`}
        disabled={uploading}
        title={`Joindre un fichier (max ${Math.round(maxSizeBytes / 1024 / 1024)} MB)`}
      >
        {uploading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Chargement...
          </span>
        ) : (
          'Joindre'
        )}
      </button>

      {currentFileName && <div className="text-xs text-gray-500">{currentFileName}</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
