import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Equipe, Epreuve, Profile, ResultatEpreuve, LaurapiadesSession } from '../../../types'

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

type Tab = 'controle' | 'rotations' | 'resultats'

export function LaurapiadesAdmin() {
  const [tab, setTab] = useState<Tab>('controle')
  const [session, setSession] = useState<LaurapiadesSession | null>(null)
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [epreuves, setEpreuves] = useState<Epreuve[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [resultats, setResultats] = useState<ResultatEpreuve[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [{ data: sess }, { data: eq }, { data: ep }, { data: pr }, { data: res }] = await Promise.all([
      supabase.from('laurapiades_sessions').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('equipes').select('*').order('numero', { nullsFirst: false }),
      supabase.from('epreuves').select('*').order('ordre', { nullsFirst: false }),
      supabase.from('profiles').select('*').order('prenom'),
      supabase.from('resultats_epreuves').select('*'),
    ])
    setSession(sess ?? null)
    setEquipes(eq ?? [])
    setEpreuves(ep ?? [])
    setProfiles(pr ?? [])
    setResultats(res ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function rpc(fn: string, params?: Record<string, unknown>) {
    setActing(true)
    setError(null)
    const { error: e } = await supabase.rpc(fn, params ?? {})
    if (e) setError(e.message)
    else await loadData()
    setActing(false)
  }

  if (loading) return <div className="flex items-center justify-center pt-20"><p className="font-nunito text-purple-mid">Chargement...</p></div>

  const TABS: { key: Tab; label: string }[] = [
    { key: 'controle', label: 'Contrôle' },
    { key: 'rotations', label: 'Rotations' },
    { key: 'resultats', label: 'Résultats' },
  ]

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
      <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Laurapiades</h2>

      <div className="flex gap-2">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-btn font-nunito font-bold text-sm transition-colors ${tab === key ? 'bg-purple-dark text-white' : 'bg-white border border-border text-purple-dark'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-card p-3">
          <p className="font-nunito text-red-600 text-sm">{error}</p>
        </div>
      )}

      {tab === 'controle' && (
        <ControleTab
          session={session}
          equipes={equipes}
          profiles={profiles}
          acting={acting}
          onRpc={rpc}
        />
      )}
      {tab === 'rotations' && (
        <RotationsView equipes={equipes} epreuves={epreuves} />
      )}
      {tab === 'resultats' && (
        <ResultatsView
          session={session}
          equipes={equipes}
          epreuves={epreuves}
          resultats={resultats}
          acting={acting}
          onRpc={rpc}
        />
      )}
    </div>
  )
}

// ── Contrôle ────────────────────────────────────────────────────────────────

function ControleTab({ session, equipes, profiles, acting, onRpc }: {
  session: LaurapiadesSession | null
  equipes: Equipe[]
  profiles: Profile[]
  acting: boolean
  onRpc: (fn: string, params?: Record<string, unknown>) => void
}) {
  const statut = session?.statut ?? null
  const tourActif = session?.tour_actif ?? 0
  const tourStatut = session?.tour_statut ?? 'en_cours'

  // Onboarding progress per team
  const onboardingStatus = equipes.map((eq) => {
    const members = profiles.filter((p) => p.equipe_id === eq.id)
    const confirmed = members.filter((p) => p.laurapiades_equipe_confirmee).length
    const hasChef = !!eq.chef_id
    const hasNom = !!eq.nom_choisi
    return { equipe: eq, members, confirmed, hasChef, hasNom, ready: hasNom }
  })
  const allReady = onboardingStatus.length > 0 && onboardingStatus.every((s) => s.ready)

  return (
    <div className="flex flex-col gap-4">
      {/* Session control */}
      <div className="bg-white rounded-card border border-border p-4 flex flex-col gap-3">
        <p className="font-bangers text-purple-dark text-lg tracking-wide">Session</p>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statut === 'en_cours' ? 'bg-green-500' : statut === 'termine' ? 'bg-purple-mid' : 'bg-yellow-fest'}`} />
          <span className="font-nunito text-purple-dark text-sm font-bold">
            {statut === null ? 'Pas de session' : statut === 'en_cours' ? 'En cours' : statut === 'termine' ? 'Terminée' : 'Attente'}
          </span>
        </div>

        {statut === null && (
          <button onClick={() => onRpc('demarrer_laurapiades')} disabled={acting}
            className="py-3 rounded-btn bg-green-fluo text-purple-dark font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80">
            {acting ? '...' : '🚀 Démarrer les Laurapiades'}
          </button>
        )}
        {statut === 'onboarding' && (
          <button
            onClick={() => onRpc('lancer_tour', { p_tour: 1 })}
            disabled={acting || !allReady}
            className="py-3 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80"
          >
            {acting ? '...' : !allReady ? '⏳ En attente des équipes...' : '▶️ Lancer le Tour 1'}
          </button>
        )}
        {statut === 'en_cours' && tourActif > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-bg-main rounded-btn px-3 py-2">
              <span className="font-nunito text-purple-dark text-sm">Tour actif</span>
              <span className="font-bangers text-purple-dark text-xl">Tour {tourActif}</span>
            </div>
            <div className="flex items-center justify-between bg-bg-main rounded-btn px-3 py-2">
              <span className="font-nunito text-purple-dark text-sm">Statut</span>
              <span className={`font-nunito text-sm font-bold ${tourStatut === 'en_cours' ? 'text-pink-fluo' : 'text-yellow-600'}`}>
                {tourStatut === 'en_cours' ? '🔥 En jeu' : '📝 Résultats attendus'}
              </span>
            </div>
            {tourStatut === 'en_cours' && (
              <button onClick={() => onRpc('terminer_tour', { p_tour: tourActif })} disabled={acting}
                className="py-3 rounded-btn bg-yellow-fest text-purple-dark font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80">
                {acting ? '...' : '⏹️ Terminer le Tour ' + tourActif + ' (demander les résultats)'}
              </button>
            )}
            {tourStatut === 'attente_resultats' && tourActif < 9 && (
              <button onClick={() => onRpc('lancer_tour', { p_tour: tourActif + 1 })} disabled={acting}
                className="py-3 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80">
                {acting ? '...' : `▶️ Lancer le Tour ${tourActif + 1}`}
              </button>
            )}
            {tourStatut === 'attente_resultats' && tourActif === 9 && (
              <button onClick={() => onRpc('terminer_laurapiades')} disabled={acting}
                className="py-3 rounded-btn bg-purple-dark text-white font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80">
                {acting ? '...' : '🏆 Terminer les Laurapiades'}
              </button>
            )}
          </div>
        )}
        {statut === 'termine' && (
          <p className="font-nunito text-purple-mid text-sm text-center">Les Laurapiades sont terminées !</p>
        )}
      </div>

      {/* Onboarding status */}
      {statut === 'onboarding' && (
        <div className="flex flex-col gap-3">
          <p className="font-bangers text-purple-dark text-lg tracking-wide">Progression onboarding</p>
          {onboardingStatus.map(({ equipe, members, confirmed, hasChef, hasNom }) => (
            <div key={equipe.id} className="bg-white rounded-card border border-border p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="font-nunito font-bold text-purple-dark text-sm">
                  {equipe.nom_choisi ?? equipe.nom}
                  {equipe.numero !== null && <span className="text-purple-mid font-normal"> #{equipe.numero}</span>}
                </p>
                {hasNom
                  ? <span className="text-green-600 text-sm font-bold">✓ Prêt</span>
                  : <span className="text-yellow-600 text-xs font-nunito">En cours...</span>
                }
              </div>
              <div className="flex gap-4 text-xs font-nunito text-purple-mid">
                <span>{confirmed}/{members.length} confirmé{members.length > 1 ? 's' : ''}</span>
                <span>{hasChef ? '✓ Chef élu' : '⏳ Vote chef'}</span>
                <span>{hasNom ? `✓ "${equipe.nom_choisi}"` : '⏳ Nom'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Rotations ────────────────────────────────────────────────────────────────

function RotationsView({ equipes, epreuves }: { equipes: Equipe[]; epreuves: Epreuve[] }) {
  const sorted = [...equipes].filter((e) => e.numero !== null).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  const sortedEp = [...epreuves].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999))

  if (sorted.length !== 6 || sortedEp.length !== 9) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-card p-3">
        <p className="font-nunito text-yellow-700 text-sm">⚠️ Planning disponible avec exactement 6 équipes numérotées et 9 épreuves (actuellement {sorted.length} équipes, {sortedEp.length} épreuves).</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {SCHEDULE.map((tour, t) => (
        <div key={t} className="bg-white rounded-card border border-border overflow-hidden">
          <div className="px-4 py-2 bg-purple-dark">
            <p className="font-bangers text-yellow-fest text-lg tracking-wide">Tour {t + 1}</p>
          </div>
          <div className="divide-y divide-border">
            {tour.map(([a, b, ep], s) => (
              <div key={s} className="px-4 py-3 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-mid/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-bangers text-purple-dark text-xs">{s + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-nunito font-bold text-purple-dark text-sm">
                    {sorted[a].nom_choisi ?? sorted[a].nom}
                    <span className="font-bangers text-pink-fluo mx-1">vs</span>
                    {sorted[b].nom_choisi ?? sorted[b].nom}
                  </p>
                  <p className="font-nunito text-purple-mid text-xs truncate">→ {sortedEp[ep].nom}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Résultats ────────────────────────────────────────────────────────────────

function ResultatsView({ session, equipes, epreuves, resultats, acting, onRpc }: {
  session: LaurapiadesSession | null
  equipes: Equipe[]
  epreuves: Epreuve[]
  resultats: ResultatEpreuve[]
  acting: boolean
  onRpc: (fn: string, params?: Record<string, unknown>) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editResultat, setEditResultat] = useState<'victoire' | 'defaite' | null>(null)
  const [editScore, setEditScore] = useState('')
  const tourActif = session?.tour_actif ?? 0
  const sorted = [...equipes].filter((e) => e.numero !== null).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  const sortedEp = [...epreuves].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999))

  if (sorted.length !== 6 || sortedEp.length !== 9) {
    return <p className="font-nunito text-purple-mid text-sm text-center py-8">Configurez 6 équipes et 9 épreuves.</p>
  }

  const toursToShow = tourActif > 0 ? tourActif : 0

  async function handleAdminCorrect(equipeId: string, epreuveId: string, tour: number) {
    await onRpc('admin_corriger_resultat', {
      p_equipe_id: equipeId,
      p_epreuve_id: epreuveId,
      p_tour: tour,
      p_resultat: editResultat,
      p_score: editScore ? parseInt(editScore) : null,
    })
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {toursToShow === 0 && <p className="font-nunito text-purple-mid text-sm text-center py-8">Aucun tour lancé.</p>}
      {Array.from({ length: toursToShow }, (_, i) => i + 1).map((tourNum) => {
        const matchups = SCHEDULE[tourNum - 1]
        return (
          <div key={tourNum} className="bg-white rounded-card border border-border overflow-hidden">
            <div className="px-4 py-2 bg-purple-dark flex items-center justify-between">
              <p className="font-bangers text-yellow-fest text-lg tracking-wide">Tour {tourNum}</p>
            </div>
            <div className="divide-y divide-border">
              {matchups.map(([a, b, ep], s) => {
                const epreuve = sortedEp[ep]
                const eqA = sorted[a]
                const eqB = sorted[b]
                const resA = resultats.find((r) => r.equipe_id === eqA.id && r.epreuve_id === epreuve.id && r.tour === tourNum)
                const resB = resultats.find((r) => r.equipe_id === eqB.id && r.epreuve_id === epreuve.id && r.tour === tourNum)

                return (
                  <div key={s} className="px-4 py-3 flex flex-col gap-2">
                    <p className="font-nunito text-purple-mid text-xs">{epreuve.nom}</p>
                    <div className="flex gap-2">
                      {[{ eq: eqA, res: resA }, { eq: eqB, res: resB }].map(({ eq, res }) => {
                        const uid = `${tourNum}-${eq.id}`
                        const isEditing = editingId === uid
                        return (
                          <div key={eq.id} className="flex-1 bg-bg-main rounded-btn p-2 flex flex-col gap-1">
                            <p className="font-nunito font-bold text-purple-dark text-xs truncate">{eq.nom_choisi ?? eq.nom}</p>
                            {res?.confirme ? (
                              isEditing ? (
                                <div className="flex flex-col gap-1">
                                  {epreuve.mode === 'gagnant_perdant' ? (
                                    <div className="flex gap-1">
                                      {(['victoire', 'defaite'] as const).map((r) => (
                                        <button key={r} onClick={() => setEditResultat(r)}
                                          className={`flex-1 text-xs py-1 rounded font-nunito font-bold border transition-colors ${editResultat === r ? 'bg-yellow-fest border-yellow-fest text-purple-dark' : 'bg-white border-border text-purple-dark'}`}>
                                          {r === 'victoire' ? '🏆' : '💔'}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <input type="text" inputMode="numeric" value={editScore}
                                      onChange={(e) => setEditScore(e.target.value.replace(/[^0-9]/g, ''))}
                                      className="w-full border border-border rounded px-2 py-1 text-xs font-nunito text-purple-dark bg-white text-center" placeholder="pts" />
                                  )}
                                  <div className="flex gap-1">
                                    <button onClick={() => setEditingId(null)} className="flex-1 text-xs py-1 rounded bg-white border border-border font-nunito text-purple-mid">✕</button>
                                    <button
                                      onClick={() => handleAdminCorrect(eq.id, epreuve.id, tourNum)}
                                      disabled={acting}
                                      className="flex-1 text-xs py-1 rounded bg-green-fluo text-purple-dark font-nunito font-bold disabled:opacity-50"
                                    >✓</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <p className="font-nunito text-purple-dark text-xs font-bold">
                                    {epreuve.mode === 'gagnant_perdant'
                                      ? (res.resultat === 'victoire' ? '🏆 V' : '💔 D')
                                      : `${res.score} pts`}
                                    <span className="text-yellow-fest ml-1">+{res.blerhams_attribues}B</span>
                                  </p>
                                  <button
                                    onClick={() => {
                                      setEditingId(uid)
                                      setEditResultat(res.resultat)
                                      setEditScore(res.score?.toString() ?? '')
                                    }}
                                    className="text-purple-mid text-xs underline"
                                  >✏️</button>
                                </div>
                              )
                            ) : (
                              <p className="font-nunito text-purple-mid text-xs italic">En attente...</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
