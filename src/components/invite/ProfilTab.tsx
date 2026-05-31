import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { verifyPin, hashPin } from '../../lib/bcrypt'
import { PinInput } from '../ui/PinInput'
import type { Profile } from '../../types'

type Step = 'idle' | 'old_pin' | 'new_pin' | 'confirm_pin' | 'success'

interface ProfilTabProps {
  profile: Profile
  onLogout: () => void
}

export function ProfilTab({ profile, onLogout }: ProfilTabProps) {
  const [step, setStep] = useState<Step>('idle')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleOldPin(pin: string) {
    const ok = await verifyPin(pin, profile.pin_hash)
    if (!ok) {
      setError('Code incorrect')
      return
    }
    setError(null)
    setStep('new_pin')
  }

  function handleNewPin(pin: string) {
    setNewPin(pin)
    setStep('confirm_pin')
  }

  async function handleConfirmPin(pin: string) {
    if (pin !== newPin) {
      setError('Les codes ne correspondent pas')
      setStep('new_pin')
      setNewPin('')
      return
    }
    setSaving(true)
    setError(null)
    const hash = await hashPin(pin)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ pin_hash: hash })
      .eq('id', profile.id)
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      setStep('idle')
    } else {
      setStep('success')
    }
  }

  function handleSignOut() {
    supabase.auth.signOut()
    onLogout()
  }

  if (step !== 'idle') {
    return (
      <div className="flex flex-col items-center gap-6 px-4 pt-8 pb-28">
        <button
          onClick={() => { setStep('idle'); setError(null); setNewPin('') }}
          className="self-start text-purple-mid font-nunito text-sm"
        >
          ← Retour
        </button>

        {step === 'success' ? (
          <div className="flex flex-col items-center gap-4 pt-8">
            <span className="text-6xl">✅</span>
            <p className="font-bangers text-purple-dark text-2xl tracking-wide">Code mis à jour !</p>
            <button
              onClick={() => setStep('idle')}
              className="mt-4 px-6 py-3 rounded-btn bg-pink-fluo text-white font-nunito font-bold"
            >
              Retour au profil
            </button>
          </div>
        ) : (
          <>
            <p className="font-bangers text-purple-dark text-2xl tracking-wide text-center">
              {step === 'old_pin' && 'Ancien code PIN'}
              {step === 'new_pin' && 'Nouveau code PIN'}
              {step === 'confirm_pin' && 'Confirme ton code'}
            </p>
            <p className="font-nunito text-purple-mid text-sm text-center">
              {step === 'old_pin' && 'Entre ton code actuel'}
              {step === 'new_pin' && 'Choisis un nouveau code à 4 chiffres'}
              {step === 'confirm_pin' && 'Entre à nouveau le nouveau code'}
            </p>
            <PinInput
              onComplete={
                step === 'old_pin' ? handleOldPin
                : step === 'new_pin' ? handleNewPin
                : handleConfirmPin
              }
              disabled={saving}
              error={error}
            />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 pt-8 pb-28">
      {profile.photo_url ? (
        <img
          src={profile.photo_url}
          alt={profile.prenom}
          className="w-24 h-24 rounded-full object-cover border-4 border-yellow-fest"
        />
      ) : (
        <div className="w-24 h-24 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-4xl">
          {profile.prenom[0]}
        </div>
      )}

      <div className="text-center">
        <p className="font-bangers text-purple-dark text-3xl tracking-wide">{profile.prenom}</p>
        <p className="font-nunito text-purple-mid text-sm mt-1 capitalize">
          {profile.role.replace(/_/g, ' ')}
        </p>
      </div>

      <div className="w-full bg-white rounded-card border border-border p-4 text-center">
        <p className="font-nunito text-purple-mid text-sm">Solde actuel</p>
        <p className="font-bangers text-purple-dark text-4xl">{profile.solde} B</p>
      </div>

      <div className="w-full flex flex-col gap-3">
        <button
          onClick={() => { setError(null); setStep('old_pin') }}
          className="w-full py-3 rounded-btn bg-white border border-border font-nunito font-bold text-purple-dark active:bg-bg-main transition-colors"
        >
          🔑 Changer mon code PIN
        </button>
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-btn bg-bg-main border border-border font-nunito font-bold text-purple-mid active:bg-white transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
