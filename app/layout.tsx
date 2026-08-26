import type { Metadata } from 'next';
import './globals.css';
import AuthGate from './auth-gate';

export const metadata: Metadata = {
  title: 'Kna+ SGA',
  description: 'Portail RH et gestion des agents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning>
        <AuthGate>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">
              {children}
            </main>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
