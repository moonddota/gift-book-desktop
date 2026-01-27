import * as crypto from 'crypto'

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function verifyPassword(inputPassword: string, storedHash: string): boolean {
  const hash = crypto.createHash('sha256').update(inputPassword).digest('hex')
  return hash === storedHash
}
