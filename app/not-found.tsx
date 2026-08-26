export default function NotFoundPage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '3rem', margin: 0 }}>404</h1>
      <p style={{ fontSize: '1.25rem', margin: '1rem 0 0' }}>
        Page non trouvée.
      </p>
      <p style={{ color: '#64748b', marginTop: '1rem' }}>
        Vérifiez l’URL ou retournez à l’accueil.
      </p>
    </main>
  );
}
