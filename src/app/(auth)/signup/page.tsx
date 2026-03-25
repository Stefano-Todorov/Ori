'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  background: '#1e1e2e',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '12px 14px',
  color: 'white',
  fontSize: 14,
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#9ca3af',
  fontWeight: 500,
  marginBottom: 6,
  display: 'block',
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')
  const billing = searchParams.get('billing')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const params = new URLSearchParams()
      if (plan) params.set('plan', plan)
      if (billing) params.set('billing', billing)
      const qs = params.toString()
      router.push(`/onboarding${qs ? `?${qs}` : ''}`)
      router.refresh()
    }
  }

  return (
    <>
      <style jsx global>{`
        .auth-input:focus {
          border-color: #7c3aed !important;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.2) !important;
        }
        .auth-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(124,58,237,0.5) !important;
        }
        .auth-link:hover { text-decoration: underline; }
      `}</style>
      <div style={{
        background: '#12121a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 36,
        boxShadow: '0 0 60px rgba(124,58,237,0.12), 0 24px 48px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>Create your account</h2>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: '4px 0 0' }}>Start your content journey with Orianna</p>
        </div>

        <form onSubmit={handleSignup}>
          {error && (
            <div style={{ fontSize: 13, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>
          )}

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="name" style={labelStyle}>Name</label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              className="auth-input"
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="auth-input"
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                className="auth-input"
                style={{ ...inputStyle, paddingRight: 42 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: 0,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              width: '100%',
              height: 48,
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
              marginTop: 8,
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round"/>
              </svg>
            )}
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {/* Footer link */}
        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: '#6b7280' }}>
          Already have an account?{' '}
          <Link href="/login" className="auth-link" style={{ color: '#a855f7', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </>
  )
}
