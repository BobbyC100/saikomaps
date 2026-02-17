/**
 * Password reset token: generate random token, hash for DB storage.
 * Only the raw token is sent in the email link; we store the hash.
 */

import { createHash, randomBytes } from 'crypto'

const TOKEN_BYTES = 32
const EXPIRY_MINUTES = 60

export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString('hex')
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

export function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function getResetTokenExpiry(): Date {
  const d = new Date()
  d.setMinutes(d.getMinutes() + EXPIRY_MINUTES)
  return d
}
