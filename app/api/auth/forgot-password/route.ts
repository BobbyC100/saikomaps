/**
 * POST /api/auth/forgot-password
 * Request a password reset email. Always returns 200 { success: true } to avoid leaking whether the email exists.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { forgotPasswordSchema } from '@/lib/validations'
import { generateResetToken, getResetTokenExpiry } from '@/lib/password-reset-token'
import { sendPasswordResetEmail } from '@/lib/send-password-reset-email'
import { checkForgotPasswordRateLimit } from '@/lib/forgot-password-rate-limit'

function getClientIdentifier(request: NextRequest, email: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return `${ip}:${email}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = forgotPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ success: true })
    }
    const { email } = validation.data

    const identifier = getClientIdentifier(request, email)
    const { allowed } = checkForgotPasswordRateLimit(identifier)
    if (!allowed) {
      return NextResponse.json({ success: true })
    }

    const user = await db.users.findUnique({ where: { email } })
    if (user) {
      const { raw, hash } = generateResetToken()
      const expiresAt = getResetTokenExpiry()
      await db.password_reset_tokens.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt,
        },
      })
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? 'http://localhost:3000'
      const resetLink = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/reset-password?token=${raw}`
      await sendPasswordResetEmail({ to: email, resetLink })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ success: true })
  }
}
