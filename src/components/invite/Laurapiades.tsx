import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Epreuve, Equipe, Profile } from '../../types'

const PLAN_ILE_URL = ''

interface LaurapiadesProps {
  profile: Profile
}

export function Laurapiades({ profile }: LaurapiadesProps) {
  const [epreuves, setEpreuves] = useState<Epreuve[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: ep }, { data: eq }] = await Promise.all([
        supabase.from('epreuves').select('*').order('ordre', { nullsFirst: false }),
        supabase.from('equipes').select('*').order('nom'),
      ])
      setEpreuves(ep ?? [])
      setEquipes(eq ?? [])
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

  const monEquipe = equipes.find((e) => e.id === profile.equipe_id) ?? null

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-10">
      {/* Mon équipe */}
      <div className="bg-white rounded-card-lg border border-border p-5 flex items-center gap-4">
        {monEquipe ? (
          <>
            <div>
              <p className="font-nunito text-purple-mid text-xs">Mon équipe</p>
              <p className="font-bangers text-purple-dark text-2xl tracking-wide leading-tight">{monEquipe.nom}</p>
            </div>
          </>
        ) : (
          <p className="font-nunito text-purple-mid text-sm">Tu n'es pas encore dans une équipe.</p>
        )}
      </div>

      {/* Plan de l'île */}
      {PLAN_ILE_URL ? (
        <button
          onClick={() => window.open(PLAN_ILE_URL, '_blank', 'noopener,noreferrer')}
          className="w-full flex items-center gap-4 bg-white rounded-card border border-border px-4 py-4 active:bg-bg-main transition-colors text-left"
        >
          <span className="text-2xl">🗺️</span>
          <span className="font-nunito font-bold text-purple-dark text-base">Plan de l'île</span>
          <span className="ml-auto text-purple-mid text-lg">›</span>
        </button>
      ) : (
        <div className="w-full flex items-center gap-4 bg-white rounded-card border border-border px-4 py-4 opacity-40">
          <span className="text-2xl">🗺️</span>
          <span className="font-nunito font-bold text-purple-dark text-base">Plan de l'île</span>
          <span className="ml-auto font-nunito text-purple-mid text-xs">Bientôt</span>
        </div>
      )}

      {/* Épreuves */}
      <div className="flex flex-col gap-3">
        <h2 className="font-bangers text-purple-dark text-xl tracking-wide">Ordre des épreuves</h2>
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
    </div>
  )
}
