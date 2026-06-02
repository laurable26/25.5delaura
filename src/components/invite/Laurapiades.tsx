import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { Epreuve, Equipe, Profile, ResultatEpreuve } from '../../types'

const PLAN_ILE_URL = 'https://uenqoajlxkirszuifzcu.supabase.co/storage/v1/object/public/assets/plan/ile.jpg'

interface LaurapiadesProps {
  profile: Profile
}

// Planning fixe : 6 équipes (indices 0-5 triés par numero) × 9 épreuves (indices 0-8 triés par ordre)
// Chaque tour : 3 matchs simultanés sur 3 épreuves différentes
// Chaque équipe passe exactement une fois sur chaque épreuve
// Format : [teamA_idx, teamB_idx, epreuve_idx]
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

function computeTeamSchedule(monEquipe: Equipe, equipes: Equipe[], epreuves: Epreuve[]) {
  const sorted = [...equipes].filter((e) => e.numero !== null).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  const sortedEp = [...epreuves].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999))
  if (sorted.length !== 6 || sortedEp.length !== 9) return []
  const myIdx = sorted.findIndex((e) => e.id === monEquipe.id)
  if (myIdx < 0) return []
  return SCHEDULE.map((tour, t) => {
    const match = tour.find(([a, b]) => a === myIdx || b === myIdx)!
    const [a, b, ep] = match
    return { tour: t + 1, epreuve: sortedEp[ep], adversaire: sorted[a === myIdx ? b : a] }
  })
}

function MapViewer({ onClose }: { onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const touchRef = useRef<{ touches: Array<{ x: number; y: number }>; startScale: number; startOffset: { x: number; y: number } } | null>(null)
  const lastTapRef = useRef(0)

  function handleTouchStart(e: React.TouchEvent) {
    e.stopPropagation()
    touchRef.current = { touches: Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY })), startScale: scale, startOffset: { ...offset } }
    if (e.touches.length === 1) {
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        if (scale > 1) { setScale(1); setOffset({ x: 0, y: 0 }) } else { setScale(2.5) }
        touchRef.current = null
      }
      lastTapRef.current = now
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!touchRef.current) return
    if (e.touches.length === 1 && touchRef.current.touches.length === 1) {
      if (scale <= 1) return
      setOffset({ x: touchRef.current.startOffset.x + e.touches[0].clientX - touchRef.current.touches[0].x, y: touchRef.current.startOffset.y + e.touches[0].clientY - touchRef.current.touches[0].y })
    } else if (e.touches.length === 2 && touchRef.current.touches.length >= 2) {
      const s = touchRef.current
      const startDist = Math.hypot(s.touches[0].x - s.touches[1].x, s.touches[0].y - s.touches[1].y)
      const curDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      const newScale = Math.min(6, Math.max(1, s.startScale * (curDist / startDist)))
      setScale(newScale)
      if (newScale <= 1) setOffset({ x: 0, y: 0 })
    }
  }

  function handleTouchEnd() { if (scale <= 1) setOffset({ x: 0, y: 0 }); touchRef.current = null }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex items-center justify-between px-4 py-3 bg-black bg-opacity-70 flex-shrink-0">
        <p className="font-bangers text-yellow-fest text-xl tracking-wide">🗺️ Plan de l'île</p>
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-20 text-white font-bold" onClick={onClose}>✕</button>
      </div>
      <div className="flex-1 overflow-hidden flex items-center justify-center" style={{ touchAction: 'none' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <img src={PLAN_ILE_URL} alt="Plan de l'île" draggable={false}
          style={{ transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`, transformOrigin: 'center center', transition: scale === 1 ? 'transform 0.2s ease' : 'none', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none' }}
        />
      </div>
      <p className="text-center font-nunito text-white text-xs opacity-40 pb-3 flex-shrink-0">
        {scale > 1 ? 'Double-tap pour dézoomer' : 'Pince pour zoomer · Double-tap pour agrandir'}
      </p>
    </div>
  )
}

interface ConfirmDialogProps {
  epreuve: Epreuve
  resultat: 'victoire' | 'defaite' | null
  score: string
  onConfirm: () => void
  onCancel: () => void
  submitting: boolean
}

function ConfirmDialog({ epreuve, resultat, score, onConfirm, onCancel, submitting }: ConfirmDialogProps) {
  const blerhams = epreuve.mode === 'gagnant_perdant'
    ? (resultat === 'victoire' ? epreuve.blerhams_victoire : epreuve.blerhams_defaite)
    : (parseInt(score) || 0) * (epreuve.blerhams_par_point ?? 0)
  const label = epreuve.mode === 'gagnant_perdant'
    ? (resultat === 'victoire' ? '🏆 Victoire' : '💔 Défaite')
    : `${score} pts`
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="w-full max-w-mobile bg-bg-main rounded-t-2xl p-6 flex flex-col gap-4">
        <div className="flex justify-center"><div className="w-10 h-1 rounded-full bg-border" /></div>
        <h3 className="font-bangers text-purple-dark text-2xl tracking-wide text-center">Confirmer le résultat ?</h3>
        <div className="bg-white rounded-card border border-border p-4 flex flex-col gap-1 text-center">
          <p className="font-nunito text-purple-mid text-sm">{epreuve.nom}</p>
          <p className="font-bangers text-purple-dark text-3xl tracking-wide">{label}</p>
          <p className="font-bangers text-yellow-fest text-xl">+{blerhams} B pour l'équipe</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-btn p-3">
          <p className="font-nunito text-yellow-700 text-xs text-center">⚠️ Une fois confirmé, impossible de modifier (sauf admin).</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={submitting} className="flex-1 py-3 rounded-btn bg-bg-main border border-border font-nunito font-bold text-purple-dark text-sm disabled:opacity-50">Annuler</button>
          <button onClick={onConfirm} disabled={submitting} className="flex-1 py-3 rounded-btn bg-green-fluo text-purple-dark font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80">
            {submitting ? 'Confirmation...' : '✓ Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Laurapiades({ profile }: LaurapiadesProps) {
  const [epreuves, setEpreuves] = useState<Epreuve[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState(false)
  const [confirmes, setConfigmes] = useState<Record<string, ResultatEpreuve>>({})
  const [draftResultat, setDraftResultat] = useState<Record<string, 'victoire' | 'defaite'>>({})
  const [draftScore, setDraftScore] = useState<Record<string, string>>({})
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)

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

  const monEquipe = equipes.find((e) => e.id === profile.equipe_id) ?? null

  useEffect(() => {
    if (!monEquipe) return
    supabase.from('resultats_epreuves').select('*').eq('equipe_id', monEquipe.id).eq('confirme', true)
      .then(({ data }) => {
        const map: Record<string, ResultatEpreuve> = {}
        for (const r of (data ?? [])) map[r.epreuve_id] = r
        setConfigmes(map)
      })
  }, [monEquipe?.id])

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="font-nunito text-purple-mid">Chargement...</p></div>

  const statusLabel: Record<string, string> = { a_venir: '⏳ À venir', en_cours: '🔥 En cours', termine: '✓ Terminée' }
  const teamSchedule = monEquipe ? computeTeamSchedule(monEquipe, equipes, epreuves) : []
  const isAdmin = profile.role === 'admin_jeux' || profile.role === 'admin_general'

  async function handleConfirm(epreuveId: string) {
    if (!monEquipe) return
    setSubmitting(true)
    setSubmitError(null)
    const { error } = await supabase.rpc('soumettre_resultat_equipe', {
      p_epreuve_id: epreuveId,
      p_equipe_id: monEquipe.id,
      p_resultat: draftResultat[epreuveId] ?? null,
      p_score: draftScore[epreuveId] ? parseInt(draftScore[epreuveId]) : null,
    })
    if (error) {
      setSubmitError(error.message)
    } else {
      const { data } = await supabase.from('resultats_epreuves').select('*').eq('equipe_id', monEquipe.id).eq('confirme', true)
      const map: Record<string, ResultatEpreuve> = {}
      for (const r of (data ?? [])) map[r.epreuve_id] = r
      setConfigmes(map)
      setConfirmingId(null)
    }
    setSubmitting(false)
  }

  async function handleAdminReset(epreuveId: string) {
    if (!monEquipe) return
    setResettingId(epreuveId)
    const { error } = await supabase.rpc('admin_reset_resultat_equipe', { p_epreuve_id: epreuveId, p_equipe_id: monEquipe.id })
    if (!error) {
      setConfigmes((prev) => { const n = { ...prev }; delete n[epreuveId]; return n })
      setDraftResultat((prev) => { const n = { ...prev }; delete n[epreuveId]; return n })
      setDraftScore((prev) => { const n = { ...prev }; delete n[epreuveId]; return n })
    }
    setResettingId(null)
  }

  const confirmingEpreuve = epreuves.find((e) => e.id === confirmingId)

  return (
    <>
      {showMap && <MapViewer onClose={() => setShowMap(false)} />}
      {confirmingId && confirmingEpreuve && (
        <ConfirmDialog
          epreuve={confirmingEpreuve}
          resultat={draftResultat[confirmingId] ?? null}
          score={draftScore[confirmingId] ?? ''}
          onConfirm={() => handleConfirm(confirmingId)}
          onCancel={() => setConfirmingId(null)}
          submitting={submitting}
        />
      )}

      <div className="flex flex-col gap-6 px-4 pt-6 pb-10">
        {/* Mon équipe */}
        <div className="bg-white rounded-card-lg border border-border p-5">
          {monEquipe ? (
            <div>
              <p className="font-nunito text-purple-mid text-xs">Mon équipe</p>
              <div className="flex items-center gap-2">
                {monEquipe.numero !== null && <span className="font-bangers text-purple-mid text-xl">#{monEquipe.numero}</span>}
                <p className="font-bangers text-purple-dark text-2xl tracking-wide leading-tight">{monEquipe.nom}</p>
              </div>
            </div>
          ) : (
            <p className="font-nunito text-purple-mid text-sm">Tu n'es pas encore dans une équipe.</p>
          )}
        </div>

        {/* Plan */}
        <button onClick={() => setShowMap(true)} className="w-full flex items-center gap-4 bg-white rounded-card border border-border px-4 py-4 active:bg-bg-main transition-colors text-left">
          <span className="text-2xl">🗺️</span>
          <span className="font-nunito font-bold text-purple-dark text-base">Plan de l'île</span>
          <span className="ml-auto text-purple-mid text-lg">›</span>
        </button>

        {/* Mon programme */}
        {teamSchedule.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-bangers text-purple-dark text-xl tracking-wide">Mon programme</h2>
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-card p-3">
                <p className="font-nunito text-red-600 text-sm">{submitError}</p>
              </div>
            )}
            {teamSchedule.map(({ tour, epreuve, adversaire }) => {
              const confirmed = confirmes[epreuve.id]
              const isActive = epreuve.statut === 'en_cours'
              const isTermine = epreuve.statut === 'termine'
              const showForm = (isActive || isTermine) && !confirmed
              const draft = draftResultat[epreuve.id]
              const score = draftScore[epreuve.id] ?? ''
              const blerhamsPreview = epreuve.mode === 'gagnant_perdant'
                ? (draft === 'victoire' ? epreuve.blerhams_victoire : draft === 'defaite' ? epreuve.blerhams_defaite : null)
                : (score ? (parseInt(score) || 0) * (epreuve.blerhams_par_point ?? 0) : null)

              return (
                <div key={tour} className={`bg-white rounded-card border p-4 flex flex-col gap-3 ${isActive ? 'border-pink-fluo shadow-md' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bangers text-purple-mid text-base">Tour {tour}</span>
                    <span className={`text-xs font-nunito px-2 py-0.5 rounded-full ${isActive ? 'bg-pink-fluo text-white' : 'bg-bg-main text-purple-mid'}`}>
                      {statusLabel[epreuve.statut]}
                    </span>
                  </div>
                  <p className="font-nunito font-bold text-purple-dark">{epreuve.nom}</p>
                  <p className="font-nunito text-purple-mid text-sm">
                    vs <span className="font-bold text-purple-dark">
                      {adversaire.numero !== null ? `#${adversaire.numero} ` : ''}{adversaire.nom}
                    </span>
                  </p>
                  <p className="font-nunito text-purple-mid text-xs">
                    {epreuve.mode === 'gagnant_perdant'
                      ? `Victoire: ${epreuve.blerhams_victoire}B · Défaite: ${epreuve.blerhams_defaite}B`
                      : `${epreuve.blerhams_par_point}B / point`}
                  </p>

                  {confirmed && (
                    <div className="border-t border-border pt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-lg">✓</span>
                        <div>
                          <p className="font-nunito font-bold text-purple-dark text-sm">
                            {epreuve.mode === 'gagnant_perdant'
                              ? (confirmed.resultat === 'victoire' ? '🏆 Victoire' : '💔 Défaite')
                              : `${confirmed.score} pts`}
                          </p>
                          <p className="font-nunito text-yellow-fest text-xs font-bold">+{confirmed.blerhams_attribues} B attribués</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleAdminReset(epreuve.id)} disabled={resettingId === epreuve.id}
                          className="px-3 py-1.5 rounded-btn bg-bg-main border border-border font-nunito text-purple-mid text-xs active:opacity-70 disabled:opacity-50">
                          {resettingId === epreuve.id ? '...' : '✏️ Modifier'}
                        </button>
                      )}
                    </div>
                  )}

                  {showForm && (
                    <div className="border-t border-border pt-3 flex flex-col gap-3">
                      <p className="font-nunito text-purple-dark text-sm font-bold">Votre résultat :</p>
                      {epreuve.mode === 'gagnant_perdant' ? (
                        <div className="flex gap-2">
                          <button onClick={() => setDraftResultat((p) => ({ ...p, [epreuve.id]: 'victoire' }))}
                            className={`flex-1 py-3 rounded-btn border font-nunito font-bold text-sm transition-colors ${draft === 'victoire' ? 'bg-yellow-fest border-yellow-fest text-purple-dark' : 'bg-bg-main border-border text-purple-dark'}`}>
                            🏆 Victoire
                          </button>
                          <button onClick={() => setDraftResultat((p) => ({ ...p, [epreuve.id]: 'defaite' }))}
                            className={`flex-1 py-3 rounded-btn border font-nunito font-bold text-sm transition-colors ${draft === 'defaite' ? 'bg-pink-fluo/20 border-pink-fluo text-pink-fluo' : 'bg-bg-main border-border text-purple-dark'}`}>
                            💔 Défaite
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <input type="text" inputMode="numeric" placeholder="Nombre de points"
                            value={score}
                            onChange={(e) => setDraftScore((p) => ({ ...p, [epreuve.id]: e.target.value.replace(/[^0-9]/g, '') }))}
                            className="flex-1 border border-border rounded-btn px-3 py-2.5 font-nunito text-purple-dark text-base bg-bg-main text-center"
                          />
                          <span className="font-nunito text-purple-mid text-sm">pts</span>
                        </div>
                      )}
                      {blerhamsPreview !== null && (
                        <p className="font-nunito text-center text-sm text-purple-mid">
                          → <span className="font-bold text-yellow-fest">{blerhamsPreview} B</span> pour votre équipe
                        </p>
                      )}
                      <button
                        onClick={() => setConfirmingId(epreuve.id)}
                        disabled={epreuve.mode === 'gagnant_perdant' ? !draft : !score}
                        className="w-full py-3 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-sm disabled:opacity-40 active:opacity-80">
                        Valider le résultat
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Épreuves */}
        <div className="flex flex-col gap-3">
          <h2 className="font-bangers text-purple-dark text-xl tracking-wide">Toutes les épreuves</h2>
          {epreuves.length === 0 && <p className="font-nunito text-purple-mid text-sm">Aucune épreuve pour l'instant.</p>}
          {[...epreuves].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999)).map((ep) => (
            <div key={ep.id} className={`bg-white rounded-card border border-border p-4 ${ep.statut === 'en_cours' ? 'border-pink-fluo shadow-md' : ''}`}>
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
