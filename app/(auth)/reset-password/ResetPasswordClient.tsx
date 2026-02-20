'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SaikoLogo } from '@/components/ui/SaikoLogo'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations'

export function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    if (token) setValue('token', token)
  }, [token, setValue])

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: data.token,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <Link href="/" className="inline-flex items-center justify-center mb-8">
              <SaikoLogo href="/" variant="dark" />
            </Link>
          </div>
          <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-8 text-center">
            <p className="text-[var(--charcoal)]/80 mb-4">Invalid or missing reset link. Request a new one from the login page.</p>
            <Link href="/forgot-password" className="text-[var(--charcoal)] hover:text-[var(--charcoal)]/80 font-medium text-sm">Request reset link</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center px-8 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center justify-center mb-8">
            <SaikoLogo href="/" variant="dark" />
          </Link>
        </div>

        <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-8">
          <h1 className="text-3xl font-normal text-[var(--charcoal)] mb-2" style={{ fontFamily: 'var(--font-libre)', fontStyle: 'italic' }}>Set new password</h1>
          <p className="text-[var(--charcoal)]/60 mb-8 text-sm">Enter your new password below.</p>

          {success ? (
            <p className="text-[var(--charcoal)]">Password updated. Redirecting to login...</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <input type="hidden" {...register('token')} />
              {error && (
                <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl">
                  <p className="text-sm text-[var(--error)]">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[var(--charcoal)]/80 mb-2">New password</label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-3 bg-white border border-[var(--charcoal)]/10 text-[var(--charcoal)] placeholder:text-[var(--charcoal)]/30 focus:outline-none focus:border-[var(--charcoal)]/30 transition-colors rounded-xl"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="mt-1.5 text-sm text-[var(--error)]">{errors.newPassword.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--charcoal)]/80 mb-2">Confirm password</label>
                <input
                  type="password"
                  placeholder="Same as above"
                  className="w-full px-4 py-3 bg-white border border-[var(--charcoal)]/10 text-[var(--charcoal)] placeholder:text-[var(--charcoal)]/30 focus:outline-none focus:border-[var(--charcoal)]/30 transition-colors rounded-xl"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-[var(--error)]">{errors.confirmPassword.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3.5 bg-[var(--charcoal)] text-[var(--parchment)] font-semibold hover:bg-[var(--charcoal)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm tracking-wider uppercase rounded-xl"
              >
                {isLoading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="text-[var(--charcoal)]/60 hover:text-[var(--charcoal)]/80 text-sm">
              ← Back to login
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-[var(--charcoal)]/40 hover:text-[var(--charcoal)]/60 text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
