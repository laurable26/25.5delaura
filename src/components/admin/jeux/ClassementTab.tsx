import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRealtimeClassement } from '../../../hooks/useRealtime'
import type { Equipe, Profile, ResultatEpreuve } from '../../../types'

function nomEquipe(eq: Equipe): string {
  if (eq.nom_choisi) return eq.nom_choisi
  if (eq.numero !== null) return `#${eq.numero}`
  return eq.nom
}

interface EquipeEntry {
  equipe: Equipe
  total: number
}

interface UserEntry {
  profile: Profile
  total: number
}

export function ClassementTab() {
  const [equipeClassement, setEquipeClassement] = useState<EquipeEntry[]>([])
  const [userClassement, setUserClassement] = useState<UserEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClassement = useCallback(async () => {
    try {
      const [{ data: equipes }, { data: resultats }, { data: profiles }] =
        await Promise.all([
          supabase.from('equipes').select('*').order('numero', { nullsFirst: false }),
          supabase.from('resultats_epreuves').select('*'),
          supabase.from('profiles').select('*').order('prenom'),
        ])

      if (equipes && resultats) {
        const totals = (equipes as Equipe[]).map((eq) => {
          const total = (resultats as ResultatEpreuve[])
            .filter((r) => r.equipe_id === eq.id)
            .reduce((sum, r) => sum + r.blerhams_attribues, 0)
          return { equipe: eq, total }
        })
        totals.sort((a, b) => b.total - a.total)
        setEquipeClassement(totals)
      }

      if (profiles) {
        const userTotals = (profiles as Profile[])
          .map((p) => ({ profile: p, total: p.solde }))
          .sort((a, b) => b.total - a.total)
        setUserClassement(userTotals)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClassement()
  }, [fetchClassement])

  useRealtimeClassement(fetchClassement)

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <p className="font-nunito text-purple-mid">Chargement...</p>
      </div>
    )
  }

  const medal = (i: number) => {
    if (i === 0) return '🥇'
    if (i === 1) return '🥈'
    if (i === 2) return '🥉'
    return `${i + 1}.`
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Classement</h2>
        <button
          onClick={fetchClassement}
          className="px-3 py-1.5 rounded-btn bg-bg-main border border-border font-nunito text-purple-dark text-xs active:opacity-80"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Classement équipes */}
      <div className="flex flex-col gap-3">
        <h3 className="font-bangers text-purple-dark text-xl tracking-wide">Équipes</h3>
        {equipeClassement.map((entry, i) => (
          <div
            key={entry.equipe.id}
            className={`bg-white rounded-card border border-border p-3 flex items-center gap-3 ${
              i === 0 ? 'border-yellow-fest shadow-sm' : ''
            }`}
          >
            <span className="font-bangers text-2xl text-purple-mid w-8 text-center">
              {medal(i)}
            </span>
            <p className="font-nunito font-bold text-purple-dark flex-1">{nomEquipe(entry.equipe)}</p>
            <p className="font-bangers text-xl text-purple-dark">{entry.total} B</p>
          </div>
        ))}
        {equipeClassement.length === 0 && (
          <p className="font-nunito text-purple-mid text-sm text-center py-2">
            Aucun résultat pour le moment.
          </p>
        )}
      </div>

      {/* Top utilisateurs */}
      <div className="flex flex-col gap-3">
        <h3 className="font-bangers text-purple-dark text-xl tracking-wide">Classement individuel</h3>
        {userClassement.map((entry, i) => (
          <div
            key={entry.profile.id}
            className="bg-white rounded-card border border-border p-3 flex items-center gap-3"
          >
            <span className="font-bangers text-xl text-purple-mid w-8 text-center">
              {medal(i)}
            </span>
            {entry.profile.photo_url ? (
              <img
                src={entry.profile.photo_url}
                alt={entry.profile.prenom}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-sm flex-shrink-0">
                {entry.profile.prenom[0]}
              </div>
            )}
            <p className="font-nunito font-bold text-purple-dark flex-1">{entry.profile.prenom}</p>
            <p className="font-bangers text-xl text-purple-dark">{entry.total} B</p>
          </div>
        ))}
        {userClassement.length === 0 && (
          <p className="font-nunito text-purple-mid text-sm text-center py-2">
            Aucun utilisateur.
          </p>
        )}
      </div>
    </div>
  )
}
