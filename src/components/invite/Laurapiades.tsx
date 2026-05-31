import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { Epreuve, Equipe, Profile } from '../../types'

const PLAN_ILE_URL = 'https://uenqoajlxkirszuifzcu.supabase.co/storage/v1/object/public/assets/plan/ile.jpeg'

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
      {showMap && <MapViewer onClose={() => setShowMap(false)} />}

      <div className="flex flex-col gap-6 px-4 pt-6 pb-10">
        {/* Mon équipe */}
        <div className="bg-white rounded-card-lg border border-border p-5 flex items-center gap-4">
          {monEquipe ? (
            <div>
              <p className="font-nunito text-purple-mid text-xs">Mon équipe</p>
              <p className="font-bangers text-purple-dark text-2xl tracking-wide leading-tight">{monEquipe.nom}</p>
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
