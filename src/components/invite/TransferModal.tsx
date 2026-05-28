import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { PinInput } from '../ui/PinInput'
import { usePin } from '../../hooks/usePin'
import type { Profile } from '../../types'

interface TransferModalProps {
  profile: Profile
  onClose: () => void
  onSuccess: (newSolde: number) => void
}

export function TransferModal({ profile, onClose, onSuccess }: TransferModalProps) {
  const [step, setStep] = useState<'select' | 'amount' | 'pin'>('select')
  const [guests, setGuests] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Profile | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const { checkPin, verifying, error: pinError, setError: setPinError } = usePin(profile.pin_hash)

  useEffect(() => {
    async function loadGuests() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, prenom, photo_url, solde, pin_hash, equipe_id, role, created_at')
        .neq('id', profile.id)
        .order('prenom')

      if (error) {
        setFetchError('Impossible de charger les invités')
      } else {
        setGuests(data ?? [])
      }
    }
    loadGuests()
  }, [profile.id])

  async function handlePin(pin: string) {
    const valid = await checkPin(pin)
    if (!valid) return

    const montant = parseInt(amount, 10)
    setLoading(true)
    try {
      const { error } = await supabase.rpc('transfer_blerhams', {
        p_emetteur_id: profile.id,
        p_receveur_id: selected!.id,
        p_montant: montant,
      })

      if (error) {
        setPinError(error.message)
      } else {
        onSuccess(profile.solde - montant)
      }
    } finally {
      setLoading(false)
    }
  }

  const montantNum = parseInt(amount, 10)
  const amountValid = !isNaN(montantNum) && montantNum > 0 && montantNum <= profile.solde

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg-main">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-white">
        <button onClick={onClose} className="text-purple-mid font-nunito text-sm">
          ✕ Fermer
        </button>
        <h2 className="font-bangers text-purple-dark text-xl tracking-wide flex-1 text-center">
          Transférer
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {step === 'select' && (
          <div className="flex flex-col gap-3">
            <p className="font-nunito text-purple-mid text-sm mb-2">Choisir un ami :</p>
            {fetchError && <p className="text-pink-fluo font-nunito text-sm">{fetchError}</p>}
            {guests.map((g) => (
              <button
                key={g.id}
                onClick={() => { setSelected(g); setStep('amount') }}
                className="flex items-center gap-3 bg-white rounded-card border border-border p-3 active:bg-bg-main transition-colors"
              >
                {g.photo_url ? (
                  <img src={g.photo_url} alt={g.prenom} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-mid flex items-center justify-center text-white font-bangers text-lg">
                    {g.prenom[0]}
                  </div>
                )}
                <span className="font-nunito font-bold text-purple-dark">{g.prenom}</span>
                <span className="ml-auto font-nunito text-purple-mid text-sm">{g.solde} B</span>
              </button>
            ))}
          </div>
        )}

        {step === 'amount' && selected && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('select')} className="text-purple-mid text-sm font-nunito">← Retour</button>
              <p className="font-nunito font-bold text-purple-dark">Pour {selected.prenom}</p>
            </div>
            <div className="bg-white rounded-card border border-border p-4 flex flex-col gap-3">
              <label className="font-nunito text-purple-mid text-sm">Montant (max {profile.solde})</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                max={profile.solde}
                className="w-full text-center font-bangers text-4xl text-purple-dark border-b-2 border-border bg-transparent outline-none py-2"
              />
              <p className="text-center font-nunito text-purple-mid text-sm">Blerhams</p>
            </div>
            <button
              onClick={() => setStep('pin')}
              disabled={!amountValid}
              className="w-full py-4 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-base disabled:opacity-40"
            >
              Continuer →
            </button>
          </div>
        )}

        {step === 'pin' && (
          <div className="flex flex-col gap-6">
            <button onClick={() => setStep('amount')} className="text-purple-mid text-sm font-nunito">← Retour</button>
            <div className="text-center">
              <p className="font-nunito font-bold text-purple-dark text-lg">Confirme avec ton PIN</p>
              <p className="font-nunito text-purple-mid text-sm mt-1">
                Envoyer {amount} Blerhams à {selected?.prenom}
              </p>
            </div>
            <PinInput
              onComplete={handlePin}
              disabled={verifying || loading}
              error={pinError}
            />
          </div>
        )}
      </div>
    </div>
  )
}
