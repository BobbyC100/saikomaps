/**
 * Login Page — Field Notes design system
 */

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/profile'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F0E1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span
              style={{
                fontFamily: 'var(--font-libre), Georgia, serif',
                fontStyle: 'italic',
                fontSize: '28px',
                color: '#36454F',
              }}
            >
              Saiko Maps
            </span>
          </Link>
        </div>

        {/* Login Card */}
        <div
          style={{
            background: '#FFFDF7',
            borderRadius: '12px',
            padding: '36px 32px',
            border: '1px solid rgba(195, 176, 145, 0.2)',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-libre), Georgia, serif',
              fontStyle: 'italic',
              fontSize: '24px',
              fontWeight: 400,
              color: '#36454F',
              margin: '0 0 6px',
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#8B7355',
              margin: '0 0 28px',
            }}
          >
            Log in to your account
          </p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(224, 122, 95, 0.08)',
                  border: '1px solid rgba(224, 122, 95, 0.2)',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}
              >
                <p style={{ fontSize: '13px', color: '#E07A5F', margin: 0 }}>{error}</p>
              </div>
            )}

            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#8B7355',
                  marginBottom: '8px',
                }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: '#F5F0E1',
                  border: '1px solid rgba(195, 176, 145, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#36454F',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                {...register('email')}
              />
              {errors.email && (
                <p style={{ marginTop: '4px', fontSize: '12px', color: '#E07A5F' }}>{errors.email.message}</p>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#8B7355',
                  marginBottom: '8px',
                }}
              >
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: '#F5F0E1',
                  border: '1px solid rgba(195, 176, 145, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#36454F',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                {...register('password')}
              />
              {errors.password && (
                <p style={{ marginTop: '4px', fontSize: '12px', color: '#E07A5F' }}>{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: '#36454F',
                color: '#F5F0E1',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                margin: '24px 0',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'rgba(195, 176, 145, 0.3)' }} />
              <span style={{ fontSize: '11px', color: '#C3B091', textTransform: 'uppercase', letterSpacing: '1px' }}>
                or
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(195, 176, 145, 0.3)' }} />
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl })}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid rgba(195, 176, 145, 0.3)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#36454F',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </form>

          <div style={{ marginTop: '28px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', color: '#8B7355' }}>Don&apos;t have an account? </span>
            <Link
              href="/signup"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#36454F',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              Sign up
            </Link>
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link
            href="/"
            style={{
              fontSize: '13px',
              color: '#C3B091',
              textDecoration: 'none',
            }}
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
