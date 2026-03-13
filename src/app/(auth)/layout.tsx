export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      background: '#0a0a0f',
      position: 'relative',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Atmospheric glows */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(124,58,237,0.2), transparent 70%), radial-gradient(ellipse 40% 30% at 50% 80%, rgba(168,85,247,0.06), transparent)',
        pointerEvents: 'none',
      }} />
      {/* Noise texture overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        pointerEvents: 'none',
      }} />
      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Brand lockup */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <svg width="20" height="20" viewBox="0 0 64 64" style={{ marginBottom: 4 }}>
            <defs>
              <linearGradient id="authSpark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc"/>
                <stop offset="100%" stopColor="#7c3aed"/>
              </linearGradient>
            </defs>
            <path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="url(#authSpark)"/>
          </svg>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 4px',
          }}>Orianna</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Your AI content coach</p>
        </div>
        {children}
      </div>
    </div>
  )
}
