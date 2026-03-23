'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const features = [
  {
    icon: '🤖',
    title: 'AI Coach That Knows You',
    description: 'Not a generic chatbot. Orianna reads your niche, past scripts, top posts, and competitors — then gives you strategy advice that actually fits your channel.',
    details: ['Personalized to your niche & style', 'Remembers your scripts & ideas', 'Actionable next steps, not fluff'],
  },
  {
    icon: '✍️',
    title: 'Script Generator',
    description: 'Go from idea to ready-to-film script in seconds. Hooks, body, CTAs, hashtags — with multiple variants so you can pick your favorite.',
    details: ['Multiple hook & CTA styles', 'Difficulty levels (easy → advanced)', 'Save as idea or film directly'],
  },
  {
    icon: '💡',
    title: 'Ideas Board',
    description: 'A visual kanban for every video idea. Track concepts from "just an idea" through recording, editing, and posting.',
    details: ['Drag & drop organization', 'Rich idea cards with hooks & CTAs', 'Never lose an idea again'],
  },
  {
    icon: '🔍',
    title: 'Competitor Research',
    description: 'Track any creator. Import their top posts, see engagement metrics, and generate ideas adapted to your style — not theirs.',
    details: ['Import posts from any creator', 'Sort by views, likes, comments', 'Turn competitor hits into your ideas'],
  },
  {
    icon: '🔥',
    title: 'Saved Inspo Videos',
    description: 'Save trending videos while you scroll with our Chrome extension. Build a personal library of inspiration you can turn into content.',
    details: ['One-click save from TikTok & IG', 'Full metrics captured automatically', 'Generate ideas from any saved post'],
  },
  {
    icon: '📅',
    title: 'Content Calendar',
    description: 'Plan recording days, assign ideas to dates, and see your entire pipeline from idea to published — on one screen.',
    details: ['Weekly & monthly views', 'Drag ideas onto dates', 'Track your posting consistency'],
  },
]

const steps = [
  {
    num: '01',
    title: 'Set up your profile',
    description: 'Tell Orianna your niche, platforms, and goals. Takes 30 seconds. This is how the AI personalizes everything for you.',
  },
  {
    num: '02',
    title: 'Research & collect inspiration',
    description: 'Track competitors, save trending videos with the Chrome extension, and let Orianna analyze what\'s working in your space.',
  },
  {
    num: '03',
    title: 'Generate & plan content',
    description: 'Turn inspiration into original scripts and ideas. Organize on your board, schedule on your calendar, and stay consistent.',
  },
]

const faqs = [
  {
    q: 'Is Orianna really free?',
    a: 'Yes — the Starter plan is free forever and includes 3 AI coach messages, 1 script, and 1 idea generation per month so you can try everything. Need more? Plans start at $5.99/month (or $4.17/month billed yearly).',
  },
  {
    q: 'What platforms does it support?',
    a: 'Orianna helps you create content for TikTok, Instagram Reels, and YouTube Shorts. The Chrome extension works on TikTok and Instagram for saving inspiration.',
  },
  {
    q: 'How is the AI coach different from ChatGPT?',
    a: 'ChatGPT is generic. Orianna knows your niche, your past scripts, your saved inspiration, and your competitors. Every suggestion is personalized to your channel — not copy-paste advice.',
  },
  {
    q: 'Do I need the Chrome extension?',
    a: 'No — the dashboard works on its own. But the extension makes it effortless to save trending videos and competitor posts while you browse TikTok and Instagram.',
  },
  {
    q: 'Can I use it on mobile?',
    a: 'The web dashboard is fully responsive and works on any device. The Chrome extension is desktop-only (as all Chrome extensions are).',
  },
]

const testimonials = [
  {
    name: 'Jessica M.',
    handle: '@jessicamakes',
    platform: 'TikTok',
    text: 'I used to spend hours staring at a blank screen trying to come up with video ideas. Now I open Orianna, and I have a week of content planned in 10 minutes.',
    avatar: 'JM',
    color: '#7c3aed',
  },
  {
    name: 'Ryan L.',
    handle: '@ryanlifts',
    platform: 'Instagram',
    text: 'The competitor research feature is insane. I can see exactly what hooks are working in my niche and adapt them to my style. My views doubled in a month.',
    avatar: 'RL',
    color: '#6d28d9',
  },
  {
    name: 'Sarah K.',
    handle: '@sarahcooks',
    platform: 'YouTube Shorts',
    text: 'The AI coach actually understands my niche. It doesn\'t give me generic advice — it references my past content and tells me exactly what to try next.',
    avatar: 'SK',
    color: '#a855f7',
  },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [yearly, setYearly] = useState(false)
  const animateRefs = useRef<(HTMLDivElement | null)[]>([])

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

    animateRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const addRef = (el: HTMLDivElement | null) => {
    if (el && !animateRefs.current.includes(el)) {
      animateRefs.current.push(el)
    }
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
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
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .hero-badge { animation: fadeUp 0.6s ease forwards; }
        .hero-badge .pulse-icon { animation: pulse 2s ease-in-out infinite; }
        .hero-headline { animation: fadeUp 0.6s ease 0.1s forwards; opacity: 0; }
        .hero-sub { animation: fadeUp 0.6s ease 0.2s forwards; opacity: 0; }
        .hero-ctas { animation: fadeUp 0.6s ease 0.3s forwards; opacity: 0; }
        .hero-proof { animation: fadeUp 0.6s ease 0.4s forwards; opacity: 0; }
        .hero-mockup { animation: fadeUp 0.8s ease 0.5s forwards; opacity: 0; }

        .anim-target {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .anim-target.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        .feature-card {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .feature-card:hover {
          border-color: rgba(124,58,237,0.3) !important;
          box-shadow: 0 0 24px rgba(124,58,237,0.1);
        }

        .gradient-text {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-warm {
          background: linear-gradient(135deg, #a855f7, #ec4899);
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
          text-decoration: none;
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
          text-decoration: none;
        }
        .btn-ghost:hover {
          border-color: rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.1);
        }

        .nav-login:hover { color: white !important; }
        .nav-get-started:hover { filter: brightness(1.15); transform: translateY(-1px); }

        .faq-item {
          transition: all 0.2s ease;
        }
        .faq-item:hover {
          border-color: rgba(124,58,237,0.25) !important;
        }
        .faq-answer {
          overflow: hidden;
          transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
        }

        .testimonial-card {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .testimonial-card:hover {
          border-color: rgba(124,58,237,0.25) !important;
          box-shadow: 0 0 20px rgba(124,58,237,0.08);
        }

        .step-card {
          transition: border-color 0.2s ease;
        }
        .step-card:hover {
          border-color: rgba(124,58,237,0.3) !important;
        }

        .chrome-btn {
          background: white;
          color: #0a0a0f;
          font-weight: 700;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .chrome-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(255,255,255,0.15);
        }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-toggle { display: block !important; }
          .nav-mobile-menu { display: flex !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .chrome-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
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
            <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', cursor: 'pointer' }}>
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
            </a>
            {/* Desktop nav */}
            <nav className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <a href="#features" style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">Features</a>
              <a href="#how-it-works" style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">How it works</a>
              <a href="#pricing" style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">Pricing</a>
              <a href="#faq" style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">FAQ</a>
              <Link href="/login" className="nav-login" style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>
                Log in
              </Link>
              <Link href="/signup">
                <span className="nav-get-started" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: 'white', fontWeight: 600, fontSize: 14, padding: '8px 20px', borderRadius: 999, display: 'inline-block', transition: 'all 0.2s', cursor: 'pointer' }}>
                  Get started
                </span>
              </Link>
            </nav>
            {/* Mobile hamburger */}
            <button
              className="nav-mobile-toggle"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Toggle menu"
              style={{ display: 'none', background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', padding: 4 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileMenu ? (
                  <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                ) : (
                  <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                )}
              </svg>
            </button>
          </div>
          {/* Mobile menu dropdown */}
          {mobileMenu && (
            <div className="nav-mobile-menu" style={{ display: 'none', flexDirection: 'column', gap: 4, padding: '8px 24px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(16px)' }}>
              <a href="#features" onClick={() => setMobileMenu(false)} style={{ color: '#9ca3af', fontSize: 15, fontWeight: 500, textDecoration: 'none', padding: '10px 0' }}>Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenu(false)} style={{ color: '#9ca3af', fontSize: 15, fontWeight: 500, textDecoration: 'none', padding: '10px 0' }}>How it works</a>
              <a href="#pricing" onClick={() => setMobileMenu(false)} style={{ color: '#9ca3af', fontSize: 15, fontWeight: 500, textDecoration: 'none', padding: '10px 0' }}>Pricing</a>
              <a href="#faq" onClick={() => setMobileMenu(false)} style={{ color: '#9ca3af', fontSize: 15, fontWeight: 500, textDecoration: 'none', padding: '10px 0' }}>FAQ</a>
              <Link href="/login" onClick={() => setMobileMenu(false)} style={{ color: '#9ca3af', fontSize: 15, fontWeight: 500, textDecoration: 'none', padding: '10px 0' }}>Log in</Link>
              <Link href="/signup" onClick={() => setMobileMenu(false)} style={{ display: 'inline-block', marginTop: 4 }}>
                <span style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: 'white', fontWeight: 600, fontSize: 14, padding: '10px 24px', borderRadius: 999, display: 'inline-block' }}>Get started</span>
              </Link>
            </div>
          )}
        </header>

        {/* Hero */}
        <section style={{ position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(124,58,237,0.35), transparent 70%), radial-gradient(ellipse 40% 30% at 50% 40%, rgba(168,85,247,0.1), transparent)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px 40px', textAlign: 'center', position: 'relative' }}>
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

            <h1 className="hero-headline" style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', fontWeight: 900, lineHeight: 1.05, margin: '0 0 24px', letterSpacing: '-0.03em' }}>
              Stop guessing.<br />
              <span className="gradient-text">Start creating.</span>
            </h1>

            <p className="hero-sub" style={{ fontSize: 19, color: '#9ca3af', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.6 }}>
              Orianna is the AI content coach that researches your niche, generates scripts, and plans your calendar — so you can focus on filming.
            </p>

            <div className="hero-ctas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
              <Link href="/signup">
                <span className="btn-primary" style={{ padding: '16px 36px', fontSize: 17, display: 'inline-block' }}>
                  Start for free
                </span>
              </Link>
              <a href="#how-it-works">
                <span className="btn-ghost" style={{ padding: '16px 36px', fontSize: 17, display: 'inline-block' }}>
                  See how it works
                </span>
              </a>
            </div>

            <p className="hero-proof" style={{ fontSize: 14, color: '#6b7280', marginBottom: 60 }}>
              Free plan with AI included &middot; No credit card required &middot; Set up in 30 seconds
            </p>

            {/* Dashboard mockup */}
            <div className="hero-mockup" style={{
              maxWidth: 900,
              margin: '0 auto',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.1)',
              background: '#12121a',
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(124,58,237,0.15), 0 0 0 1px rgba(255,255,255,0.05)',
            }}>
              {/* Window chrome */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: 12, color: '#6b7280', background: 'rgba(255,255,255,0.06)', padding: '4px 16px', borderRadius: 6 }}>orianna.app</span>
                </div>
              </div>
              {/* Mock dashboard content */}
              <div style={{ padding: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* AI Coach card */}
                <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 13, color: '#a855f7', fontWeight: 600, marginBottom: 12 }}>AI Coach</div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>What hooks are working in fitness right now?</span>
                  </div>
                  <div style={{ background: 'rgba(124,58,237,0.1)', borderRadius: 8, padding: 12 }}>
                    <span style={{ fontSize: 13, color: '#d4b5ff' }}>Based on your competitors, POV hooks are getting 3x more saves. Try: &quot;POV: you finally found a workout that...&quot;</span>
                  </div>
                </div>
                {/* Script card */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 13, color: '#a855f7', fontWeight: 600, marginBottom: 12 }}>Script Generator</div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Hook</span>
                    <p style={{ fontSize: 13, color: '#e5e7eb', margin: '4px 0 0' }}>&quot;Nobody talks about this mistake...&quot;</p>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Body</span>
                    <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>3 key points that build tension...</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>CTA</span>
                    <p style={{ fontSize: 13, color: '#e5e7eb', margin: '4px 0 0' }}>&quot;Follow for part 2&quot;</p>
                  </div>
                </div>
                {/* Ideas board */}
                <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 13, color: '#a855f7', fontWeight: 600, marginBottom: 12 }}>Ideas Board</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {['Morning routine hack', 'Meal prep for beginners', 'Top 5 mistakes'].map((idea, i) => (
                      <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 14px' }}>
                        <span style={{ fontSize: 12, color: '#d1d5db' }}>{idea}</span>
                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                          <span style={{ fontSize: 10, color: '#6b7280', background: 'rgba(124,58,237,0.15)', padding: '2px 8px', borderRadius: 4 }}>
                            {['Easy', 'Medium', 'Hard'][i]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Logos / trust */}
        <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '40px 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, marginBottom: 24 }}>
              Built for creators on every platform
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 10, color: '#d1d5db', fontWeight: 600 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.24 8.24 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z" fill="#ffffff"/>
                </svg>
                TikTok
              </span>
              <span style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 10, color: '#d1d5db', fontWeight: 600 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" fill="url(#igGrad)"/>
                  <defs>
                    <linearGradient id="igGrad" x1="0" y1="24" x2="24" y2="0">
                      <stop offset="0%" stopColor="#FD5"/>
                      <stop offset="50%" stopColor="#E1306C"/>
                      <stop offset="100%" stopColor="#833AB4"/>
                    </linearGradient>
                  </defs>
                </svg>
                Instagram
              </span>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px' }}>
          <div ref={addRef} className="anim-target" style={{ textAlign: 'center', marginBottom: 60 }}>
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#a855f7', letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>
              HOW IT WORKS
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              From zero to content machine in <span className="gradient-text">3 steps</span>
            </h2>
            <p style={{ fontSize: 16, color: '#9ca3af', maxWidth: 500, margin: '0 auto' }}>
              No learning curve. No complicated setup. Just sign up and start creating.
            </p>
          </div>

          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {steps.map((step, i) => (
              <div
                key={i}
                ref={addRef}
                className="anim-target step-card"
                style={{
                  background: '#12121a',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: 32,
                  position: 'relative',
                  transitionDelay: `${i * 0.1}s`,
                }}
              >
                <span style={{
                  fontSize: 48,
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(124,58,237,0.05))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: 1,
                  display: 'block',
                  marginBottom: 16,
                }}>
                  {step.num}
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: 0 }}>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" style={{
          background: '#0d0d14',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px' }}>
            <div ref={addRef} className="anim-target" style={{ textAlign: 'center', marginBottom: 60 }}>
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#a855f7', letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>
                FEATURES
              </span>
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                Everything a creator needs
              </h2>
              <p style={{ fontSize: 16, color: '#9ca3af', maxWidth: 500, margin: '0 auto' }}>
                From research to recording to publishing — one platform for your entire content workflow.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {features.map((f, i) => (
                <div
                  key={f.title}
                  ref={addRef}
                  className="anim-target feature-card"
                  style={{
                    background: '#12121a',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16,
                    padding: 28,
                    cursor: 'default',
                    transitionDelay: `${(i % 3) * 0.1}s`,
                  }}
                >
                  <div style={{
                    background: 'rgba(124,58,237,0.1)',
                    borderRadius: 12,
                    padding: 12,
                    width: 'fit-content',
                    fontSize: 28,
                    lineHeight: 1,
                    marginBottom: 16,
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: '0 0 16px' }}>{f.description}</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {f.details.map((d, j) => (
                      <li key={j} style={{ fontSize: 13, color: '#6b7280', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#7c3aed', fontSize: 14 }}>&#10003;</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Chrome Extension */}
        <section style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 50% 50% at 30% 50%, rgba(124,58,237,0.12), transparent)',
            pointerEvents: 'none',
          }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px', position: 'relative' }}>
            <div ref={addRef} className="anim-target chrome-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#a855f7', letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>
                  CHROME EXTENSION
                </span>
                <h2 style={{ fontSize: 'clamp(28px, 3vw, 38px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
                  Save inspiration while you scroll
                </h2>
                <p style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1.7, margin: '0 0 24px' }}>
                  See a viral video on TikTok or Instagram? One click saves it to your saved inspo videos with full metrics — views, likes, comments, engagement rate. Then turn it into your own content idea from the dashboard.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                  {['Save any video with one click', 'Full metrics captured automatically', 'Turn saved posts into original ideas', 'Track competitors effortlessly'].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#a855f7', fontSize: 12 }}>&#10003;</span>
                      </div>
                      <span style={{ fontSize: 14, color: '#d1d5db' }}>{item}</span>
                    </div>
                  ))}
                </div>
                <span className="chrome-btn" style={{ padding: '14px 28px', fontSize: 15 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#4285f4" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="4" fill="#4285f4"/>
                  </svg>
                  Add to Chrome — it&apos;s free
                </span>
              </div>
              <div style={{
                background: '#12121a',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 24,
                position: 'relative',
              }}>
                {/* Extension popup mockup */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <svg width="18" height="18" viewBox="0 0 64 64">
                      <path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="#a855f7"/>
                    </svg>
                    <span style={{ fontSize: 14, fontWeight: 700 }} className="gradient-text">Orianna</span>
                  </div>
                  <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#a855f7', fontWeight: 600, marginBottom: 6 }}>Detected TikTok Video</div>
                    <div style={{ fontSize: 13, color: '#d1d5db', marginBottom: 8 }}>@fitnesscreator &middot; &quot;5 mistakes killing your gains&quot;</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
                      <span>👁 2.4M views</span>
                      <span>❤️ 340K likes</span>
                      <span>💬 8.2K</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, background: 'linear-gradient(135deg, #7c3aed, #9333ea)', borderRadius: 8, padding: '10px 0', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
                      Save Inspo Video
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 0', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#d1d5db' }}>
                      Create Idea
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section style={{
          background: '#0d0d14',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px' }}>
            <div ref={addRef} className="anim-target" style={{ textAlign: 'center', marginBottom: 60 }}>
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#a855f7', letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>
                TESTIMONIALS
              </span>
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                Creators love Orianna
              </h2>
              <p style={{ fontSize: 16, color: '#9ca3af' }}>
                Here&apos;s what creators are saying after using Orianna.
              </p>
            </div>

            <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  ref={addRef}
                  className="anim-target testimonial-card"
                  style={{
                    background: '#12121a',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16,
                    padding: 28,
                    transitionDelay: `${i * 0.1}s`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: t.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                    }}>
                      {t.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{t.handle} &middot; {t.platform}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.7, margin: 0 }}>
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px' }}>
          <div ref={addRef} className="anim-target" style={{ textAlign: 'center', marginBottom: 60 }}>
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#a855f7', letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>
              PRICING
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Simple, transparent <span className="gradient-text">pricing</span>
            </h2>
            <p style={{ fontSize: 16, color: '#9ca3af', maxWidth: 500, margin: '0 auto 28px' }}>
              Start free with AI included. Upgrade when you need more.
            </p>

            {/* Monthly / Yearly toggle */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: 4 }}>
              <button
                onClick={() => setYearly(false)}
                style={{
                  background: !yearly ? 'rgba(124,58,237,0.2)' : 'transparent',
                  border: !yearly ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
                  color: !yearly ? '#e9d5ff' : '#6b7280',
                  borderRadius: 999,
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                style={{
                  background: yearly ? 'rgba(124,58,237,0.2)' : 'transparent',
                  border: yearly ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
                  color: yearly ? '#e9d5ff' : '#6b7280',
                  borderRadius: 999,
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Yearly
                <span style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, marginLeft: 8 }}>
                  2 months free
                </span>
              </button>
            </div>
          </div>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {/* Starter */}
            <div ref={addRef} className="anim-target feature-card" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>Starter</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 800 }}>$0</span>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>/month</span>
                </div>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0', lineHeight: 1.5 }}>Try the AI. No credit card required.</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                {[
                  { text: '3 AI coach messages/mo', ai: true },
                  { text: '1 script generation/mo', ai: true },
                  { text: '1 idea generation/mo', ai: true },
                  { text: '5 competitors tracked' },
                  { text: 'Unlimited inspo saves' },
                  { text: 'Unlimited manual ideas' },
                  { text: 'Content calendar' },
                  { text: 'Sync my videos' },
                  { text: 'Chrome extension' },
                ].map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#9ca3af', padding: '5px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#7c3aed', fontSize: 14 }}>&#10003;</span>
                    {item.text}
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <span className="btn-ghost" style={{ padding: '12px 0', fontSize: 14, display: 'block', textAlign: 'center', width: '100%' }}>
                  Get started free
                </span>
              </Link>
            </div>

            {/* Plus */}
            <div ref={addRef} className="anim-target feature-card" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', transitionDelay: '0.1s' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>Plus</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 800 }}>{yearly ? '$4.17' : '$5.99'}</span>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>/month</span>
                </div>
                {yearly && <p style={{ fontSize: 12, color: '#a855f7', margin: '4px 0 0', fontWeight: 600 }}>$49.99 billed yearly — save $21.89</p>}
                <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0', lineHeight: 1.5 }}>Unlock AI to start creating smarter content.</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                {[
                  { text: '25 AI coach messages/mo', ai: true },
                  { text: '10 script generations/mo', ai: true },
                  { text: '10 idea generations/mo', ai: true },
                  { text: '10 post analyses/mo', ai: true },
                  { text: '10 competitor idea gens/mo', ai: true },
                  { text: '10 competitors tracked' },
                  { text: '30 video downloads/mo' },
                  { text: 'Unlimited inspo saves' },
                  { text: 'Unlimited manual ideas' },
                  { text: 'Content calendar' },
                  { text: 'Sync my videos' },
                  { text: 'Chrome extension' },
                ].map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#9ca3af', padding: '5px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#7c3aed', fontSize: 14 }}>&#10003;</span>
                    {item.text}
                  </li>
                ))}
              </ul>
              <Link href={`/signup?plan=plus${yearly ? '&billing=yearly' : ''}`}>
                <span className="btn-primary" style={{ padding: '12px 0', fontSize: 14, display: 'block', textAlign: 'center', width: '100%' }}>
                  Get Plus
                </span>
              </Link>
            </div>

            {/* Pro - Popular */}
            <div ref={addRef} className="anim-target feature-card" style={{ background: '#12121a', border: '2px solid rgba(124,58,237,0.5)', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 0 40px rgba(124,58,237,0.1)', transitionDelay: '0.2s' }}>
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Most popular
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#a855f7', marginBottom: 4 }}>Pro</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 800 }}>{yearly ? '$12.50' : '$14.99'}</span>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>/month</span>
                </div>
                {yearly && <p style={{ fontSize: 12, color: '#a855f7', margin: '4px 0 0', fontWeight: 600 }}>$149.99 billed yearly — save $29.89</p>}
                <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0', lineHeight: 1.5 }}>For serious creators who want to grow fast.</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                {[
                  { text: '100 AI coach messages/mo', ai: true },
                  { text: '40 script generations/mo', ai: true },
                  { text: '40 idea generations/mo', ai: true },
                  { text: '40 post analyses/mo', ai: true },
                  { text: '40 competitor idea gens/mo', ai: true },
                  { text: '30 competitors tracked' },
                  { text: '75 video downloads/mo' },
                  { text: 'Unlimited inspo saves' },
                  { text: 'Unlimited manual ideas' },
                  { text: 'Content calendar' },
                  { text: 'Sync my videos' },
                  { text: 'Chrome extension' },
                ].map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#d1d5db', padding: '5px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#a855f7', fontSize: 14 }}>&#10003;</span>
                    {item.text}
                  </li>
                ))}
              </ul>
              <Link href={`/signup?plan=pro${yearly ? '&billing=yearly' : ''}`}>
                <span className="btn-primary" style={{ padding: '12px 0', fontSize: 14, display: 'block', textAlign: 'center', width: '100%' }}>
                  Go Pro
                </span>
              </Link>
            </div>

            {/* Max */}
            <div ref={addRef} className="anim-target feature-card" style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', transitionDelay: '0.3s' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>Max</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 800 }}>{yearly ? '$33.33' : '$39.99'}</span>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>/month</span>
                </div>
                {yearly && <p style={{ fontSize: 12, color: '#a855f7', margin: '4px 0 0', fontWeight: 600 }}>$399.99 billed yearly — save $79.89</p>}
                <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0', lineHeight: 1.5 }}>Maximum power for teams and top creators.</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                {[
                  { text: '300 AI coach messages/mo', ai: true },
                  { text: '125 script generations/mo', ai: true },
                  { text: '125 idea generations/mo', ai: true },
                  { text: '125 post analyses/mo', ai: true },
                  { text: '125 competitor idea gens/mo', ai: true },
                  { text: '100 competitors tracked' },
                  { text: '300 video downloads/mo' },
                  { text: 'Unlimited inspo saves' },
                  { text: 'Unlimited manual ideas' },
                  { text: 'Content calendar' },
                  { text: 'Sync my videos' },
                  { text: 'Chrome extension' },
                ].map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#9ca3af', padding: '5px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#7c3aed', fontSize: 14 }}>&#10003;</span>
                    {item.text}
                  </li>
                ))}
              </ul>
              <Link href={`/signup?plan=max${yearly ? '&billing=yearly' : ''}`}>
                <span className="btn-primary" style={{ padding: '12px 0', fontSize: 14, display: 'block', textAlign: 'center', width: '100%' }}>
                  Go Max
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ maxWidth: 700, margin: '0 auto', padding: '100px 24px' }}>
          <div ref={addRef} className="anim-target" style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#a855f7', letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>
              FAQ
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Common questions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="faq-item"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  background: '#12121a',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{faq.q}</span>
                  <span style={{
                    color: '#6b7280',
                    fontSize: 18,
                    transition: 'transform 0.2s ease',
                    transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)',
                  }}>+</span>
                </div>
                <div
                  className="faq-answer"
                  style={{
                    maxHeight: openFaq === i ? 200 : 0,
                    opacity: openFaq === i ? 1 : 0,
                    paddingTop: openFaq === i ? 12 : 0,
                  }}
                >
                  <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #7c3aed, transparent)' }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(124,58,237,0.2), transparent)',
            pointerEvents: 'none',
          }} />
          <div ref={addRef} className="anim-target" style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px', textAlign: 'center', position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em' }}>
              Ready to stop guessing and<br /><span className="gradient-text">start growing?</span>
            </h2>
            <p style={{ fontSize: 17, color: '#9ca3af', marginBottom: 36, maxWidth: 500, margin: '0 auto 36px' }}>
              Join creators who use Orianna to stay consistent, create better content, and grow faster.
            </p>
            <Link href="/signup">
              <span className="btn-primary" style={{ padding: '18px 48px', fontSize: 18, display: 'inline-block', boxShadow: '0 0 40px rgba(124,58,237,0.35)' }}>
                Get started free
              </span>
            </Link>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 16 }}>Free plan with AI included &middot; No credit card required</p>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 0 32px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
            <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
              {/* Brand */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 64 64">
                    <path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="#a855f7"/>
                  </svg>
                  <span style={{ fontSize: 18, fontWeight: 700 }} className="gradient-text">Orianna</span>
                </div>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, maxWidth: 280 }}>
                  The AI content coach for short-form video creators. Research, plan, and create — all in one place.
                </p>
              </div>
              {/* Product */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Product</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a href="#features" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">Features</a>
                  <a href="#how-it-works" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">How it works</a>
                  <a href="#pricing" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">Pricing</a>
                  <a href="#faq" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">FAQ</a>
                </div>
              </div>
              {/* Account */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Account</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Link href="/signup" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">Sign up</Link>
                  <Link href="/login" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">Log in</Link>
                </div>
              </div>
              {/* Legal */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Legal</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Link href="/legal/privacy" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">Privacy Policy</Link>
                  <Link href="/legal/terms" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none', transition: 'color 0.2s' }} className="nav-login">Terms of Service</Link>
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>&copy; 2026 Orianna. All rights reserved.</span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Made for creators, by creators.</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
