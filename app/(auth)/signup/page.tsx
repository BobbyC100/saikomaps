/**
 * Sign Up Page
 * New user registration form
 */

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SaikoLogo } from '@/components/ui/SaikoLogo'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema, type SignupInput } from '@/lib/validations'

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true)
    setError(null)

    try {
      // Create account
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create account')
        return
      }

      // Automatically log in after signup
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (signInResult?.error) {
        setError('Account created, but failed to log in. Please try logging in manually.')
        return
      }

      // Redirect to dashboard
      router.push('/dashboard')
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

        {/* Signup Card */}
        <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-8">
          <h1 className="text-3xl font-normal text-[var(--charcoal)] mb-2" style={{ fontFamily: 'var(--font-libre)', fontStyle: 'italic' }}>Create Account</h1>
          <p className="text-[var(--charcoal)]/60 mb-8 text-sm">Start creating beautiful maps</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30" style={{ borderRadius: '12px' }}>
                <p className="text-sm text-[var(--error)]">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--charcoal)]/80 mb-2">
                Name
              </label>
              <input
                type="text"
                placeholder="Your name"
                className="w-full px-4 py-3 bg-white border border-[var(--charcoal)]/10 text-[var(--charcoal)] placeholder:text-[var(--charcoal)]/30 focus:outline-none focus:border-[var(--charcoal)]/30 transition-colors"
                style={{ borderRadius: '12px' }}
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-[var(--error)]">{errors.name.message}</p>
              )}
            </div>

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
              <p className="mt-1.5 text-xs text-[var(--charcoal)]/40">
                At least 8 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3.5 bg-[var(--charcoal)] text-[var(--parchment)] font-semibold hover:bg-[var(--charcoal)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm tracking-wider uppercase"
              style={{ borderRadius: '12px' }}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <span className="text-[var(--charcoal)]/60 text-sm">Already have an account? </span>
            <Link href="/login" className="text-[var(--charcoal)] hover:text-[var(--charcoal)]/80 font-medium text-sm">
              Log in
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
