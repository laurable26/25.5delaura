import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { Epreuve, Equipe, Profile } from '../../types'

const PLAN_ILE_URL = 'https://uenqoajlxkirszuifzcu.supabase.co/storage/v1/object/public/assets/plan/ile.jpg'

interface LaurapiadesProps {
  profile: Profile
}

function MapViewer({ onClose }: { onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const touchRef = useRef<{
    touches: Array<{ x: number; y: number }>
    startScale: number
    startOffset: { x: number; y: number }
  } | null>(null)
  const lastTapRef = useRef(0)

  function getDistAndCenter(t: React.TouchList) {
    const dx = t[0].clientX - t[1].clientX
    const dy = t[0].clientY - t[1].clientY
    return {
      dist: Math.hypot(dx, dy),
      cx: (t[0].clientX + t[1].clientX) / 2,
      cy: (t[0].clientY + t[1].clientY) / 2,
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    e.stopPropagation()
    touchRef.current = {
      touches: Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY })),
      startScale: scale,
      startOffset: { ...offset },
    }

    // Double-tap to toggle zoom
    if (e.touches.length === 1) {
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        if (scale > 1) {
          setScale(1)
          setOffset({ x: 0, y: 0 })
        } else {
          setScale(2.5)
        }
        touchRef.current = null
      }
      lastTapRef.current = now
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!touchRef.current) return

    if (e.touches.length === 1 && touchRef.current.touches.length === 1) {
      if (scale <= 1) return
      const dx = e.touches[0].clientX - touchRef.current.touches[0].x
      const dy = e.touches[0].clientY - touchRef.current.touches[0].y
      setOffset({
        x: touchRef.current.startOffset.x + dx,
        y: touchRef.current.startOffset.y + dy,
      })
    } else if (e.touches.length === 2 && touchRef.current.touches.length >= 2) {
      const start = touchRef.current
      const startDist = Math.hypot(
        start.touches[0].x - start.touches[1].x,
        start.touches[0].y - start.touches[1].y
      )
      const { dist: curDist } = getDistAndCenter(e.touches)
      const newScale = Math.min(6, Math.max(1, start.startScale * (curDist / startDist)))
      setScale(newScale)
      if (newScale <= 1) setOffset({ x: 0, y: 0 })
    }
  }

  function handleTouchEnd() {
    if (scale <= 1) setOffset({ x: 0, y: 0 })
    touchRef.current = null
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col select-none"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black bg-opacity-70 flex-shrink-0">
        <p className="font-bangers text-yellow-fest text-xl tracking-wide">🗺️ Plan de l'île</p>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-20 text-white font-bold"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* Zoomable image area */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={PLAN_ILE_URL}
          alt="Plan de l'île"
          draggable={false}
          style={{
            transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
            transformOrigin: 'center center',
            transition: scale === 1 ? 'transform 0.2s ease' : 'none',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            userSelect: 'none',
          }}
        />
      </div>

      <p className="text-center font-nunito text-white text-xs opacity-40 pb-3 flex-shrink-0">
        {scale > 1 ? 'Double-tap pour dézoomer' : 'Pince pour zoomer · Double-tap pour agrandir'}
      </p>
    </div>
  )
}

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

function computeTeamSchedule(
  monEquipe: Equipe,
  equipes: Equipe[],
  epreuves: Epreuve[],
): Array<{ tour: number; epreuve: Epreuve; adversaire: Equipe }> {
  const sorted = [...equipes]
    .filter((e) => e.numero !== null)
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  const N = sorted.length
  if (N < 2 || N % 2 !== 0 || monEquipe.numero === null) return []
  const sortedEp = [...epreuves].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999))
  if (sortedEp.length === 0) return []

  const myIdx = sorted.findIndex((e) => e.id === monEquipe.id)
  if (myIdx < 0) return []

  const rrRounds = computeRoundRobinRounds(N)
  return sortedEp.map((ep, t) => {
    const round = rrRounds[t % (N - 1)]
    const pair = round.find(([a, b]) => a === myIdx || b === myIdx)!
    const [a, b] = pair
    const adversaire = sorted[a === myIdx ? b : a]
    return { tour: t + 1, epreuve: ep, adversaire }
  })
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
        supabase.from('equipes').select('*').order('numero', { nullsFirst: false }),
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
  const teamSchedule = monEquipe ? computeTeamSchedule(monEquipe, equipes, epreuves) : []

  return (
    <>
      {showMap && <MapViewer onClose={() => setShowMap(false)} />}

      <div className="flex flex-col gap-6 px-4 pt-6 pb-10">
        {/* Mon équipe */}
        <div className="bg-white rounded-card-lg border border-border p-5 flex items-center gap-4">
          {monEquipe ? (
            <div>
              <p className="font-nunito text-purple-mid text-xs">Mon équipe</p>
              <div className="flex items-center gap-2">
                {monEquipe.numero !== null && (
                  <span className="font-bangers text-purple-mid text-xl">#{monEquipe.numero}</span>
                )}
                <p className="font-bangers text-purple-dark text-2xl tracking-wide leading-tight">{monEquipe.nom}</p>
              </div>
            </div>
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

        {/* Mon programme (si rotation configurée) */}
        {teamSchedule.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-bangers text-purple-dark text-xl tracking-wide">Mon programme</h2>
            {teamSchedule.map(({ tour, epreuve, adversaire }) => (
              <div
                key={tour}
                className={`bg-white rounded-card border p-4 flex flex-col gap-1 ${epreuve.statut === 'en_cours' ? 'border-pink-fluo shadow-md' : 'border-border'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bangers text-purple-mid text-base">Tour {tour}</span>
                  <span className={`text-xs font-nunito px-2 py-0.5 rounded-full ${epreuve.statut === 'en_cours' ? 'bg-pink-fluo text-white' : 'bg-bg-main text-purple-mid'}`}>
                    {statusLabel[epreuve.statut]}
                  </span>
                </div>
                <p className="font-nunito font-bold text-purple-dark">{epreuve.nom}</p>
                <p className="font-nunito text-purple-mid text-sm">
                  vs <span className="font-bold text-purple-dark">
                    {adversaire.numero !== null ? `#${adversaire.numero} ` : ''}{adversaire.nom}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Épreuves */}
        <div className="flex flex-col gap-3">
          <h2 className="font-bangers text-purple-dark text-xl tracking-wide">Toutes les épreuves</h2>
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
