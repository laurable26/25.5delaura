import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Profile, Transaction } from '../../../types'

function SignedInput({
  absValue,
  sign,
  onAbsChange,
  onSignToggle,
  placeholder,
}: {
  absValue: string
  sign: '+' | '-'
  onAbsChange: (v: string) => void
  onSignToggle: () => void
  placeholder?: string
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onSignToggle}
        className={`w-12 flex-shrink-0 rounded-btn font-bangers text-xl border transition-colors ${
          sign === '-'
            ? 'bg-pink-fluo text-white border-pink-fluo'
            : 'bg-green-50 text-green-700 border-green-200'
        }`}
      >
        {sign}
      </button>
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder ?? '0'}
        value={absValue}
        onChange={(e) => onAbsChange(e.target.value.replace(/[^0-9]/g, ''))}
        className="flex-1 border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
      />
    </div>
  )
}

export function BonusTab() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [montantSign, setMontantSign] = useState<'+' | '-'>('+')
  const [montantAbs, setMontantAbs] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<(Transaction & { prenom?: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const [{ data: profilesData }, { data: txData }] = await Promise.all([
          supabase.from('profiles').select('*').order('prenom'),
          supabase
            .from('transactions')
            .select('*')
            .in('type', ['bonus', 'malus'])
            .order('created_at', { ascending: false })
            .limit(20),
        ])
        if (!mounted) return
        setProfiles(profilesData ?? [])
        if (txData && profilesData) {
          const enriched = txData.map((tx) => {
            const profile = profilesData.find((p) => p.id === tx.receveur_id)
            return { ...tx, prenom: profile?.prenom }
          })
          setRecentTransactions(enriched)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  async function refreshTransactions(currentProfiles: typeof profiles) {
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['bonus', 'malus'])
      .order('created_at', { ascending: false })
      .limit(20)
    if (txData) {
      setRecentTransactions(txData.map((tx) => ({ ...tx, prenom: currentProfiles.find((p) => p.id === tx.receveur_id)?.prenom })))
    }
  }

  async function handleSubmit() {
    if (!selectedUserId || !montantAbs) return
    const montantNum = parseInt(montantAbs) * (montantSign === '-' ? -1 : 1)
    if (isNaN(montantNum) || montantNum === 0) { setError('Montant invalide'); return }
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    if (selectedUserId === '__tous__') {
      const results = await Promise.all(
        profiles.map((p) =>
          supabase.rpc('appliquer_bonus_malus', { p_user_id: p.id, p_montant: montantNum, p_description: description.trim() || null })
        )
      )
      const firstErr = results.find((r) => r.error)
      if (firstErr?.error) {
        setError(firstErr.error.message)
      } else {
        const typeLabel = montantNum > 0 ? 'Bonus' : 'Malus'
        setSuccess(`${typeLabel} de ${Math.abs(montantNum)}B appliqué à ${profiles.length} personnes !`)
        setMontantAbs(''); setMontantSign('+'); setDescription(''); setSelectedUserId('')
        await refreshTransactions(profiles)
      }
    } else {
      const { error: rpcError } = await supabase.rpc('appliquer_bonus_malus', {
        p_user_id: selectedUserId,
        p_montant: montantNum,
        p_description: description.trim() || null,
      })
      if (rpcError) {
        setError(rpcError.message)
      } else {
        const profile = profiles.find((p) => p.id === selectedUserId)
        const typeLabel = montantNum > 0 ? 'Bonus' : 'Malus'
        setSuccess(`${typeLabel} de ${Math.abs(montantNum)}B appliqué à ${profile?.prenom} !`)
        setMontantAbs(''); setMontantSign('+'); setDescription(''); setSelectedUserId('')
        await refreshTransactions(profiles)
      }
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <p className="font-nunito text-purple-mid">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
      <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Bonus / Malus</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-card p-3">
          <p className="font-nunito text-red-600 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-card p-3">
          <p className="font-nunito text-green-700 text-sm">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-card border border-border p-4 flex flex-col gap-3">
        <div>
          <label className="font-nunito text-purple-dark text-sm font-bold block mb-1">Utilisateur</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
          >
            <option value="">Choisir un utilisateur...</option>
            <option value="__tous__">⚡ Tous les invités ({profiles.length} personnes)</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.prenom} ({p.solde}B)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-nunito text-purple-dark text-sm font-bold block mb-1">
            Montant <span className="font-normal text-purple-mid">(appuie sur +/− pour changer le signe)</span>
          </label>
          <SignedInput
            absValue={montantAbs}
            sign={montantSign}
            onAbsChange={setMontantAbs}
            onSignToggle={() => setMontantSign((s) => (s === '+' ? '-' : '+'))}
            placeholder="ex: 50"
          />
        </div>

        <div>
          <label className="font-nunito text-purple-dark text-sm font-bold block mb-1">
            Description <span className="font-normal text-purple-mid">(optionnel)</span>
          </label>
          <input
            type="text"
            placeholder="Raison du bonus/malus..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedUserId || !montantAbs}
          className="py-3 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-base disabled:opacity-50 active:opacity-80"
        >
          {submitting ? 'Application...' : 'Appliquer ⚡'}
        </button>
      </div>

      {recentTransactions.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-bangers text-purple-dark text-xl tracking-wide">Récent</h3>
          {recentTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-card border border-border p-3 flex items-center gap-3"
            >
              <span className="text-xl">{tx.type === 'bonus' ? '⚡' : '💀'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-nunito font-bold text-purple-dark text-sm truncate">
                  {tx.prenom ?? 'Inconnu'}
                </p>
                {tx.description && (
                  <p className="font-nunito text-purple-mid text-xs truncate">{tx.description}</p>
                )}
              </div>
              <span
                className={`font-bangers text-lg ${
                  tx.montant > 0 ? 'text-green-fluo' : 'text-pink-fluo'
                }`}
              >
                {tx.montant > 0 ? '+' : ''}{tx.montant}B
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
