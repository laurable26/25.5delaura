import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Equipe, Epreuve } from '../../../types'

interface Matchup {
  odd: Equipe
  even: Equipe
  epreuve: Epreuve
}

function computeSchedule(equipes: Equipe[], epreuves: Epreuve[]): Matchup[][] {
  const sorted = [...equipes]
    .filter((e) => e.numero !== null)
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  const N = sorted.length
  if (N < 2 || N % 2 !== 0) return []
  const half = N / 2
  const stations = [...epreuves]
    .sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999))
    .slice(0, half)
  if (stations.length < half) return []

  const schedule: Matchup[][] = []
  for (let r = 0; r < half; r++) {
    const round: Matchup[] = []
    for (let s = 0; s < half; s++) {
      const oddIdx = (s + r) % half
      const evenIdx = ((s - r) % half + half) % half
      round.push({
        odd: sorted[2 * oddIdx],
        even: sorted[2 * evenIdx + 1],
        epreuve: stations[s],
      })
    }
    schedule.push(round)
  }
  return schedule
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
    warnings.push('Le nombre d\'équipes numérotées doit être pair.')
  if (epreuves.length < half && N >= 2)
    warnings.push(`Il faut au moins ${half} épreuve(s) pour ${N} équipes (actuellement ${epreuves.length}).`)

  const schedule = computeSchedule(equipesWithNum, epreuves)

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
      <div>
        <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Rotations</h2>
        {N >= 2 && N % 2 === 0 && (
          <p className="font-nunito text-purple-mid text-sm mt-1">
            {N} équipes · {half} stations · {half} tours
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

      {schedule.map((round, r) => (
        <div key={r} className="bg-white rounded-card border border-border overflow-hidden">
          <div className="px-4 py-2 bg-purple-dark">
            <p className="font-bangers text-yellow-fest text-lg tracking-wide">Tour {r + 1}</p>
          </div>
          <div className="divide-y divide-border">
            {round.map((m, s) => (
              <div key={s} className="px-4 py-3 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-mid bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <span className="font-bangers text-purple-dark text-xs">{s + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-nunito text-xs text-purple-mid truncate">{m.epreuve.nom}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-nunito font-bold text-purple-dark text-sm">
                      #{m.odd.numero} {m.odd.nom}
                    </span>
                    <span className="font-bangers text-pink-fluo text-sm">vs</span>
                    <span className="font-nunito font-bold text-purple-dark text-sm">
                      #{m.even.numero} {m.even.nom}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
