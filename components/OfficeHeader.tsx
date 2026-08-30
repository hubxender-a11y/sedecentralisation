'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, BellRing, CheckCircle2, FileText, GitPullRequest, LogOut, Menu, Plus, Search, ShieldCheck, User, Users, X } from 'lucide-react';
import RdcLogo from '@/components/RdcLogo';
import { clearCurrentUser, getCurrentUser, type AdminUser, buildAuthHeaders } from '@/lib/accessControl';

export default function OfficeHeader() {
  const router = useRouter();
  const STORAGE_KEY = 'kana-notifications-seen';
  const [notifCount, setNotifCount] = useState<number>(0);
  const [openNotif, setOpenNotif] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [notifications, setNotifications] = useState<Array<any>>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>([]);
  const [liveNotification, setLiveNotification] = useState<any | null>(null);
  const knownNotificationIds = useRef<Set<string> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const user = await getCurrentUser();
      if (!cancelled) {
        setCurrentUser(user);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // set state inside a microtask to avoid synchronous setState in the effect body
          Promise.resolve().then(() => setSeenNotificationIds(parsed.map((item) => String(item))));
        }
      }
    } catch {
      // ignore
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/agents/notifications', { headers: buildAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const visible = (data.items || []).filter((item: any) => !seenNotificationIds.includes(String(item.id)));
        setNotifications(visible);
        setNotifCount(visible.length);
      } catch {
        // ignore
      }
    }

    loadStats();
  }, [seenNotificationIds]);

  useEffect(() => {
    let mounted = true;

    function playNotificationSound() {
      try {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(980, audioContext.currentTime + 0.12);
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        oscillator.addEventListener('ended', () => void audioContext.close());
      } catch {
        // Browser audio can be unavailable until the user interacts with the page.
      }
    }

    async function checkForNewNotifications() {
      try {
        const response = await fetch('/api/agents/notifications', { headers: buildAuthHeaders() });
        if (!response.ok || !mounted) return;
        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];
        const currentIds = new Set<string>(items.map((item: any) => String(item.id)));
        if (!knownNotificationIds.current) {
          knownNotificationIds.current = currentIds;
          return;
        }
        const newItem = items.find((item: any) => !knownNotificationIds.current?.has(String(item.id)));
        knownNotificationIds.current = currentIds;
        if (newItem) {
          setLiveNotification(newItem);
          playNotificationSound();
        }
      } catch {
        // Notifications remain optional and must not interrupt the application.
      }
    }

    checkForNewNotifications();
    const interval = window.setInterval(checkForNewNotifications, 15000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!openNotif) return;

    let mounted = true;

    async function loadNotifs() {
      setLoadingNotifs(true);
      try {
        const res = await fetch('/api/agents/notifications', { headers: buildAuthHeaders() });
        if (!res.ok) {
          setNotifications([]);
          setLoadingNotifs(false);
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        const visible = (data.items || []).filter((item: any) => !seenNotificationIds.includes(String(item.id)));
        setNotifications(visible);
        setNotifCount(visible.length);
      } catch {
        if (mounted) setNotifications([]);
      } finally {
        if (mounted) setLoadingNotifs(false);
      }
    }

    loadNotifs();

    return () => {
      mounted = false;
    };
  }, [openNotif, seenNotificationIds]);

  const markNotificationAsSeen = (id: string | number) => {
    const notificationId = String(id);
    setSeenNotificationIds((prev) => {
      if (prev.includes(notificationId)) return prev;
      const next = [...prev, notificationId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    setNotifications((prev) => prev.filter((item) => String(item.id) !== notificationId));
    setNotifCount((prev) => Math.max(0, prev - 1));
    setOpenNotif(false);
    router.push(`/agents/${notificationId}`);
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    if (!showSuggestions) return;
    if (!searchQuery.trim()) {
      // avoid synchronous setState in effect — schedule asynchronously
      Promise.resolve().then(() => setSuggestions([]));
      Promise.resolve().then(() => setLoadingSuggestions(false));
      return;
    }

    if (suggTimer.current) window.clearTimeout(suggTimer.current);
    suggTimer.current = window.setTimeout(async () => {
      // schedule the loading state update asynchronously to avoid sync setState warnings
      Promise.resolve().then(() => setLoadingSuggestions(true));
      try {
        const res = await fetch(`/api/agents/search?q=${encodeURIComponent(searchQuery)}`, { headers: buildAuthHeaders() });
        if (!res.ok) {
          Promise.resolve().then(() => setSuggestions([]));
          Promise.resolve().then(() => setLoadingSuggestions(false));
          return;
        }
        const data = await res.json();
        Promise.resolve().then(() => setSuggestions(data.items || []));
      } catch {
        Promise.resolve().then(() => setSuggestions([]));
      } finally {
        Promise.resolve().then(() => setLoadingSuggestions(false));
      }
    }, 220);

    return () => {
      if (suggTimer.current) window.clearTimeout(suggTimer.current);
    };
  }, [searchQuery, showSuggestions]);

  return (
    <header className="office-header" style={{ overflow: 'visible' }}>
      {liveNotification && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 3000,
            width: 'min(380px, calc(100vw - 32px))',
            padding: '14px 16px',
            borderRadius: 16,
            color: '#172033',
            background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
            border: '1px solid #bfdbfe',
            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.18)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', background: '#2563eb', flexShrink: 0 }}>
            <CheckCircle2 size={18} />
          </div>
          <Link href={`/agents/${liveNotification.id}`} onClick={() => setLiveNotification(null)} style={{ flex: 1, color: 'inherit', textDecoration: 'none' }}>
            <strong style={{ display: 'block', fontSize: 14 }}>Nouvelle notification</strong>
            <span style={{ display: 'block', marginTop: 3, fontSize: 13, color: '#475569' }}>
              {liveNotification.nom} {liveNotification.prenom} attend une vérification.
            </span>
          </Link>
          <button type="button" aria-label="Fermer la notification" onClick={() => setLiveNotification(null)} style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 2 }}>
            <X size={17} />
          </button>
        </div>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', display: 'flex', zIndex: 10 }}>
        <div style={{ flex: 3, backgroundColor: '#0284c7' }} />
        <div style={{ flex: 1, backgroundColor: '#eab308' }} />
        <div style={{ flex: 1, backgroundColor: '#dc2626' }} />
      </div>

      <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
        <RdcLogo size="md" variant="full" />
      </Link>

      <button
        type="button"
        className="mobile-sidebar-toggle"
        aria-label="Ouvrir le menu"
        title="Menu"
        onClick={() => window.dispatchEvent(new Event('toggle-office-sidebar'))}
      >
        <Menu size={20} />
      </button>

      <button
        type="button"
        aria-label="Retour à la page précédente"
        title="Retour"
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push('/');
          }
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          marginLeft: 10,
          border: '1px solid #cbd5e1',
          borderRadius: 9,
          background: '#fff',
          color: '#1e3a8a',
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={18} />
      </button>

      <div className="search-box" style={{ display: 'flex', alignItems: 'center' }}>
        <Search size={18} style={{ cursor: 'pointer' }} onClick={() => searchRef.current?.focus()} />

        <div style={{ position: 'relative', width: 320 }} ref={containerRef}>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(Boolean(e.target.value.trim()));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const target = e.currentTarget as HTMLInputElement;
                if (target.value.trim()) {
                  router.push(`/agents?q=${encodeURIComponent(target.value.trim())}`);
                  setShowSuggestions(false);
                }
              }
            }}
            type="text"
            placeholder="Rechercher un agent, matricule, document..."
            style={{ marginLeft: 8, width: '100%' }}
            onFocus={() => setShowSuggestions(Boolean(searchQuery.trim()))}
          />

          {showSuggestions && (
            <div style={{ position: 'absolute', top: '40px', left: 0, right: 0, zIndex: 2000, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.08)', maxHeight: 280, overflowY: 'auto' }}>
              {loadingSuggestions ? (
                <div style={{ padding: 10, color: '#6b7280' }}>Chargement...</div>
              ) : suggestions.length === 0 ? (
                <div style={{ padding: 10, color: '#6b7280' }}>Aucun résultat</div>
              ) : (
                suggestions.map((s) => (
                  <a
                    key={s.id}
                    href={`/agents/${s.id}`}
                    onClick={(ev) => {
                      ev.preventDefault();
                      setShowSuggestions(false);
                      router.push(`/agents/${s.id}`);
                    }}
                    style={{ display: 'block', padding: '8px 12px', borderBottom: '1px solid #f3f4f6', color: '#111827', textDecoration: 'none' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.nom} {s.prenom}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{s.matricule}</div>
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>{s.montantPaiement ? `${s.montantPaiement} CDF` : ''}</div>
                    </div>
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="user-area">
        <Link href="/agents/create" className="quick-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} />
          <span style={{ fontWeight: 700 }}>Nouveau</span>
        </Link>

        <nav className="header-shortcuts" aria-label="Accès rapides">
          <Link href="/agents" className="header-shortcut" title="Gestion des agents">
            <Users size={17} />
            <span>Agents</span>
          </Link>
          <Link href="/workflows" className="header-shortcut" title="Circuit administratif">
            <GitPullRequest size={17} />
            <span>Workflow</span>
          </Link>
          <Link href="/documents" className="header-shortcut" title="Documents et archives">
            <FileText size={17} />
            <span>Documents</span>
          </Link>
          <Link href="/reports" className="header-shortcut" title="Rapports et statistiques">
            <BarChart3 size={17} />
            <span>Rapports</span>
          </Link>
        </nav>

        <div style={{ position: 'relative' }}>
          <button
            aria-label="Dossiers en vérification"
            title="Dossiers en vérification"
            onClick={() => setOpenNotif((v) => !v)}
            className="notification-shell"
            style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <BellRing size={19} />
            <span className={notifCount > 0 ? 'notif-badge notif-pulse notif-verification' : 'notif-badge notif-verification'}>
              {notifCount > 0 ? notifCount : <ShieldCheck size={10} />}
            </span>
          </button>

          {openNotif && (
            <div style={{ position: 'absolute', right: 0, top: 36, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, width: 320, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px' }}>
                <strong>Notifications</strong>
                <small style={{ color: '#6b7280' }}>{notifCount} dossier(s) en vérification</small>
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {loadingNotifs ? (
                  <div style={{ padding: 12, color: '#6b7280' }}>Chargement...</div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: 12, color: '#6b7280' }}>Aucune notification</div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markNotificationAsSeen(n.id)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none', color: '#111827', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{n.nom} {n.prenom}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{n.matricule}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{n.statut || 'VERIFICATION'}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>Dossier à vérifier</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div style={{ padding: 8, textAlign: 'center' }}>
                <Link href="/agents" onClick={() => setOpenNotif(false)} style={{ color: '#2563eb' }}>Voir tous les dossiers en vérification</Link>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="avatar">
            <User size={22} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '14px', color: '#1e3a8a' }}>{currentUser?.fullName ?? 'Utilisateur'}</strong>
            <small>{currentUser?.email ?? 'Secrétariat Général'}</small>
            {currentUser?.directionNom && <small style={{ display: 'block', color: '#475569' }}>{currentUser.directionNom}</small>}
          </div>
          <button
            type="button"
            onClick={() => {
              clearCurrentUser();
              setCurrentUser(null);
              router.push('/login');
            }}
            style={{ marginLeft: '8px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '999px', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c' }}
            title="Se déconnecter"
          >
            <LogOut size={16} />
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
