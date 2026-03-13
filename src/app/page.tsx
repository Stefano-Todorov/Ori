'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const features = [
  { icon: '✍️', title: 'AI Script Generator', description: 'Generate full video scripts with hook, body sections, and CTA. Pick multiple hook styles and get instant variants tailored to your niche.' },
  { icon: '📋', title: 'Content Planner', description: 'Save video ideas with hooks, captions, and inspiration. Track what\'s in progress, ready to film, or done — all in a visual board.' },
  { icon: '📅', title: 'Post Scheduler', description: 'Upload your videos and schedule them to post automatically to TikTok, Instagram Reels, and YouTube Shorts at the exact time you choose.' },
  { icon: '🤖', title: 'AI Coach Chat', description: 'Chat with an AI coach that knows your niche, goals, past scripts, and content ideas. Get personalized advice, not generic tips.' },
  { icon: '🔖', title: 'Swipe File', description: 'Save inspiring posts from any platform by URL. Build a personal library of content references to draw from when planning.' },
  { icon: '🔍', title: 'Competitor Tracking', description: 'Track competitor accounts and import their top-performing posts to analyze hooks, formats, and engagement patterns.' },
]

const avatars = [
  { initials: 'JM', color: '#7c3aed' },
  { initials: 'SK', color: '#a855f7' },
  { initials: 'RL', color: '#6d28d9' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const featuresRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      { threshold: 0.1 }
    )

    const cards = featuresRef.current?.querySelectorAll('.feature-card')
    cards?.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        html { scroll-behavior: smooth; }

        .landing-page {
          font-family: 'Inter', sans-serif;
          background: #0a0a0f;
          color: #ffffff;
          min-height: 100vh;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .hero-badge { animation: fadeUp 0.6s ease forwards; }
        .hero-badge .pulse-icon { animation: pulse 2s ease-in-out infinite; }
        .hero-headline { animation: fadeUp 0.6s ease 0.1s forwards; opacity: 0; }
        .hero-sub { animation: fadeUp 0.6s ease 0.2s forwards; opacity: 0; }
        .hero-ctas { animation: fadeUp 0.6s ease 0.3s forwards; opacity: 0; }
        .hero-proof { animation: fadeUp 0.6s ease 0.4s forwards; opacity: 0; }

        .feature-card {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.5s ease, transform 0.5s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .feature-card.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        .feature-card:nth-child(1).animate-in { transition-delay: 0s; }
        .feature-card:nth-child(2).animate-in { transition-delay: 0.1s; }
        .feature-card:nth-child(3).animate-in { transition-delay: 0.2s; }
        .feature-card:nth-child(4).animate-in { transition-delay: 0.3s; }
        .feature-card:nth-child(5).animate-in { transition-delay: 0.4s; }
        .feature-card:nth-child(6).animate-in { transition-delay: 0.5s; }

        .feature-card:hover {
          border-color: rgba(124,58,237,0.3) !important;
          box-shadow: 0 0 20px rgba(124,58,237,0.08);
        }

        .feature-card .arrow {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .feature-card:hover .arrow {
          opacity: 1;
        }

        .gradient-text {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .btn-primary {
          background: linear-gradient(135deg, #7c3aed, #9333ea);
          color: white;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 24px rgba(124,58,237,0.25);
        }
        .btn-primary:hover {
          box-shadow: 0 0 32px rgba(124,58,237,0.4);
          transform: translateY(-1px);
          filter: brightness(1.1);
        }

        .btn-ghost {
          background: rgba(255,255,255,0.06);
          color: white;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-ghost:hover {
          border-color: rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.1);
        }

        .nav-login:hover { color: white !important; }
        .nav-get-started:hover { filter: brightness(1.15); transform: translateY(-1px); }
      `}</style>

      <div className="landing-page">
        {/* Nav */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backdropFilter: scrolled ? 'blur(16px)' : 'none',
            background: scrolled ? 'rgba(10,10,15,0.85)' : 'transparent',
            borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 64 64" style={{ marginRight: 8 }}>
                <defs>
                  <linearGradient id="navSpark" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc"/>
                    <stop offset="100%" stopColor="#7c3aed"/>
                  </linearGradient>
                </defs>
                <path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="url(#navSpark)"/>
              </svg>
              <span style={{ fontSize: 22, fontWeight: 700 }} className="gradient-text">Orianna</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href="/login" className="nav-login" style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>
                Log in
              </Link>
              <Link href="/signup">
                <span className="nav-get-started" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: 'white', fontWeight: 600, fontSize: 14, padding: '8px 20px', borderRadius: 999, display: 'inline-block', transition: 'all 0.2s', cursor: 'pointer' }}>
                  Get started
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Hero glow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(124,58,237,0.35), transparent 70%), radial-gradient(ellipse 40% 30% at 50% 40%, rgba(168,85,247,0.1), transparent)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px 40px', textAlign: 'center', position: 'relative' }}>
            {/* Badge */}
            <div className="hero-badge" style={{ marginBottom: 24 }}>
              <span style={{
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.5)',
                color: '#a855f7',
                borderRadius: 999,
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 500,
                display: 'inline-block',
                boxShadow: '0 0 20px rgba(124,58,237,0.15)',
              }}>
                <span className="pulse-icon">✨</span> AI-powered content coach
              </span>
            </div>

            {/* Headline */}
            <h1 className="hero-headline" style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
              Your <span className="gradient-text">AI coach</span> for<br />short-form video
            </h1>

            {/* Subtext */}
            <p className="hero-sub" style={{ fontSize: 18, color: '#9ca3af', maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.6 }}>
              Orianna helps TikTok, Instagram Reels, and YouTube Shorts creators plan content, generate scripts, and schedule posts — all in one place.
            </p>

            {/* CTAs */}
            <div className="hero-ctas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
              <Link href="/signup">
                <span className="btn-primary" style={{ padding: '14px 32px', fontSize: 16, display: 'inline-block' }}>
                  Start for free
                </span>
              </Link>
              <Link href="/login">
                <span className="btn-ghost" style={{ padding: '14px 32px', fontSize: 16, display: 'inline-block' }}>
                  Log in
                </span>
              </Link>
            </div>

            {/* Social proof */}
            <div className="hero-proof" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ display: 'flex' }}>
                {avatars.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: a.color,
                      border: '2px solid #0a0a0f',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'white',
                      marginLeft: i > 0 ? -8 : 0,
                    }}
                  >
                    {a.initials}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>Join 500+ creators growing with Orianna</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#a855f7', letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>
              EVERYTHING YOU NEED
            </span>
            <h2 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
              Everything a creator needs
            </h2>
            <p style={{ fontSize: 16, color: '#9ca3af', maxWidth: 480, margin: '0 auto' }}>
              Powerful tools to plan, create, and grow your short-form content.
            </p>
          </div>

          <div
            ref={featuresRef}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}
          >
            {features.map((f) => (
              <div
                key={f.title}
                className="feature-card"
                style={{
                  background: '#12121a',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: 24,
                  cursor: 'default',
                }}
              >
                <div style={{
                  background: 'rgba(124,58,237,0.1)',
                  borderRadius: 10,
                  padding: 10,
                  width: 'fit-content',
                  fontSize: 24,
                  lineHeight: 1,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '16px 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>{f.description}</p>
                <span className="arrow" style={{ fontSize: 14, color: '#a855f7', marginTop: 12, display: 'inline-block' }}>→</span>
              </div>
            ))}
          </div>
        </section>

        {/* Platforms */}
        <section style={{
          background: '#0d0d14',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '60px 0',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Publish directly to your platforms</h2>
            <p style={{ fontSize: 16, color: '#9ca3af', marginBottom: 32 }}>Connect your accounts and schedule posts without leaving the app</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 999,
                padding: '10px 24px',
                fontSize: 15,
                fontWeight: 600,
              }}>
                🎵 TikTok
              </span>
              <span style={{
                background: 'rgba(225,48,108,0.15)',
                border: '1px solid rgba(225,48,108,0.3)',
                borderRadius: 999,
                padding: '10px 24px',
                fontSize: 15,
                fontWeight: 600,
                color: '#f472b6',
              }}>
                📸 Instagram Reels
              </span>
              <span style={{
                background: 'rgba(255,0,0,0.1)',
                border: '1px solid rgba(255,0,0,0.2)',
                borderRadius: 999,
                padding: '10px 24px',
                fontSize: 15,
                fontWeight: 600,
                color: '#f87171',
              }}>
                ▶️ YouTube Shorts
              </span>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Divider */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #7c3aed, transparent)' }} />

          {/* Glow */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(124,58,237,0.2), transparent)',
            pointerEvents: 'none',
          }} />

          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px', textAlign: 'center', position: 'relative' }}>
            <h2 style={{ fontSize: 40, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.01em' }}>Ready to grow your channel?</h2>
            <p style={{ fontSize: 16, color: '#9ca3af', marginBottom: 32 }}>Join creators using Orianna to stay consistent and grow faster.</p>
            <Link href="/signup">
              <span className="btn-primary" style={{ padding: '16px 40px', fontSize: 17, display: 'inline-block', boxShadow: '0 0 32px rgba(124,58,237,0.35)' }}>
                Get started free
              </span>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, fontSize: 14, color: '#9ca3af' }}>
            <span>© 2026 Orianna</span>
            <div style={{ display: 'flex', gap: 24 }}>
              <Link href="/legal/privacy" style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.2s' }}>Privacy Policy</Link>
              <Link href="/legal/terms" style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.2s' }}>Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
