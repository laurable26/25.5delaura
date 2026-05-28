import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { hashPin } from '../../lib/bcrypt'
import { PinInput } from '../../components/ui/PinInput'

interface PinStepProps {
  userId: string
  onComplete: () => void
}

export function PinStep({ userId, onComplete }: PinStepProps) {
  const [phase, setPhase] = useState<'create' | 'confirm'>('create')
  const [firstPin, setFirstPin] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handlePin(pin: string) {
    if (phase === 'create') {
      setFirstPin(pin)
      setPhase('confirm')
      return
    }

    if (pin !== firstPin) {
      setError('Les codes ne correspondent pas. Recommence.')
      setPhase('create')
      setFirstPin(null)
      return
    }

    setSaving(true)
    setError(null)
    const hash = await hashPin(pin)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ pin_hash: hash })
      .eq('id', userId)

    if (updateError) {
      setError('Erreur: ' + updateError.message)
    } else {
      onComplete()
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-10">
      <div className="text-center">
        <h1 className="font-bangers text-purple-dark text-4xl tracking-wide">Code secret 🔐</h1>
        <p className="font-nunito text-purple-mid mt-2">
          {phase === 'create'
            ? 'Choisis un code PIN à 4 chiffres'
            : 'Confirme ton code PIN'}
        </p>
      </div>

      <PinInput onComplete={handlePin} disabled={saving} error={error} />

      {saving && <p className="font-nunito text-purple-mid text-sm">Sauvegarde...</p>}
    </div>
  )
}
