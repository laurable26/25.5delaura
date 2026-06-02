import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Epreuve, Equipe } from '../../../types'

// Planning fixe pour 6 équipes × 9 épreuves
// [teamA_idx, teamB_idx, epreuve_idx] — indices dans les tableaux triés par numero/ordre
const SCHEDULE: [number, number, number][][] = [
  [[0,3,0],[1,4,1],[2,5,2]], // Tour 1
  [[0,4,3],[1,5,4],[2,3,5]], // Tour 2
  [[0,5,6],[1,3,7],[2,4,8]], // Tour 3
  [[1,5,0],[0,2,1],[3,4,2]], // Tour 4
  [[2,4,0],[3,5,1],[0,1,2]], // Tour 5
  [[1,3,3],[0,2,4],[4,5,5]], // Tour 6
  [[2,5,3],[3,4,4],[0,1,5]], // Tour 7
  [[3,4,6],[2,5,7],[0,1,8]], // Tour 8
  [[1,2,6],[0,4,7],[3,5,8]], // Tour 9
]

interface Matchup {
  teamA: Equipe
  teamB: Equipe
  epreuve: Epreuve
}

interface TourEntry {
  tourNum: number
  matchups: Matchup[]
}

function computeSchedule(equipes: Equipe[], epreuves: Epreuve[]): TourEntry[] {
  const sorted = [...equipes].filter((e) => e.numero !== null).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  const sortedEp = [...epreuves].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999))
  if (sorted.length !== 6 || sortedEp.length !== 9) return []
  return SCHEDULE.map((tour, t) => ({
    tourNum: t + 1,
    matchups: tour.map(([a, b, ep]) => ({
      teamA: sorted[a],
      teamB: sorted[b],
      epreuve: sortedEp[ep],
    })),
  }))
}

type View = 'general' | 'epreuve' | 'equipe'

export function RotationsTab() {
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [epreuves, setEpreuves] = useState<Epreuve[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('general')

  useEffect(() => {
    async function load() {
      const [{ data: eq }, { data: ep }] = await Promise.all([
        supabase.from('equipes').select('*').order('numero', { nullsFirst: false }),
        supabase.from('epreuves').select('*').order('ordre', { nullsFirst: false }),
      ])
      setEquipes(eq ?? [])
      setEpreuves(ep ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center pt-20"><p className="font-nunito text-purple-mid">Chargement...</p></div>

  const equipesWithNum = equipes.filter((e) => e.numero !== null)
  const sorted = [...equipesWithNum].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  const sortedEp = [...epreuves].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999))

  const warnings: string[] = []
  const equipesWithoutNum = equipes.filter((e) => e.numero === null)
  if (equipesWithoutNum.length > 0) warnings.push(`${equipesWithoutNum.length} équipe(s) sans numéro : ${equipesWithoutNum.map((e) => e.nom).join(', ')}`)
  if (equipesWithNum.length !== 6) warnings.push(`Le planning est prévu pour exactement 6 équipes (actuellement ${equipesWithNum.length}).`)
  if (epreuves.length !== 9) warnings.push(`Le planning est prévu pour exactement 9 épreuves (actuellement ${epreuves.length}).`)

  const schedule = computeSchedule(equipesWithNum, epreuves)

  const VIEWS: { key: View; label: string }[] = [
    { key: 'general', label: 'Général' },
    { key: 'epreuve', label: 'Par épreuve' },
    { key: 'equipe', label: 'Par équipe' },
  ]

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
      <div>
        <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Rotations</h2>
        {schedule.length > 0 && (
          <p className="font-nunito text-purple-mid text-sm mt-1">
            6 équipes · 9 épreuves · 3 matchs simultanés · chaque équipe passe une fois sur chaque épreuve
          </p>
        )}
      </div>

      {schedule.length > 0 && (
        <div className="flex gap-2">
          {VIEWS.map(({ key, label }) => (
            <button key={key} onClick={() => setView(key)}
              className={`flex-1 py-2 rounded-btn font-nunito font-bold text-sm transition-colors ${view === key ? 'bg-purple-dark text-white' : 'bg-white border border-border text-purple-dark active:bg-bg-main'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {warnings.map((w) => (
        <div key={w} className="bg-yellow-50 border border-yellow-200 rounded-card p-3">
          <p className="font-nunito text-yellow-700 text-sm">⚠️ {w}</p>
        </div>
      ))}

      {schedule.length === 0 && warnings.length === 0 && (
        <p className="font-nunito text-purple-mid text-sm text-center py-8">
          Configurez 6 équipes numérotées et 9 épreuves pour voir les rotations.
        </p>
      )}

      {/* VUE GÉNÉRALE */}
      {view === 'general' && schedule.map(({ tourNum, matchups }) => (
        <div key={tourNum} className="bg-white rounded-card border border-border overflow-hidden">
          <div className="px-4 py-2 bg-purple-dark">
            <p className="font-bangers text-yellow-fest text-lg tracking-wide">Tour {tourNum}</p>
          </div>
          <div className="divide-y divide-border">
            {matchups.map((m, s) => (
              <div key={s} className="px-4 py-3 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-mid/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-bangers text-purple-dark text-xs">{s + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-nunito font-bold text-purple-dark text-sm">
                    #{m.teamA.numero} {m.teamA.nom}
                    <span className="font-bangers text-pink-fluo mx-1">vs</span>
                    #{m.teamB.numero} {m.teamB.nom}
                  </p>
                  <p className="font-nunito text-purple-mid text-xs truncate">→ {m.epreuve.nom}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* VUE PAR ÉPREUVE */}
      {view === 'epreuve' && sortedEp.map((epreuve) => {
        const appearances = schedule.flatMap(({ tourNum, matchups }) => {
          const m = matchups.find((mu) => mu.epreuve.id === epreuve.id)
          return m ? [{ tourNum, teamA: m.teamA, teamB: m.teamB }] : []
        })
        return (
          <div key={epreuve.id} className="bg-white rounded-card border border-border overflow-hidden">
            <div className="px-4 py-2 bg-yellow-fest">
              <p className="font-bangers text-purple-dark text-lg tracking-wide truncate">{epreuve.nom}</p>
            </div>
            <div className="divide-y divide-border">
              {appearances.map(({ tourNum, teamA, teamB }) => (
                <div key={tourNum} className="px-4 py-3 flex items-center gap-3">
                  <span className="font-bangers text-purple-mid text-base w-16 flex-shrink-0">Tour {tourNum}</span>
                  <p className="font-nunito font-bold text-purple-dark text-sm">
                    #{teamA.numero} {teamA.nom}
                    <span className="font-bangers text-pink-fluo mx-1">vs</span>
                    #{teamB.numero} {teamB.nom}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* VUE PAR ÉQUIPE */}
      {view === 'equipe' && sorted.map((equipe) => {
        const teamSchedule = schedule.map(({ tourNum, matchups }) => {
          const m = matchups.find((mu) => mu.teamA.id === equipe.id || mu.teamB.id === equipe.id)!
          const adversaire = m.teamA.id === equipe.id ? m.teamB : m.teamA
          return { tourNum, epreuve: m.epreuve, adversaire }
        })
        return (
          <div key={equipe.id} className="bg-white rounded-card border border-border overflow-hidden">
            <div className="px-4 py-2 bg-pink-fluo">
              <p className="font-bangers text-white text-lg tracking-wide">#{equipe.numero} {equipe.nom}</p>
            </div>
            <div className="divide-y divide-border">
              {teamSchedule.map(({ tourNum, epreuve, adversaire }) => (
                <div key={tourNum} className="px-4 py-3 flex items-center gap-3">
                  <span className="font-bangers text-purple-mid text-base w-16 flex-shrink-0">Tour {tourNum}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-nunito text-xs text-purple-mid truncate">{epreuve.nom}</p>
                    <p className="font-nunito font-bold text-purple-dark text-sm">
                      vs #{adversaire.numero} {adversaire.nom}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
