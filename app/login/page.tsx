'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { setCurrentUserId } from '@/lib/accessControl';
import RdcLogo from '@/components/RdcLogo';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const responseText = await response.text();
      let payload: any = null;
      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        payload = { ok: false, message: responseText || 'Erreur serveur. Veuillez réessayer.' };
      }

      if (!response.ok || !payload.ok) {
        setError(payload?.message || 'Identifiants invalides ou compte inactif.');
        setIsSubmitting(false);
        return;
      }

      setCurrentUserId(payload.id);
      router.replace('/');
    } catch (err) {
      console.error('Login failed', err);
      setError('Erreur de connexion. Veuillez réessayer.');
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="login-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'linear-gradient(135deg, #f4f7fb 0%, #edf3fb 28%, #fef7e7 100%)',
      }}
    >
      <div
        className="login-shell"
        style={{
          width: '100%',
          maxWidth: '1150px',
          display: 'grid',
          gridTemplateColumns: '1.18fr 0.88fr',
          borderRadius: '28px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
        }}
      >
        <div
          className="login-brand-panel"
          style={{
            position: 'relative',
            padding: '56px 42px',
            background: 'linear-gradient(135deg, #0b1d31 0%, #102f52 18%, #1a3d72 52%, #b91c1c 100%)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(120deg, rgba(248,250,252,0.08), transparent 30%, rgba(255,255,255,0.02) 50%, rgba(254,215,170,0.14))',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
              <div style={{ transform: 'scale(1.15)' }}>
                <RdcLogo size="xl" showSubtext variant="full" />
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-block',
                  marginBottom: '18px',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fef3c7',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                Gouvernement
              </div>

              <h1 style={{ margin: 0, fontSize: '36px', lineHeight: 1.1, letterSpacing: '-0.06em', fontWeight: 800 }}>
                Portail Kna+ SGA
              </h1>

              <p
                style={{
                  margin: '16px auto 0',
                  maxWidth: '420px',
                  fontSize: '15px',
                  lineHeight: 1.75,
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                Système officiel de gestion administrative, de suivi documentaire et d’accès sécurisé aux
                services institutionnels.
              </p>
            </div>

            <div
              className="login-stats"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '16px',
                marginTop: '28px',
              }}
            >
              <div
                style={{
                  padding: '18px 18px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
              >
                <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
                  Sécurité
                </div>
                <div style={{ marginTop: '8px', fontSize: '24px', fontWeight: 800 }}>100%</div>
              </div>

              <div
                style={{
                  padding: '18px 18px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
              >
                <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
                  Services
                </div>
                <div style={{ marginTop: '8px', fontSize: '24px', fontWeight: 800 }}>Officiels</div>
              </div>
            </div>

            <div
              style={{
                marginTop: '28px',
                paddingTop: '18px',
                borderTop: '1px solid rgba(255,255,255,0.18)',
                textAlign: 'center',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: '0.04em',
              }}
            >
              Secrétariat Général à la Décentralisation
            </div>
          </div>
        </div>

        <div
          className="login-form-panel"
          style={{
            padding: '54px 34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '370px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ marginBottom: '2px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 900,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#b91c1c',
                }}
              >
                Connexion
              </div>
              <h2 style={{ margin: '10px 0 0', fontSize: '34px', color: '#0f172a', letterSpacing: '-0.05em', fontWeight: 800 }}>
                Bienvenue
              </h2>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid #dbe5f2',
                borderRadius: '14px',
                padding: '0 14px',
                background: '#f8fafc',
                boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <Mail size={17} color="#64748b" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Adresse email"
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  height: '50px',
                  outline: 'none',
                  fontSize: '15px',
                  color: '#0f172a',
                }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid #dbe5f2',
                borderRadius: '14px',
                padding: '0 14px',
                background: '#f8fafc',
                boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <Lock size={17} color="#64748b" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  height: '50px',
                  outline: 'none',
                  fontSize: '15px',
                  color: '#0f172a',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </label>

            {error ? (
              <div
                style={{
                  color: '#b91c1c',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                height: '52px',
                border: 'none',
                borderRadius: '14px',
                background: 'linear-gradient(90deg, #b91c1c 0%, #dc2626 18%, #1d4ed8 100%)',
                color: 'white',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 16px 32px rgba(185, 28, 28, 0.24)',
              }}
            >
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>

            <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', lineHeight: 1.7 }}>
              Connectez-vous avec vos identifiants professionnels.<br />
              Si votre compte n’existe pas encore, contactez l’administrateur du portail.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
