/**
 * Send password reset email via Resend.
 * Requires RESEND_API_KEY and NEXT_PUBLIC_APP_URL (or similar) in env.
 */

import { Resend } from 'resend'

export type SendPasswordResetEmailParams = {
  to: string
  resetLink: string
}

export async function sendPasswordResetEmail({ to, resetLink }: SendPasswordResetEmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set; skipping password reset email')
    return { ok: false, error: 'Email not configured' }
  }

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? 'Saiko Maps <onboarding@resend.dev>'
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Saiko Maps'

  try {
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject: `Reset your ${appName} password`,
      html: `
        <p>You asked to reset your password.</p>
        <p><a href="${resetLink}">Reset password</a></p>
        <p>This link expires in 60 minutes. If you didn't request this, you can ignore this email.</p>
      `,
    })
    if (error) {
      console.error('Resend error:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error('Send password reset email error:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to send email' }
  }
}
