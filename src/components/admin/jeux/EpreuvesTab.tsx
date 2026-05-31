import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Epreuve, EpreuveMode, EpreuveStatut, Event, Equipe } from '../../../types'

const STATUS_NEXT: Record<EpreuveStatut, EpreuveStatut | null> = {
  a_venir: 'en_cours',
  en_cours: 'termine',
  termine: null,
}

const STATUS_LABELS: Record<EpreuveStatut, string> = {
  a_venir: '⏳ À venir',
  en_cours: '🔥 En cours',
  termine: '✓ Terminée',
}

interface ResultInput {
  equipeId: string
  score: string
  winner: boolean
}

export function EpreuvesTab() {
  const [events, setEvents] = useState<Event[]>([])
  const [epreuves, setEpreuves] = useState<Epreuve[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFormForEvent, setShowFormForEvent] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  // Form state
  const [formNom, setFormNom] = useState('')
  const [formMode, setFormMode] = useState<EpreuveMode>('gagnant_perdant')
  const [formVictoire, setFormVictoire] = useState('100')
  const [formDefaite, setFormDefaite] = useState('0')
  const [formParPoint, setFormParPoint] = useState('10')
  const [formOrdre, setFormOrdre] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Result state per epreuve
  const [resultInputs, setResultInputs] = useState<Record<string, ResultInput[]>>({})
  const [validatingResult, setValidatingResult] = useState<string | null>(null)
  const [winnerEquipeId, setWinnerEquipeId] = useState<Record<string, string>>({})

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: evData }, { data: epData }, { data: eqData }] = await Promise.all([
      supabase.from('events').select('*').order('ordre', { nullsFirst: false }),
      supabase.from('epreuves').select('*').order('ordre', { nullsFirst: false }),
      supabase.from('equipes').select('*').order('nom'),
    ])
    setEvents(evData ?? [])
    setEpreuves(epData ?? [])
    setEquipes(eqData ?? [])
    setLoading(false)
  }

  async function handleCreateEpreuve(eventId: string) {
    if (!formNom.trim()) return
    setSubmitting(true)
    setError(null)
    const { error: insertError } = await supabase.from('epreuves').insert({
      event_id: eventId,
      nom: formNom.trim(),
      mode: formMode,
      blerhams_victoire: formMode === 'gagnant_perdant' ? parseInt(formVictoire) : 0,
      blerhams_defaite: formMode === 'gagnant_perdant' ? parseInt(formDefaite) : 0,
      blerhams_par_point: formMode === 'par_points' ? parseInt(formParPoint) : null,
      statut: 'a_venir',
      ordre: formOrdre ? parseInt(formOrdre) : null,
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setFormNom('')
      setFormMode('gagnant_perdant')
      setFormVictoire('100')
      setFormDefaite('0')
      setFormParPoint('10')
      setFormOrdre('')
      setShowFormForEvent(null)
      await load()
    }
    setSubmitting(false)
  }

  async function handleReorder(epreuve: Epreuve, direction: 'up' | 'down') {
    const eventEpreuves = epreuves
      .filter((e) => e.event_id === epreuve.event_id)
      .sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999))
    const idx = eventEpreuves.findIndex((e) => e.id === epreuve.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= eventEpreuves.length) return

    const other = eventEpreuves[swapIdx]
    const newOrdreA = other.ordre ?? swapIdx + 1
    const newOrdreB = epreuve.ordre ?? idx + 1

    await Promise.all([
      supabase.from('epreuves').update({ ordre: newOrdreA }).eq('id', epreuve.id),
      supabase.from('epreuves').update({ ordre: newOrdreB }).eq('id', other.id),
    ])
    setEpreuves((prev) =>
      prev.map((e) => {
        if (e.id === epreuve.id) return { ...e, ordre: newOrdreA }
        if (e.id === other.id) return { ...e, ordre: newOrdreB }
        return e
      })
    )
  }

  async function handleStatusChange(epreuve: Epreuve) {
    const next = STATUS_NEXT[epreuve.statut]
    if (!next) return
    setUpdating(epreuve.id)
    const { error: updateError } = await supabase
      .from('epreuves')
      .update({ statut: next })
      .eq('id', epreuve.id)
    if (updateError) {
      setError(updateError.message)
    } else {
      setEpreuves((prev) =>
        prev.map((e) => (e.id === epreuve.id ? { ...e, statut: next } : e))
      )
      // Initialize result inputs when going en_cours
      if (next === 'en_cours') {
        setResultInputs((prev) => ({
          ...prev,
          [epreuve.id]: equipes.map((eq) => ({
            equipeId: eq.id,
            score: '0',
            winner: false,
          })),
        }))
      }
    }
    setUpdating(null)
  }

  async function handleValiderResultatGagnantPerdant(epreuve: Epreuve) {
    const winnerId = winnerEquipeId[epreuve.id]
    if (!winnerId) {
      setError('Sélectionne une équipe gagnante')
      return
    }
    setValidatingResult(epreuve.id)
    setError(null)

    const promises = equipes.map((eq) => {
      const isWinner = eq.id === winnerId
      return supabase.rpc('attribuer_blerhams_epreuve', {
        p_epreuve_id: epreuve.id,
        p_equipe_id: eq.id,
        p_resultat: isWinner ? 'victoire' : 'defaite',
        p_score: null,
        p_blerhams: isWinner ? epreuve.blerhams_victoire : epreuve.blerhams_defaite,
      })
    })

    const results = await Promise.all(promises)
    const firstError = results.find((r) => r.error)
    if (firstError?.error) {
      setError(firstError.error.message)
    }
    setValidatingResult(null)
  }

  async function handleValiderResultatParPoints(epreuve: Epreuve) {
    const inputs = resultInputs[epreuve.id] ?? []
    setValidatingResult(epreuve.id)
    setError(null)

    const promises = inputs.map((input) => {
      const score = parseInt(input.score) || 0
      const blerhams = score * (epreuve.blerhams_par_point ?? 0)
      return supabase.rpc('attribuer_blerhams_epreuve', {
        p_epreuve_id: epreuve.id,
        p_equipe_id: input.equipeId,
        p_resultat: null,
        p_score: score,
        p_blerhams: blerhams,
      })
    })

    const results = await Promise.all(promises)
    const firstError = results.find((r) => r.error)
    if (firstError?.error) {
      setError(firstError.error.message)
    }
    setValidatingResult(null)
  }

  function updateScore(epreuveId: string, equipeId: string, score: string) {
    setResultInputs((prev) => ({
      ...prev,
      [epreuveId]: (prev[epreuveId] ?? []).map((r) =>
        r.equipeId === equipeId ? { ...r, score } : r
      ),
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <p className="font-nunito text-purple-mid">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-28">
      <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Épreuves</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-card p-3">
          <p className="font-nunito text-red-600 text-sm">{error}</p>
        </div>
      )}

      {events.map((event) => {
        const eventEpreuves = epreuves.filter((e) => e.event_id === event.id)
        const isFormOpen = showFormForEvent === event.id

        const sortedEpreuves = eventEpreuves.slice().sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999))

        return (
          <div key={event.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bangers text-purple-dark text-xl tracking-wide">{event.nom}</h3>
              <button
                onClick={() => {
                  setShowFormForEvent(isFormOpen ? null : event.id)
                  setFormNom('')
                }}
                className="px-3 py-1 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-xs active:opacity-80"
              >
                {isFormOpen ? 'Annuler' : '+ Épreuve'}
              </button>
            </div>

            {isFormOpen && (
              <div className="bg-white rounded-card border border-border p-4 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Nom de l'épreuve"
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                  className="border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main w-full"
                />
                <div className="flex gap-2">
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value as EpreuveMode)}
                    className="flex-1 border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
                  >
                    <option value="gagnant_perdant">🏆 Gagnant/Perdant</option>
                    <option value="par_points">📊 Par points</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Ordre"
                    value={formOrdre}
                    onChange={(e) => setFormOrdre(e.target.value)}
                    className="w-20 border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
                  />
                </div>
                {formMode === 'gagnant_perdant' ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="font-nunito text-xs text-purple-mid block mb-1">Victoire (B)</label>
                      <input
                        type="number"
                        value={formVictoire}
                        onChange={(e) => setFormVictoire(e.target.value)}
                        className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="font-nunito text-xs text-purple-mid block mb-1">Défaite (B)</label>
                      <input
                        type="number"
                        value={formDefaite}
                        onChange={(e) => setFormDefaite(e.target.value)}
                        className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="font-nunito text-xs text-purple-mid block mb-1">Blerhams par point</label>
                    <input
                      type="number"
                      value={formParPoint}
                      onChange={(e) => setFormParPoint(e.target.value)}
                      className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
                    />
                  </div>
                )}
                <button
                  onClick={() => handleCreateEpreuve(event.id)}
                  disabled={submitting || !formNom.trim()}
                  className="py-2 rounded-btn bg-yellow-fest text-purple-dark font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80"
                >
                  {submitting ? 'Création...' : 'Créer l\'épreuve'}
                </button>
              </div>
            )}

            {sortedEpreuves.map((epreuve, epIdx) => {
              const inputs = resultInputs[epreuve.id] ?? []
              const showResult = epreuve.statut === 'en_cours' || epreuve.statut === 'termine'

              return (
                <div
                  key={epreuve.id}
                  className={`bg-white rounded-card border p-4 flex flex-col gap-3 ${
                    epreuve.statut === 'en_cours' ? 'border-pink-fluo shadow-sm' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Ordre ↑↓ */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => handleReorder(epreuve, 'up')}
                        disabled={epIdx === 0}
                        className="w-6 h-6 flex items-center justify-center rounded text-purple-mid bg-bg-main border border-border text-xs disabled:opacity-20 active:opacity-60"
                      >↑</button>
                      <button
                        onClick={() => handleReorder(epreuve, 'down')}
                        disabled={epIdx === sortedEpreuves.length - 1}
                        className="w-6 h-6 flex items-center justify-center rounded text-purple-mid bg-bg-main border border-border text-xs disabled:opacity-20 active:opacity-60"
                      >↓</button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-nunito font-bold text-purple-dark truncate">{epreuve.nom}</p>
                      <p className="font-nunito text-purple-mid text-xs mt-0.5">
                        {epreuve.mode === 'gagnant_perdant'
                          ? `🏆 V:${epreuve.blerhams_victoire}B · D:${epreuve.blerhams_defaite}B`
                          : `📊 ${epreuve.blerhams_par_point}B/pt`}
                      </p>
                    </div>
                    <span className={`text-xs font-nunito px-2 py-0.5 rounded-full flex-shrink-0 ${
                      epreuve.statut === 'en_cours'
                        ? 'bg-pink-fluo text-white'
                        : epreuve.statut === 'termine'
                        ? 'bg-gray-100 text-purple-mid'
                        : 'bg-bg-main text-purple-mid'
                    }`}>
                      {STATUS_LABELS[epreuve.statut]}
                    </span>
                  </div>

                  {STATUS_NEXT[epreuve.statut] && (
                    <button
                      onClick={() => handleStatusChange(epreuve)}
                      disabled={updating === epreuve.id}
                      className="py-1.5 rounded-btn bg-bg-main border border-border font-nunito font-bold text-purple-dark text-sm disabled:opacity-50 active:opacity-80"
                    >
                      {updating === epreuve.id
                        ? '...'
                        : epreuve.statut === 'a_venir'
                        ? '▶ Démarrer'
                        : '✓ Terminer'}
                    </button>
                  )}

                  {showResult && epreuve.mode === 'gagnant_perdant' && (
                    <div className="flex flex-col gap-2">
                      <p className="font-nunito text-purple-dark text-sm font-bold">Équipe gagnante :</p>
                      <div className="flex flex-col gap-1.5">
                        {equipes.map((eq) => (
                          <button
                            key={eq.id}
                            onClick={() =>
                              setWinnerEquipeId((prev) => ({ ...prev, [epreuve.id]: eq.id }))
                            }
                            className={`flex items-center gap-2 px-3 py-2 rounded-btn border text-left ${
                              winnerEquipeId[epreuve.id] === eq.id
                                ? 'border-yellow-fest bg-yellow-fest text-purple-dark'
                                : 'border-border bg-bg-main text-purple-dark'
                            }`}
                          >
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: eq.couleur ?? '#8B6BAE' }}
                            />
                            <span className="font-nunito font-bold text-sm">{eq.nom}</span>
                            {winnerEquipeId[epreuve.id] === eq.id && (
                              <span className="ml-auto text-sm">🏆</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleValiderResultatGagnantPerdant(epreuve)}
                        disabled={validatingResult === epreuve.id || !winnerEquipeId[epreuve.id]}
                        className="py-2 rounded-btn bg-green-fluo text-purple-dark font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80"
                      >
                        {validatingResult === epreuve.id ? 'Validation...' : 'Valider résultat'}
                      </button>
                    </div>
                  )}

                  {showResult && epreuve.mode === 'par_points' && (
                    <div className="flex flex-col gap-2">
                      <p className="font-nunito text-purple-dark text-sm font-bold">Scores par équipe :</p>
                      {(inputs.length > 0 ? inputs : equipes.map((eq) => ({ equipeId: eq.id, score: '0', winner: false }))).map((input) => {
                        const eq = equipes.find((e) => e.id === input.equipeId)
                        if (!eq) return null
                        return (
                          <div key={input.equipeId} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: eq.couleur ?? '#8B6BAE' }}
                            />
                            <span className="font-nunito text-purple-dark text-sm flex-1">{eq.nom}</span>
                            <input
                              type="number"
                              value={input.score}
                              onChange={(e) => updateScore(epreuve.id, input.equipeId, e.target.value)}
                              className="w-20 border border-border rounded-btn px-2 py-1 font-nunito text-purple-dark text-sm bg-bg-main text-center"
                            />
                            <span className="font-nunito text-purple-mid text-xs">pts</span>
                          </div>
                        )
                      })}
                      <button
                        onClick={() => handleValiderResultatParPoints(epreuve)}
                        disabled={validatingResult === epreuve.id}
                        className="py-2 rounded-btn bg-green-fluo text-purple-dark font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80"
                      >
                        {validatingResult === epreuve.id ? 'Validation...' : 'Valider résultat'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {sortedEpreuves.length === 0 && !isFormOpen && (
              <p className="font-nunito text-purple-mid text-sm text-center py-2">
                Aucune épreuve.
              </p>
            )}
          </div>
        )
      })}

      {events.length === 0 && (
        <p className="font-nunito text-purple-mid text-sm text-center py-4">
          Aucun événement.
        </p>
      )}
    </div>
  )
}
