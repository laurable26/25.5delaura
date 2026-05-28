import { useState } from 'react'
import { verifyPin } from '../lib/bcrypt'

export function usePin(pinHash: string | null) {
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkPin(pin: string): Promise<boolean> {
    if (!pinHash) return false
    setVerifying(true)
    setError(null)
    try {
      const valid = await verifyPin(pin, pinHash)
      if (!valid) setError('Code PIN incorrect')
      return valid
    } finally {
      setVerifying(false)
    }
  }

  return { checkPin, verifying, error, setError }
}
