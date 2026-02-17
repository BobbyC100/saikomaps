/**
 * Reset Password Page
 * Set new password using token from email link
 */

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SaikoLogo } from '@/components/ui/SaikoLogo'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations'

export default function ResetPasswordPage() {
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
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <Link href="/"><SaikoLogo href="/" variant="light" className="scale-150" /></Link>
          </div>
          <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-8 text-center">
            <p className="text-white/80 mb-4">Invalid or missing reset link. Request a new one from the login page.</p>
            <Link href="/forgot-password" className="text-[#89B4C4] hover:text-[#7CA4B4] text-sm">Request reset link</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center justify-center mb-4">
            <SaikoLogo href="/" variant="light" className="scale-150" />
          </Link>
        </div>

        <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
          <p className="text-white/60 mb-8 text-sm">Enter your new password below.</p>

          {success ? (
            <p className="text-white/90">Password updated. Redirecting to login...</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <input type="hidden" {...register('token')} />
              {error && (
                <div className="p-4 bg-[#D64541]/10 border border-[#D64541]/30 rounded-lg">
                  <p className="text-sm text-[#D64541]">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">New password</label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#89B4C4] transition-colors"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="mt-1.5 text-sm text-[#D64541]">{errors.newPassword.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Confirm password</label>
                <input
                  type="password"
                  placeholder="Same as above"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#89B4C4] transition-colors"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-[#D64541]">{errors.confirmPassword.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3.5 bg-[#D64541] text-white font-bold rounded-lg hover:bg-[#C13D39] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="text-white/60 hover:text-white/80 text-sm">
              ← Back to login
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-white/40 hover:text-white/60 text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
