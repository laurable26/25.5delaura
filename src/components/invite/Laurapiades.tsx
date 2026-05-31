import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Epreuve, Equipe, Profile } from '../../types'

const PLAN_ILE_URL = 'https://uenqoajlxkirszuifzcu.supabase.co/storage/v1/object/public/assets/plan/ile.jpeg'

interface LaurapiadesProps {
  profile: Profile
}

export function Laurapiades({ profile }: LaurapiadesProps) {
  const [epreuves, setEpreuves] = useState<Epreuve[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState(false)

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
    <>
      {/* Map fullscreen overlay */}
      {showMap && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => setShowMap(false)}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-black bg-opacity-70">
            <p className="font-bangers text-yellow-fest text-xl tracking-wide">🗺️ Plan de l'île</p>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-20 text-white font-nunito font-bold"
              onClick={() => setShowMap(false)}
            >
              ✕
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2">
            <img
              src={PLAN_ILE_URL}
              alt="Plan de l'île"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <p className="text-center font-nunito text-white text-xs opacity-50 pb-4">
            Tape n'importe où pour fermer
          </p>
        </div>
      )}

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
        <button
          onClick={() => setShowMap(true)}
          className="w-full flex items-center gap-4 bg-white rounded-card border border-border px-4 py-4 active:bg-bg-main transition-colors text-left"
        >
          <span className="text-2xl">🗺️</span>
          <span className="font-nunito font-bold text-purple-dark text-base">Plan de l'île</span>
          <span className="ml-auto text-purple-mid text-lg">›</span>
        </button>

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
    </>
  )
}
