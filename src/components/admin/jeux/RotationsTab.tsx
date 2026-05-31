import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Epreuve, Equipe } from '../../../types'

interface Matchup {
  teamA: Equipe
  teamB: Equipe
}

interface TourEntry {
  tourNum: number
  epreuve: Epreuve
  matchups: Matchup[]
}

// Circle-method 1-factorization of K_N (N even)
// Returns N-1 perfect matchings, each covering all N teams
function computeRoundRobinRounds(N: number): [number, number][][] {
  const rounds: [number, number][][] = []
  const rotate = Array.from({ length: N - 1 }, (_, i) => i)
  const fixed = N - 1
  for (let r = 0; r < N - 1; r++) {
    const round: [number, number][] = []
    round.push([fixed, rotate[r]])
    for (let i = 1; i < N / 2; i++) {
      round.push([rotate[(r + i) % (N - 1)], rotate[(r - i + N - 1) % (N - 1)]])
    }
    rounds.push(round)
  }
  return rounds
}

function computeSchedule(equipes: Equipe[], epreuves: Epreuve[]): TourEntry[] {
  const sorted = [...equipes]
    .filter((e) => e.numero !== null)
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  const N = sorted.length
  if (N < 2 || N % 2 !== 0) return []
  const sortedEp = [...epreuves].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999))
  if (sortedEp.length === 0) return []

  const rrRounds = computeRoundRobinRounds(N)
  return sortedEp.map((ep, t) => ({
    tourNum: t + 1,
    epreuve: ep,
    matchups: rrRounds[t % (N - 1)].map(([a, b]) => ({
      teamA: sorted[a],
      teamB: sorted[b],
    })),
  }))
}

export function RotationsTab() {
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [epreuves, setEpreuves] = useState<Epreuve[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <p className="font-nunito text-purple-mid">Chargement...</p>
      </div>
    )
  }

  const equipesWithNum = equipes.filter((e) => e.numero !== null)
  const N = equipesWithNum.length
  const half = N / 2

  const warnings: string[] = []
  const equipesWithoutNum = equipes.filter((e) => e.numero === null)
  if (equipesWithoutNum.length > 0)
    warnings.push(`${equipesWithoutNum.length} équipe(s) sans numéro : ${equipesWithoutNum.map((e) => e.nom).join(', ')}`)
  if (N > 0 && N % 2 !== 0)
    warnings.push("Le nombre d'équipes numérotées doit être pair.")

  const schedule = computeSchedule(equipesWithNum, epreuves)

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
      <div>
        <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Rotations</h2>
        {N >= 2 && N % 2 === 0 && epreuves.length > 0 && (
          <p className="font-nunito text-purple-mid text-sm mt-1">
            {N} équipes · {epreuves.length} épreuves · {half} matchs simultanés · toutes les équipes actives à chaque tour
          </p>
        )}
      </div>

      {warnings.map((w) => (
        <div key={w} className="bg-yellow-50 border border-yellow-200 rounded-card p-3">
          <p className="font-nunito text-yellow-700 text-sm">⚠️ {w}</p>
        </div>
      ))}

      {schedule.length === 0 && warnings.length === 0 && (
        <p className="font-nunito text-purple-mid text-sm text-center py-8">
          Configurez les numéros d'équipe et les épreuves pour voir les rotations.
        </p>
      )}

      {schedule.map(({ tourNum, epreuve, matchups }) => (
        <div key={tourNum} className="bg-white rounded-card border border-border overflow-hidden">
          <div className="px-4 py-2 bg-purple-dark">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-bangers text-yellow-fest text-lg tracking-wide">Tour {tourNum}</p>
              <p className="font-nunito text-yellow-fest text-xs opacity-80 truncate">{epreuve.nom}</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {matchups.map((m, s) => (
              <div key={s} className="px-4 py-3 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-mid bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <span className="font-bangers text-purple-dark text-xs">{s + 1}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="font-nunito font-bold text-purple-dark text-sm">
                    #{m.teamA.numero} {m.teamA.nom}
                  </span>
                  <span className="font-bangers text-pink-fluo text-sm">vs</span>
                  <span className="font-nunito font-bold text-purple-dark text-sm">
                    #{m.teamB.numero} {m.teamB.nom}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
