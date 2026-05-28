import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Profile, Transaction } from '../../../types'

export function BonusTab() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [montant, setMontant] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<(Transaction & { prenom?: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: profilesData }, { data: txData }] = await Promise.all([
        supabase.from('profiles').select('*').order('prenom'),
        supabase
          .from('transactions')
          .select('*')
          .in('type', ['bonus', 'malus'])
          .order('created_at', { ascending: false })
          .limit(20),
      ])
      setProfiles(profilesData ?? [])

      if (txData && profilesData) {
        const enriched = txData.map((tx) => {
          const profile = profilesData.find((p) => p.id === tx.receveur_id)
          return { ...tx, prenom: profile?.prenom }
        })
        setRecentTransactions(enriched)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit() {
    if (!selectedUserId || !montant) return
    const montantNum = parseFloat(montant)
    if (isNaN(montantNum) || montantNum === 0) {
      setError('Montant invalide')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

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
      setMontant('')
      setDescription('')
      setSelectedUserId('')

      // Refresh recent transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .in('type', ['bonus', 'malus'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (txData) {
        const enriched = txData.map((tx) => {
          const p = profiles.find((pr) => pr.id === tx.receveur_id)
          return { ...tx, prenom: p?.prenom }
        })
        setRecentTransactions(enriched)
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
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.prenom} ({p.solde}B)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-nunito text-purple-dark text-sm font-bold block mb-1">
            Montant <span className="font-normal text-purple-mid">(positif = bonus, négatif = malus)</span>
          </label>
          <input
            type="number"
            placeholder="ex: 50 ou -20"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
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
          disabled={submitting || !selectedUserId || !montant}
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
              <span className={`text-xl ${tx.type === 'bonus' ? '⚡' : ''}`}>
                {tx.type === 'bonus' ? '⚡' : '💀'}
              </span>
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
