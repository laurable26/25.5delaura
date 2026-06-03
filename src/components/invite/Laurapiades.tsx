import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Epreuve, Equipe, Profile, ResultatEpreuve, LaurapiadesSession, VoteChef } from '../../types'

const PLAN_ILE_URL = 'https://uenqoajlxkirszuifzcu.supabase.co/storage/v1/object/public/assets/plan/ile.jpg'

const SCHEDULE: [number, number, number][][] = [
  [[0,3,0],[1,4,1],[2,5,2]],
  [[0,4,3],[1,5,4],[2,3,5]],
  [[0,5,6],[1,3,7],[2,4,8]],
  [[1,5,0],[0,2,1],[3,4,2]],
  [[2,4,0],[3,5,1],[0,1,2]],
  [[1,3,3],[0,2,4],[4,5,5]],
  [[2,5,3],[3,4,4],[0,1,5]],
  [[3,4,6],[2,5,7],[0,1,8]],
  [[1,2,6],[0,4,7],[3,5,8]],
]

function nomEquipe(eq: Equipe): string {
  if (eq.nom_choisi) return eq.nom_choisi
  if (eq.numero !== null) return `#${eq.numero}`
  return eq.nom
}

interface LaurapiadesProps {
  profile: Profile
}

function computeTeamSchedule(monEquipe: Equipe, equipes: Equipe[], epreuves: Epreuve[]) {
  const sorted = [...equipes].filter((e) => e.numero !== null).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  const sortedEp = [...epreuves].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999))
  if (sorted.length !== 6 || sortedEp.length !== 9) return []
  const myIdx = sorted.findIndex((e) => e.id === monEquipe.id)
  if (myIdx < 0) return []
  return SCHEDULE.map((tour, t) => {
    const match = tour.find(([a, b]) => a === myIdx || b === myIdx)!
    const [a, b, ep] = match
    return { tourNum: t + 1, epreuve: sortedEp[ep], adversaire: sorted[a === myIdx ? b : a] }
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
  incoherent?: boolean
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
  const [session, setSession] = useState<LaurapiadesSession | null>(null)
  const [monEquipe, setMonEquipe] = useState<Equipe | null>(null)
  const [coequipiers, setCoequipiers] = useState<Profile[]>([])
  const [monVote, setMonVote] = useState<VoteChef | null>(null)
  const [localEquipeConfirmee, setLocalEquipeConfirmee] = useState(profile.laurapiades_equipe_confirmee)
  const [epreuves, setEpreuves] = useState<Epreuve[]>([])
  const [allEquipes, setAllEquipes] = useState<Equipe[]>([])
  const [resultats, setResultats] = useState<ResultatEpreuve[]>([])
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState(false)

  // Onboarding actions
  const [confirmingEquipe, setConfirmingEquipe] = useState(false)
  const [voting, setVoting] = useState(false)
  const [nomEquipeInput, setNomEquipeInput] = useState('')
  const [savingNom, setSavingNom] = useState(false)
  const [onboardingError, setOnboardingError] = useState<string | null>(null)

  // Result entry
  const [draftResultat, setDraftResultat] = useState<'victoire' | 'defaite' | null>(null)
  const [draftScore, setDraftScore] = useState('')
  const [confirmingResult, setConfirmingResult] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [incoherentWarning, setIncoherentWarning] = useState(false)
  const [resettingTour, setResettingTour] = useState(false)

  const isAdmin = profile.role === 'admin_jeux' || profile.role === 'admin_general'
  const isChef = monEquipe?.chef_id === profile.id

  const loadData = useCallback(async () => {
    const [{ data: sess }, { data: ep }, { data: eq }] = await Promise.all([
      supabase.from('laurapiades_sessions').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('epreuves').select('*').order('ordre', { nullsFirst: false }),
      supabase.from('equipes').select('*').order('numero', { nullsFirst: false }),
    ])
    setSession(sess ?? null)
    setEpreuves(ep ?? [])
    setAllEquipes(eq ?? [])

    const myEquipe = (eq ?? []).find((e: Equipe) => e.id === profile.equipe_id) ?? null
    setMonEquipe(myEquipe)

    if (myEquipe) {
      const [{ data: coEq }, { data: vote }] = await Promise.all([
        supabase.from('profiles').select('*').eq('equipe_id', myEquipe.id).order('prenom'),
        supabase.from('votes_chef').select('*').eq('equipe_id', myEquipe.id).eq('votant_id', profile.id).maybeSingle(),
      ])
      setCoequipiers(coEq ?? [])
      setMonVote(vote ?? null)

      if (sess?.tour_actif && sess.tour_actif > 0) {
        const { data: res } = await supabase
          .from('resultats_epreuves')
          .select('*')
          .eq('equipe_id', myEquipe.id)
        setResultats(res ?? [])
      }
    }

    setLoading(false)
  }, [profile.id, profile.equipe_id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime: session changes
  useEffect(() => {
    const ch = supabase.channel('laurapiades-session')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laurapiades_sessions' }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadData])

  // Realtime: my equipe changes (chef_id, nom_choisi)
  useEffect(() => {
    if (!profile.equipe_id) return
    const ch = supabase.channel('laurapiades-equipe')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipes', filter: `id=eq.${profile.equipe_id}` }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile.equipe_id, loadData])

  // Realtime: votes changes for my team
  useEffect(() => {
    if (!profile.equipe_id) return
    const ch = supabase.channel('laurapiades-votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes_chef', filter: `equipe_id=eq.${profile.equipe_id}` }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile.equipe_id, loadData])

  // Realtime: resultats changes
  useEffect(() => {
    if (!profile.equipe_id) return
    const ch = supabase.channel('laurapiades-resultats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultats_epreuves', filter: `equipe_id=eq.${profile.equipe_id}` }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile.equipe_id, loadData])

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="font-nunito text-purple-mid">Chargement...</p></div>

  // ── Determine onboarding step ──────────────────────────────────────────────
  const sessionStatut = session?.statut ?? 'attente'
  const tourActif = session?.tour_actif ?? 0
  const tourStatut = session?.tour_statut ?? null

  // Determine current onboarding "sub-step"
  type OnbStep = 'no_session' | 'no_equipe' | 'confirm_equipe' | 'vote_chef' | 'attente_vote' | 'nom_chef' | 'nom_attente' | 'attente_lancement' | 'jeu'
  let onbStep: OnbStep = 'no_session'

  if (sessionStatut === 'onboarding' || sessionStatut === 'en_cours' || sessionStatut === 'termine') {
    if (tourActif > 0) {
      onbStep = 'jeu'
    } else {
      // Onboarding phase
      if (!profile.equipe_id) {
        onbStep = 'no_equipe'
      } else if (!localEquipeConfirmee && !profile.laurapiades_equipe_confirmee) {
        onbStep = 'confirm_equipe'
      } else if (!monEquipe?.chef_id) {
        if (monVote) {
          onbStep = 'attente_vote'
        } else {
          onbStep = 'vote_chef'
        }
      } else if (!monEquipe?.nom_choisi) {
        onbStep = isChef ? 'nom_chef' : 'nom_attente'
      } else {
        onbStep = 'attente_lancement'
      }
    }
  }

  if (sessionStatut === 'termine' && tourActif > 0) {
    onbStep = 'jeu'
  }

  // ── Onboarding handlers ───────────────────────────────────────────────────
  async function handleConfirmEquipe() {
    setConfirmingEquipe(true)
    setOnboardingError(null)
    const { error } = await supabase.rpc('confirmer_equipe')
    if (error) {
      setOnboardingError(error.message)
    } else {
      setLocalEquipeConfirmee(true)
      await loadData()
    }
    setConfirmingEquipe(false)
  }

  async function handleVoterChef(candidatId: string) {
    setVoting(true)
    setOnboardingError(null)
    const { error } = await supabase.rpc('voter_chef', {
      p_equipe_id: profile.equipe_id,
      p_candidat_id: candidatId,
    })
    if (error) {
      setOnboardingError(error.message)
    } else {
      await loadData()
    }
    setVoting(false)
  }

  async function handleValiderNom() {
    const nom = nomEquipeInput.trim()
    if (!nom) return
    setSavingNom(true)
    setOnboardingError(null)
    const { error } = await supabase.rpc('valider_nom_equipe', {
      p_equipe_id: profile.equipe_id,
      p_nom: nom,
    })
    if (error) {
      setOnboardingError(error.message)
    } else {
      await loadData()
    }
    setSavingNom(false)
  }

  // ── Result handlers ───────────────────────────────────────────────────────
  const teamSchedule = monEquipe ? computeTeamSchedule(monEquipe, allEquipes, epreuves) : []

  async function handleConfirmResult() {
    if (!monEquipe || tourActif === 0) return
    const currentMatchup = teamSchedule.find((s) => s.tourNum === tourActif)
    if (!currentMatchup) return
    setSubmitting(true)
    setSubmitError(null)
    const { data, error } = await supabase.rpc('soumettre_resultat_equipe', {
      p_epreuve_id: currentMatchup.epreuve.id,
      p_equipe_id: monEquipe.id,
      p_resultat: draftResultat,
      p_score: draftScore ? parseInt(draftScore) : null,
      p_tour: tourActif,
    })
    if (error) {
      setSubmitError(error.message)
    } else {
      const result = data as { incoherent?: boolean } | null
      if (result?.incoherent) {
        setIncoherentWarning(true)
      }
      setConfirmingResult(false)
      setDraftResultat(null)
      setDraftScore('')
      await loadData()
    }
    setSubmitting(false)
  }

  async function handleAdminResetTour(tourNum: number) {
    if (!monEquipe) return
    const matchup = teamSchedule.find((s) => s.tourNum === tourNum)
    if (!matchup) return
    setResettingTour(true)
    await supabase.rpc('admin_reset_resultat_equipe', { p_epreuve_id: matchup.epreuve.id, p_equipe_id: monEquipe.id })
    await loadData()
    setResettingTour(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {showMap && <MapViewer onClose={() => setShowMap(false)} />}
      {confirmingResult && (
        <ConfirmDialog
          epreuve={teamSchedule.find((s) => s.tourNum === tourActif)!.epreuve}
          resultat={draftResultat}
          score={draftScore}
          onConfirm={handleConfirmResult}
          onCancel={() => setConfirmingResult(false)}
          submitting={submitting}
        />
      )}

      <div className="flex flex-col gap-4 px-4 pt-6 pb-10">
        {/* Plan shortcut */}
        <button onClick={() => setShowMap(true)} className="flex items-center gap-3 bg-white rounded-card border border-border px-4 py-3 active:bg-bg-main text-left">
          <span className="text-xl">🗺️</span>
          <span className="font-nunito font-bold text-purple-dark text-sm">Plan de l'île</span>
          <span className="ml-auto text-purple-mid">›</span>
        </button>

        {onbStep === 'no_session' && <SessionAttente />}
        {onbStep === 'no_equipe' && <NoEquipe />}
        {onbStep === 'confirm_equipe' && (
          <ConfirmEquipeStep
            equipeNom={monEquipe ? nomEquipe(monEquipe) : (profile.equipe_id ?? '?')}
            equipeNum={null}
            loading={confirmingEquipe}
            error={onboardingError}
            onConfirm={handleConfirmEquipe}
          />
        )}
        {onbStep === 'vote_chef' && (
          <VoteChefStep
            coequipiers={coequipiers}
            currentUserId={profile.id}
            loading={voting}
            error={onboardingError}
            onVote={handleVoterChef}
          />
        )}
        {onbStep === 'attente_vote' && (
          <AttenteVoteStep monVote={monVote} coequipiers={coequipiers} />
        )}
        {onbStep === 'nom_chef' && (
          <NomChefStep
            value={nomEquipeInput}
            onChange={setNomEquipeInput}
            loading={savingNom}
            error={onboardingError}
            onValidate={handleValiderNom}
          />
        )}
        {onbStep === 'nom_attente' && (
          <NomAttenteStep chefPrenom={coequipiers.find((c) => c.id === monEquipe?.chef_id)?.prenom} />
        )}
        {onbStep === 'attente_lancement' && (
          <AttenteLancementStep equipe={monEquipe} />
        )}
        {onbStep === 'jeu' && monEquipe && (
          <JeuView
            profile={profile}
            monEquipe={monEquipe}
            teamSchedule={teamSchedule}
            tourActif={tourActif!}
            tourStatut={tourStatut}
            sessionStatut={sessionStatut}
            resultats={resultats}
            draftResultat={draftResultat}
            draftScore={draftScore}
            onDraftResultat={setDraftResultat}
            onDraftScore={setDraftScore}
            onConfirmResult={() => setConfirmingResult(true)}
            submitError={submitError}
            incoherentWarning={incoherentWarning}
            onDismissIncoherent={() => setIncoherentWarning(false)}
            isAdmin={isAdmin}
            isChef={isChef}
            resettingTour={resettingTour}
            onAdminResetTour={handleAdminResetTour}
          />
        )}
      </div>
    </>
  )
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function SessionAttente() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <span className="text-5xl">⏳</span>
      <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Les Laurapiades</h2>
      <p className="font-nunito text-purple-mid text-sm">La partie va bientôt commencer.<br />Prépare-toi !</p>
    </div>
  )
}

function NoEquipe() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-card p-5 text-center flex flex-col gap-2">
      <span className="text-3xl">🤷</span>
      <p className="font-nunito text-yellow-700 text-sm">Tu n'es pas encore dans une équipe.<br />Demande à l'admin de t'assigner.</p>
    </div>
  )
}

function ConfirmEquipeStep({ equipeNom, equipeNum, loading, error, onConfirm }: {
  equipeNom: string; equipeNum: number | null; loading: boolean; error: string | null; onConfirm: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-card-lg border border-border p-6 flex flex-col items-center gap-4 text-center">
        <span className="text-4xl">👋</span>
        <div>
          <p className="font-nunito text-purple-mid text-sm">Tu es dans l'équipe</p>
          <p className="font-bangers text-purple-dark text-3xl tracking-wide mt-1">
            {equipeNum !== null ? `#${equipeNum} ` : ''}{equipeNom}
          </p>
        </div>
        <p className="font-nunito text-purple-mid text-sm">Confirme ta présence pour continuer.</p>
        {error && <p className="font-nunito text-red-600 text-xs">{error}</p>}
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full py-4 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-base disabled:opacity-50 active:opacity-80"
        >
          {loading ? 'Confirmation...' : "J'ai trouvé mon équipe ! ✓"}
        </button>
      </div>
    </div>
  )
}

function VoteChefStep({ coequipiers, currentUserId, loading, error, onVote }: {
  coequipiers: Profile[]; currentUserId: string; loading: boolean; error: string | null; onVote: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-card border border-border p-4 flex flex-col gap-3">
        <div className="text-center">
          <span className="text-3xl">🗳️</span>
          <h2 className="font-bangers text-purple-dark text-xl tracking-wide mt-1">Élisez votre chef·fe d'équipe</h2>
          <p className="font-nunito text-purple-mid text-xs mt-1">Vote pour la personne qui représentera votre équipe. En cas d'égalité, le sort décide.</p>
        </div>
        {error && <p className="font-nunito text-red-600 text-sm text-center">{error}</p>}
        <div className="flex flex-col gap-2 mt-2">
          {coequipiers.map((c) => (
            <button
              key={c.id}
              onClick={() => onVote(c.id)}
              disabled={loading}
              className="flex items-center gap-3 bg-bg-main border border-border rounded-btn px-4 py-3 disabled:opacity-50 active:bg-purple-dark/5 transition-colors"
            >
              {c.photo_url ? (
                <img src={c.photo_url} alt={c.prenom} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-mid/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-bangers text-purple-dark text-lg">{c.prenom[0]}</span>
                </div>
              )}
              <span className="font-nunito font-bold text-purple-dark text-sm flex-1 text-left">{c.prenom}</span>
              {c.id === currentUserId && <span className="font-nunito text-purple-mid text-xs">(toi)</span>}
              <span className="text-purple-mid">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function AttenteVoteStep({ monVote, coequipiers }: { monVote: VoteChef | null; coequipiers: Profile[] }) {
  const candidat = coequipiers.find((c) => c.id === monVote?.candidat_id)
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <span className="text-4xl">⏳</span>
      <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Vote enregistré !</h2>
      {candidat && (
        <p className="font-nunito text-purple-mid text-sm">
          Tu as voté pour <span className="font-bold text-purple-dark">{candidat.prenom}</span>.
        </p>
      )}
      <p className="font-nunito text-purple-mid text-sm">En attente des votes de tes coéquipier·es...</p>
      <div className="flex gap-1 mt-2">
        {[0,1,2].map((i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-purple-mid animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

function NomChefStep({ value, onChange, loading, error, onValidate }: {
  value: string; onChange: (v: string) => void; loading: boolean; error: string | null; onValidate: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-card border border-border p-5 flex flex-col gap-4">
        <div className="text-center">
          <span className="text-4xl">👑</span>
          <h2 className="font-bangers text-purple-dark text-2xl tracking-wide mt-1">Tu es chef·fe d'équipe !</h2>
          <p className="font-nunito text-purple-mid text-sm mt-1">Choisis le nom de guerre de ton équipe.</p>
        </div>
        {error && <p className="font-nunito text-red-600 text-sm text-center">{error}</p>}
        <input
          type="text"
          placeholder="Nom de l'équipe..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={40}
          className="w-full border border-border rounded-btn px-3 py-3 font-nunito text-purple-dark text-base bg-bg-main text-center"
        />
        <button
          onClick={onValidate}
          disabled={loading || !value.trim()}
          className="w-full py-3 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-base disabled:opacity-50 active:opacity-80"
        >
          {loading ? 'Enregistrement...' : 'Valider le nom ✓'}
        </button>
      </div>
    </div>
  )
}

function NomAttenteStep({ chefPrenom }: { chefPrenom?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <span className="text-4xl">✍️</span>
      <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Nom d'équipe</h2>
      <p className="font-nunito text-purple-mid text-sm">
        {chefPrenom
          ? <>C'est <span className="font-bold text-purple-dark">{chefPrenom}</span>, votre chef·fe, qui doit choisir le nom.</>
          : "C'est le·la chef·fe d'équipe qui doit choisir le nom."}
      </p>
      <div className="flex gap-1 mt-2">
        {[0,1,2].map((i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-purple-mid animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

function AttenteLancementStep({ equipe }: { equipe: Equipe | null }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <span className="text-5xl">🎉</span>
      <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">
        {equipe ? nomEquipe(equipe) : 'Votre équipe'}
      </h2>
      <p className="font-nunito text-purple-mid text-sm">Tout est prêt ! En attente que toutes les équipes finissent et que l'admin lance le Tour 1.</p>
      {equipe?.chef_id && (
        <div className="bg-white border border-border rounded-card px-4 py-3 flex items-center gap-2 mt-2">
          <span className="text-lg">👑</span>
          <p className="font-nunito text-purple-dark text-sm">Ton équipe a un·e chef·fe d'équipe !</p>
        </div>
      )}
    </div>
  )
}

interface JeuViewProps {
  profile: Profile
  monEquipe: Equipe
  teamSchedule: { tourNum: number; epreuve: Epreuve; adversaire: Equipe }[]
  tourActif: number
  tourStatut: string | null
  sessionStatut: string
  resultats: ResultatEpreuve[]
  draftResultat: 'victoire' | 'defaite' | null
  draftScore: string
  onDraftResultat: (r: 'victoire' | 'defaite' | null) => void
  onDraftScore: (s: string) => void
  onConfirmResult: () => void
  submitError: string | null
  incoherentWarning: boolean
  onDismissIncoherent: () => void
  isAdmin: boolean
  isChef: boolean
  resettingTour: boolean
  onAdminResetTour: (tour: number) => void
}

function JeuView({
  monEquipe, teamSchedule, tourActif, tourStatut, sessionStatut,
  resultats, draftResultat, draftScore, onDraftResultat, onDraftScore,
  onConfirmResult, submitError, incoherentWarning, onDismissIncoherent,
  isAdmin, isChef, resettingTour, onAdminResetTour,
}: JeuViewProps) {
  const gameOver = sessionStatut === 'termine'
  const attenteResultats = tourStatut === 'attente_resultats'

  return (
    <div className="flex flex-col gap-3">
      {/* Team header */}
      <div className="bg-white rounded-card border border-border px-4 py-3 flex items-center gap-3">
        <div>
          <p className="font-nunito text-purple-mid text-xs">Mon équipe</p>
          <p className="font-bangers text-purple-dark text-xl tracking-wide">
            {nomEquipe(monEquipe)}
          </p>
        </div>
      </div>

      {gameOver && (
        <div className="bg-yellow-fest/20 border border-yellow-fest rounded-card p-4 text-center">
          <p className="font-bangers text-purple-dark text-xl tracking-wide">🏆 Les Laurapiades sont terminées !</p>
        </div>
      )}

      {incoherentWarning && (
        <div className="bg-red-50 border border-red-300 rounded-card p-4 flex flex-col gap-2">
          <p className="font-bangers text-red-600 text-lg">⚠️ Résultat incohérent !</p>
          <p className="font-nunito text-red-600 text-sm">Les deux équipes ont déclaré le même résultat. Un malus de 10B a été appliqué à tous les membres des deux équipes.</p>
          <button onClick={onDismissIncoherent} className="self-end font-nunito text-red-600 text-xs underline">OK</button>
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-card p-3">
          <p className="font-nunito text-red-600 text-sm">{submitError}</p>
        </div>
      )}

      <h2 className="font-bangers text-purple-dark text-xl tracking-wide mt-2">Mon programme</h2>

      {teamSchedule.length === 0 && (
        <p className="font-nunito text-purple-mid text-sm text-center py-4">Planning non disponible (6 équipes et 9 épreuves requises).</p>
      )}

      {teamSchedule.map(({ tourNum, epreuve, adversaire }) => {
        const isCurrent = tourNum === tourActif
        const isPast = tourNum < tourActif
        const isFuture = tourNum > tourActif
        const resultatTour = resultats.find((r) => r.tour === tourNum && r.epreuve_id === epreuve.id)
        const confirme = resultatTour?.confirme ?? false
        const canEnterResult = isCurrent && attenteResultats && isChef && !confirme && !gameOver

        return (
          <div
            key={tourNum}
            className={`rounded-card border overflow-hidden transition-opacity ${
              isCurrent ? 'border-pink-fluo shadow-md bg-white' :
              isPast ? 'border-border bg-white opacity-70' :
              'border-border bg-bg-main opacity-50'
            }`}
          >
            {/* Tour header */}
            <div className={`px-4 py-2 flex items-center justify-between ${isCurrent ? 'bg-pink-fluo' : isPast ? 'bg-purple-dark' : 'bg-border'}`}>
              <p className={`font-bangers text-lg tracking-wide ${isCurrent ? 'text-white' : isPast ? 'text-yellow-fest' : 'text-purple-mid'}`}>
                Tour {tourNum}
              </p>
              {isCurrent && !gameOver && (
                <span className="font-nunito text-white text-xs font-bold px-2 py-0.5 bg-white/20 rounded-full">
                  {attenteResultats ? '📝 Résultats attendus' : '🔥 En cours'}
                </span>
              )}
              {isPast && <span className="font-nunito text-green-fluo text-xs">✓ Terminé</span>}
              {isFuture && <span className="font-nunito text-purple-mid text-xs">⏳ À venir</span>}
            </div>

            <div className="px-4 py-3 flex flex-col gap-1">
              <p className="font-nunito font-bold text-purple-dark text-sm">{epreuve.nom}</p>
              <p className="font-nunito text-purple-mid text-xs">
                vs <span className="font-bold text-purple-dark">{nomEquipe(adversaire)}</span>
              </p>
              <p className="font-nunito text-purple-mid text-xs">
                {epreuve.mode === 'gagnant_perdant'
                  ? `Victoire: ${epreuve.blerhams_victoire}B · Défaite: ${epreuve.blerhams_defaite}B`
                  : `${epreuve.blerhams_par_point}B / point`}
              </p>

              {/* Confirmed result */}
              {confirme && resultatTour && (
                <div className="mt-2 border-t border-border pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <div>
                      <p className="font-nunito font-bold text-purple-dark text-sm">
                        {epreuve.mode === 'gagnant_perdant'
                          ? (resultatTour.resultat === 'victoire' ? '🏆 Victoire' : '💔 Défaite')
                          : `${resultatTour.score} pts`}
                      </p>
                      <p className="font-nunito text-yellow-fest text-xs font-bold">+{resultatTour.blerhams_attribues} B</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => onAdminResetTour(tourNum)}
                      disabled={resettingTour}
                      className="px-3 py-1.5 rounded-btn bg-bg-main border border-border font-nunito text-purple-mid text-xs active:opacity-70 disabled:opacity-50"
                    >
                      {resettingTour ? '...' : '✏️ Modifier'}
                    </button>
                  )}
                </div>
              )}

              {/* Result entry form (chef only, current tour, attente_resultats) */}
              {canEnterResult && (
                <div className="mt-2 border-t border-border pt-3 flex flex-col gap-3">
                  <p className="font-nunito text-purple-dark text-sm font-bold">👑 Entrer le résultat :</p>
                  {epreuve.mode === 'gagnant_perdant' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onDraftResultat('victoire')}
                        className={`flex-1 py-3 rounded-btn border font-nunito font-bold text-sm transition-colors ${draftResultat === 'victoire' ? 'bg-yellow-fest border-yellow-fest text-purple-dark' : 'bg-bg-main border-border text-purple-dark'}`}
                      >
                        🏆 Victoire
                      </button>
                      <button
                        onClick={() => onDraftResultat('defaite')}
                        className={`flex-1 py-3 rounded-btn border font-nunito font-bold text-sm transition-colors ${draftResultat === 'defaite' ? 'bg-pink-fluo/20 border-pink-fluo text-pink-fluo' : 'bg-bg-main border-border text-purple-dark'}`}
                      >
                        💔 Défaite
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Nombre de points"
                        value={draftScore}
                        onChange={(e) => onDraftScore(e.target.value.replace(/[^0-9]/g, ''))}
                        className="flex-1 border border-border rounded-btn px-3 py-2.5 font-nunito text-purple-dark text-base bg-bg-main text-center"
                      />
                      <span className="font-nunito text-purple-mid text-sm">pts</span>
                    </div>
                  )}
                  {epreuve.mode === 'gagnant_perdant' && draftResultat && (
                    <p className="font-nunito text-center text-sm text-purple-mid">
                      → <span className="font-bold text-yellow-fest">
                        {draftResultat === 'victoire' ? epreuve.blerhams_victoire : epreuve.blerhams_defaite} B
                      </span> pour votre équipe
                    </p>
                  )}
                  {epreuve.mode === 'par_points' && draftScore && (
                    <p className="font-nunito text-center text-sm text-purple-mid">
                      → <span className="font-bold text-yellow-fest">
                        {(parseInt(draftScore) || 0) * (epreuve.blerhams_par_point ?? 0)} B
                      </span> pour votre équipe
                    </p>
                  )}
                  <button
                    onClick={onConfirmResult}
                    disabled={epreuve.mode === 'gagnant_perdant' ? !draftResultat : !draftScore}
                    className="w-full py-3 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-sm disabled:opacity-40 active:opacity-80"
                  >
                    Valider le résultat
                  </button>
                </div>
              )}

              {/* Show message to non-chef members when results are expected */}
              {isCurrent && attenteResultats && !isChef && !confirme && !gameOver && (
                <p className="mt-2 font-nunito text-purple-mid text-xs text-center border-t border-border pt-2">
                  En attente que le·la chef·fe d'équipe entre le résultat...
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
