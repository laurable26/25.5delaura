import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Epreuve, Equipe, ResultatEpreuve } from '../../types'

interface ClassementEntry {
  equipe: Equipe
  total: number
}

export function Laurapiades() {
  const [epreuves, setEpreuves] = useState<Epreuve[]>([])
  const [classement, setClassement] = useState<ClassementEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: ep }, { data: equipes }, { data: resultats }] = await Promise.all([
        supabase.from('epreuves').select('*').order('ordre'),
        supabase.from('equipes').select('*').order('nom'),
        supabase.from('resultats_epreuves').select('*'),
      ])

      setEpreuves(ep ?? [])

      if (equipes && resultats) {
        const totals = (equipes as Equipe[]).map((eq) => {
          const total = (resultats as ResultatEpreuve[])
            .filter((r) => r.equipe_id === eq.id)
            .reduce((sum, r) => sum + r.blerhams_attribues, 0)
          return { equipe: eq, total }
        })
        totals.sort((a, b) => b.total - a.total)
        setClassement(totals)
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="font-nunito text-purple-mid">Chargement...</p></div>
  }

  const statusLabel: Record<string, string> = {
    a_venir: '⏳ À venir',
    en_cours: '🔥 En cours',
    termine: '✓ Terminée',
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-28">
      {/* Épreuves */}
      <div className="flex flex-col gap-3">
        <h2 className="font-bangers text-purple-dark text-xl tracking-wide">Épreuves</h2>
        {epreuves.length === 0 && (
          <p className="font-nunito text-purple-mid text-sm">Aucune épreuve pour l'instant.</p>
        )}
        {epreuves.map((ep) => (
          <div
            key={ep.id}
            className={`bg-white rounded-card border border-border p-4 ${ep.statut === 'en_cours' ? 'border-pink-fluo shadow-md' : ''}`}
          >
            <div className="flex items-center justify-between">
              <p className="font-nunito font-bold text-purple-dark">{ep.nom}</p>
              <span className={`text-xs font-nunito px-2 py-0.5 rounded-full ${ep.statut === 'en_cours' ? 'bg-pink-fluo text-white' : 'bg-bg-main text-purple-mid'}`}>
                {statusLabel[ep.statut]}
              </span>
            </div>
            <p className="font-nunito text-purple-mid text-sm mt-1">
              {ep.mode === 'gagnant_perdant'
                ? `Victoire: ${ep.blerhams_victoire}B · Défaite: ${ep.blerhams_defaite}B`
                : `${ep.blerhams_par_point}B / point`}
            </p>
          </div>
        ))}
      </div>

      {/* Classement */}
      <div className="flex flex-col gap-3">
        <h2 className="font-bangers text-purple-dark text-xl tracking-wide">Classement équipes</h2>
        {classement.map((entry, i) => (
          <div
            key={entry.equipe.id}
            className="bg-white rounded-card border border-border p-3 flex items-center gap-3"
          >
            <span className="font-bangers text-2xl text-purple-mid w-8 text-center">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </span>
            <div
              className="w-3 h-8 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.equipe.couleur ?? '#8B6BAE' }}
            />
            <p className="font-nunito font-bold text-purple-dark flex-1">{entry.equipe.nom}</p>
            <p className="font-bangers text-xl text-purple-dark">{entry.total} B</p>
          </div>
        ))}
      </div>
    </div>
  )
}
