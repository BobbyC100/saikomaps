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
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center justify-center mb-4">
            <SaikoLogo href="/" variant="light" className="scale-150" />
          </Link>
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-6 h-6 bg-[#D64541]"></div>
            <div className="w-6 h-6 rounded-full bg-[#89B4C4]"></div>
            <div className="w-6 h-6 bg-white"></div>
          </div>
        </div>

        {/* Signup Card */}
        <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-white/60 mb-8">Start creating beautiful maps</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-4 bg-[#D64541]/10 border border-[#D64541]/30 rounded-lg">
                <p className="text-sm text-[#D64541]">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Name
              </label>
              <input
                type="text"
                placeholder="Your name"
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#89B4C4] transition-colors"
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-[#D64541]">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#89B4C4] transition-colors"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-[#D64541]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#89B4C4] transition-colors"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1.5 text-sm text-[#D64541]">{errors.password.message}</p>
              )}
              <p className="mt-1.5 text-xs text-white/40">
                At least 8 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3.5 bg-[#D64541] text-white font-bold rounded-lg hover:bg-[#C13D39] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <span className="text-white/60">Already have an account? </span>
            <Link href="/login" className="text-[#89B4C4] hover:text-[#7CA4B4] font-medium">
              Log in
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-white/40 hover:text-white/60 text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

