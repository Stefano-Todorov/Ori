import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'See what\'s new in Orianna — the latest features, improvements, and fixes.',
}

type ChangelogEntry = {
  date: string
  version: string
  title: string
  changes: { type: 'added' | 'improved' | 'fixed'; text: string }[]
}

const changelog: ChangelogEntry[] = [
  {
    date: '2026-04-08',
    version: '1.5.0',
    title: 'Marketing & Analytics Foundation',
    changes: [
      { type: 'added', text: 'UTM tracking — we now track which channels bring you to Orianna' },
      { type: 'added', text: 'Changelog page — stay up to date with what we ship' },
      { type: 'added', text: 'Welcome email sequence for new users' },
    ],
  },
  {
    date: '2026-04-01',
    version: '1.4.0',
    title: 'Chrome Extension v1.0.7',
    changes: [
      { type: 'improved', text: 'Extension store listing with better descriptions' },
      { type: 'fixed', text: 'Extension compatibility improvements' },
    ],
  },
  {
    date: '2026-03-25',
    version: '1.3.0',
    title: 'Production Tracker & Schedule',
    changes: [
      { type: 'added', text: 'Content calendar with weekly and monthly views' },
      { type: 'added', text: 'Production pipeline tracker — track ideas from concept to published' },
      { type: 'added', text: 'Recording days manager' },
    ],
  },
  {
    date: '2026-03-18',
    version: '1.2.0',
    title: 'Stripe Billing & Testing',
    changes: [
      { type: 'added', text: 'Stripe billing with 4 tiers: Starter (free), Plus, Pro, Max' },
      { type: 'added', text: 'Usage tracking for AI features' },
      { type: 'added', text: 'Playwright e2e test suite (36 tests)' },
      { type: 'added', text: 'Sentry error monitoring' },
      { type: 'added', text: 'Chrome extension for saving inspiration from TikTok & Instagram' },
    ],
  },
  {
    date: '2026-03-11',
    version: '1.1.0',
    title: 'Scripts, Ideas & Swipe File',
    changes: [
      { type: 'added', text: 'Script generator with multiple hook & CTA styles' },
      { type: 'added', text: 'Ideas board with drag & drop' },
      { type: 'added', text: 'Swipe file for saving trending content' },
      { type: 'added', text: 'Dark/light/system theme support' },
      { type: 'improved', text: 'AI coach now includes your scripts and ideas in context' },
    ],
  },
  {
    date: '2026-03-01',
    version: '1.0.0',
    title: 'Initial Launch',
    changes: [
      { type: 'added', text: 'AI content coach with personalized advice' },
      { type: 'added', text: 'Post analytics and import' },
      { type: 'added', text: 'Competitor tracking' },
      { type: 'added', text: 'User onboarding wizard' },
    ],
  },
]

const typeBadge = {
  added: { label: 'New', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
  improved: { label: 'Improved', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', color: '#c084fc' },
  fixed: { label: 'Fixed', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24' },
}

export default function ChangelogPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .changelog-page {
          font-family: 'Inter', sans-serif;
          background: #0a0a0f;
          color: #ffffff;
          min-height: 100vh;
        }
        .changelog-entry {
          transition: border-color 0.2s ease;
        }
        .changelog-entry:hover {
          border-color: rgba(124,58,237,0.25) !important;
        }
      `}</style>
      <div className="changelog-page">
        {/* Nav */}
        <header style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: 8 }}>
              <svg width="24" height="24" viewBox="0 0 64 64">
                <defs>
                  <linearGradient id="cSpark" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc"/>
                    <stop offset="100%" stopColor="#7c3aed"/>
                  </linearGradient>
                </defs>
                <path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="url(#cSpark)"/>
              </svg>
              <span style={{ fontSize: 20, fontWeight: 700, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Orianna</span>
            </Link>
            <Link href="/signup" style={{
              background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
              color: 'white',
              fontWeight: 600,
              fontSize: 14,
              padding: '8px 20px',
              borderRadius: 999,
              textDecoration: 'none',
            }}>
              Get started
            </Link>
          </div>
        </header>

        {/* Header */}
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px 60px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#a855f7', letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>
            CHANGELOG
          </span>
          <h1 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            What&apos;s new in Orianna
          </h1>
          <p style={{ fontSize: 17, color: '#9ca3af', margin: 0, lineHeight: 1.6 }}>
            New features, improvements, and fixes. We ship fast so you can create faster.
          </p>
        </div>

        {/* Entries */}
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 100px' }}>
          {changelog.map((entry, i) => (
            <div
              key={entry.version}
              className="changelog-entry"
              style={{
                background: '#12121a',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: 32,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#a855f7',
                  background: 'rgba(124,58,237,0.12)',
                  border: '1px solid rgba(124,58,237,0.25)',
                  padding: '4px 10px',
                  borderRadius: 6,
                }}>
                  v{entry.version}
                </span>
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  {new Date(entry.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px' }}>{entry.title}</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entry.changes.map((change, j) => {
                  const badge = typeBadge[change.type]
                  return (
                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: badge.color,
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        padding: '2px 8px',
                        borderRadius: 4,
                        flexShrink: 0,
                        marginTop: 2,
                      }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.5 }}>{change.text}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
