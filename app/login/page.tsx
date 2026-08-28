'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { setCurrentUserId } from '@/lib/accessControl';
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
          'linear-gradient(135deg, #eaf6ff 0%, #f8fbff 52%, #fff8e1 100%)',
      }}
    >
      <div
        className="login-shell"
        style={{
          width: '100%',
          maxWidth: '470px',
          borderRadius: '18px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 24px 60px rgba(0, 45, 94, 0.18)',
          border: '1px solid rgba(0, 127, 255, 0.2)',
        }}
      >
        <div
          className="login-form-panel"
          style={{
            padding: '48px 34px 42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            borderTop: '5px solid #f7d618',
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
                  color: '#ce1021',
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
                border: '1px solid #cbdbea',
                borderRadius: '8px',
                padding: '0 14px',
                background: '#f7fbff',
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
                border: '1px solid #cbdbea',
                borderRadius: '8px',
                padding: '0 14px',
                background: '#f7fbff',
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
                background: '#ce1021',
                color: 'white',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 10px 24px rgba(206, 16, 33, 0.24)',
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
