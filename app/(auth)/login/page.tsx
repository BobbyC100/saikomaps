/**
 * Login Page
 * User login form
 */

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { SaikoLogo } from '@/components/ui/SaikoLogo'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

      // Redirect to intended page or dashboard
      const next = searchParams.get('next')
      const redirectUrl = next && next.startsWith('/') ? next : '/dashboard'
      router.push(redirectUrl)
      router.refresh()
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center px-8 py-12">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center justify-center mb-8">
            <SaikoLogo href="/" variant="dark" />
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-8">
          <h1 className="text-3xl font-normal text-[var(--charcoal)] mb-2" style={{ fontFamily: 'var(--font-libre)', fontStyle: 'italic' }}>Welcome Back</h1>
          <p className="text-[var(--charcoal)]/60 mb-8 text-sm">Log in to your account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30" style={{ borderRadius: '12px' }}>
                <p className="text-sm text-[var(--error)]">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--charcoal)]/80 mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white border border-[var(--charcoal)]/10 text-[var(--charcoal)] placeholder:text-[var(--charcoal)]/30 focus:outline-none focus:border-[var(--charcoal)]/30 transition-colors"
                style={{ borderRadius: '12px' }}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-[var(--error)]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--charcoal)]/80 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-[var(--charcoal)]/10 text-[var(--charcoal)] placeholder:text-[var(--charcoal)]/30 focus:outline-none focus:border-[var(--charcoal)]/30 transition-colors"
                style={{ borderRadius: '12px' }}
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1.5 text-sm text-[var(--error)]">{errors.password.message}</p>
              )}
              <div className="mt-2 text-right">
                <Link href="/forgot-password" className="text-sm text-white/50 hover:text-white/70">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3.5 bg-[var(--charcoal)] text-[var(--parchment)] font-semibold hover:bg-[var(--charcoal)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm tracking-wider uppercase"
              style={{ borderRadius: '12px' }}
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <span className="text-[var(--charcoal)]/60 text-sm">Don&apos;t have an account? </span>
            <Link href="/signup" className="text-[var(--charcoal)] hover:text-[var(--charcoal)]/80 font-medium text-sm">
              Sign up
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-[var(--charcoal)]/40 hover:text-[var(--charcoal)]/60 text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

