/**
 * Login Page
 * User login form
 */

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SaikoLogo } from '@/components/ui/SaikoLogo'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations'

export default function LoginPage() {
  const router = useRouter()
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

      // Redirect to profile on success
      router.push('/profile')
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

        {/* Login Card */}
        <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-white/60 mb-8">Log in to your account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-4 bg-[#D64541]/10 border border-[#D64541]/30 rounded-lg">
                <p className="text-sm text-[#D64541]">{error}</p>
              </div>
            )}

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
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3.5 bg-[#D64541] text-white font-bold rounded-lg hover:bg-[#C13D39] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-white/50 text-xs uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/profile' })}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-white/20 rounded-lg bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="mt-8 text-center">
            <span className="text-white/60">Don&apos;t have an account? </span>
            <Link href="/signup" className="text-[#89B4C4] hover:text-[#7CA4B4] font-medium">
              Sign up
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

