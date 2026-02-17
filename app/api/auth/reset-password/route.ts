/**
 * POST /api/auth/reset-password
 * Reset password using a valid token from the email link.
 */

import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { resetPasswordSchema } from '@/lib/validations'
import { hashResetToken } from '@/lib/password-reset-token'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }
    const { token, newPassword } = validation.data

    const tokenHash = hashResetToken(token)
    const record = await db.password_reset_tokens.findFirst({
      where: { tokenHash },
      include: { users: true },
    })

    if (!record || record.usedAt || new Date() > record.expiresAt) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired.' },
        { status: 400 }
      )
    }

    const passwordHash = await hash(newPassword, 12)
    await db.$transaction([
      db.users.update({
        where: { id: record.userId },
        data: { passwordHash, updatedAt: new Date() },
      }),
      db.password_reset_tokens.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
