import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Epreuve, EpreuveMode, Event } from '../../../types'


export function EpreuvesTab() {
  const [events, setEvents] = useState<Event[]>([])
  const [epreuves, setEpreuves] = useState<Epreuve[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFormForEvent, setShowFormForEvent] = useState<string | null>(null)

  // Form state
  const [formNom, setFormNom] = useState('')
  const [formMode, setFormMode] = useState<EpreuveMode>('gagnant_perdant')
  const [formVictoire, setFormVictoire] = useState('100')
  const [formDefaite, setFormDefaite] = useState('0')
  const [formParPoint, setFormParPoint] = useState('10')
  const [formOrdre, setFormOrdre] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editMode, setEditMode] = useState<EpreuveMode>('gagnant_perdant')
  const [editVictoire, setEditVictoire] = useState('100')
  const [editDefaite, setEditDefaite] = useState('0')
  const [editParPoint, setEditParPoint] = useState('10')
  const [saving, setSaving] = useState(false)

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [{ data: evData }, { data: epData }] = await Promise.all([
        supabase.from('events').select('*').order('ordre', { nullsFirst: false }),
        supabase.from('epreuves').select('*').order('ordre', { nullsFirst: false }),
      ])
      setEvents(evData ?? [])
      setEpreuves(epData ?? [])
    } finally {
      setLoading(false)
    }
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

  function startEdit(epreuve: Epreuve) {
    setEditingId(epreuve.id)
    setEditNom(epreuve.nom)
    setEditMode(epreuve.mode)
    setEditVictoire(String(epreuve.blerhams_victoire))
    setEditDefaite(String(epreuve.blerhams_defaite))
    setEditParPoint(String(epreuve.blerhams_par_point ?? 10))
  }

  async function handleSaveEdit(epreuveId: string) {
    if (!editNom.trim()) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('epreuves').update({
      nom: editNom.trim(),
      mode: editMode,
      blerhams_victoire: editMode === 'gagnant_perdant' ? parseInt(editVictoire) : 0,
      blerhams_defaite:  editMode === 'gagnant_perdant' ? parseInt(editDefaite) : 0,
      blerhams_par_point: editMode === 'par_points' ? parseInt(editParPoint) : null,
    }).eq('id', epreuveId)
    if (err) {
      setError(err.message)
    } else {
      setEpreuves((prev) => prev.map((e) => e.id === epreuveId ? {
        ...e,
        nom: editNom.trim(),
        mode: editMode,
        blerhams_victoire: editMode === 'gagnant_perdant' ? parseInt(editVictoire) : 0,
        blerhams_defaite:  editMode === 'gagnant_perdant' ? parseInt(editDefaite) : 0,
        blerhams_par_point: editMode === 'par_points' ? parseInt(editParPoint) : null,
      } : e))
      setEditingId(null)
    }
    setSaving(false)
  }

  async function handleDelete(epreuveId: string) {
    setDeleting(true)
    setError(null)
    const { error: err } = await supabase.from('epreuves').delete().eq('id', epreuveId)
    if (err) {
      setError(err.message)
    } else {
      setEpreuves((prev) => prev.filter((e) => e.id !== epreuveId))
      setConfirmDeleteId(null)
    }
    setDeleting(false)
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
                onClick={() => { setShowFormForEvent(isFormOpen ? null : event.id); setFormNom('') }}
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
                      <input type="number" value={formVictoire} onChange={(e) => setFormVictoire(e.target.value)}
                        className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main" />
                    </div>
                    <div className="flex-1">
                      <label className="font-nunito text-xs text-purple-mid block mb-1">Défaite (B)</label>
                      <input type="number" value={formDefaite} onChange={(e) => setFormDefaite(e.target.value)}
                        className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="font-nunito text-xs text-purple-mid block mb-1">Blerhams par point</label>
                    <input type="number" value={formParPoint} onChange={(e) => setFormParPoint(e.target.value)}
                      className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main" />
                  </div>
                )}
                <button
                  onClick={() => handleCreateEpreuve(event.id)}
                  disabled={submitting || !formNom.trim()}
                  className="py-2 rounded-btn bg-yellow-fest text-purple-dark font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80"
                >
                  {submitting ? 'Création...' : "Créer l'épreuve"}
                </button>
              </div>
            )}

            {sortedEpreuves.map((epreuve, epIdx) => {
              const isEditing = editingId === epreuve.id
              const isConfirmDelete = confirmDeleteId === epreuve.id

              return (
                <div
                  key={epreuve.id}
                  className="bg-white rounded-card border border-border p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Ordre ↑↓ */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button onClick={() => handleReorder(epreuve, 'up')} disabled={epIdx === 0}
                        className="w-6 h-6 flex items-center justify-center rounded text-purple-mid bg-bg-main border border-border text-xs disabled:opacity-20 active:opacity-60">↑</button>
                      <button onClick={() => handleReorder(epreuve, 'down')} disabled={epIdx === sortedEpreuves.length - 1}
                        className="w-6 h-6 flex items-center justify-center rounded text-purple-mid bg-bg-main border border-border text-xs disabled:opacity-20 active:opacity-60">↓</button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-nunito font-bold text-purple-dark truncate">{epreuve.nom}</p>
                      <p className="font-nunito text-purple-mid text-xs mt-0.5">
                        {epreuve.mode === 'gagnant_perdant'
                          ? `🏆 V:${epreuve.blerhams_victoire}B · D:${epreuve.blerhams_defaite}B`
                          : `📊 ${epreuve.blerhams_par_point}B/pt`}
                        {epreuve.ordre !== null && ` · #${epreuve.ordre}`}
                      </p>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => isEditing ? setEditingId(null) : startEdit(epreuve)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-bg-main border border-border text-purple-mid text-sm active:opacity-60">✏️</button>
                      <button onClick={() => setConfirmDeleteId(isConfirmDelete ? null : epreuve.id)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-bg-main border border-border text-purple-mid text-sm active:opacity-60">🗑️</button>
                    </div>
                  </div>

                  {/* Inline edit */}
                  {isEditing && (
                    <div className="border-t border-border pt-3 flex flex-col gap-2">
                      <input autoFocus type="text" value={editNom} onChange={(e) => setEditNom(e.target.value)}
                        className="border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main w-full" />
                      <select value={editMode} onChange={(e) => setEditMode(e.target.value as EpreuveMode)}
                        className="border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main">
                        <option value="gagnant_perdant">🏆 Gagnant/Perdant</option>
                        <option value="par_points">📊 Par points</option>
                      </select>
                      {editMode === 'gagnant_perdant' ? (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="font-nunito text-xs text-purple-mid block mb-1">Victoire (B)</label>
                            <input type="number" value={editVictoire} onChange={(e) => setEditVictoire(e.target.value)}
                              className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main" />
                          </div>
                          <div className="flex-1">
                            <label className="font-nunito text-xs text-purple-mid block mb-1">Défaite (B)</label>
                            <input type="number" value={editDefaite} onChange={(e) => setEditDefaite(e.target.value)}
                              className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main" />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="font-nunito text-xs text-purple-mid block mb-1">Blerhams par point</label>
                          <input type="number" value={editParPoint} onChange={(e) => setEditParPoint(e.target.value)}
                            className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main" />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(epreuve.id)} disabled={saving || !editNom.trim()}
                          className="flex-1 py-2 rounded-btn bg-yellow-fest text-purple-dark font-nunito font-bold text-sm disabled:opacity-50">
                          {saving ? '...' : '✓ Sauvegarder'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="px-4 py-2 rounded-btn bg-bg-main border border-border font-nunito text-purple-mid text-sm">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delete confirm */}
                  {isConfirmDelete && (
                    <div className="border-t border-red-200 pt-3 flex items-center gap-3 bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-card">
                      <p className="font-nunito text-red-600 text-sm flex-1">Supprimer cette épreuve ?</p>
                      <button onClick={() => handleDelete(epreuve.id)} disabled={deleting}
                        className="px-3 py-1.5 rounded-btn bg-red-500 text-white font-nunito font-bold text-xs disabled:opacity-50">
                        {deleting ? '...' : 'Supprimer'}
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 rounded-btn bg-white border border-border font-nunito text-purple-mid text-xs">
                        Non
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {sortedEpreuves.length === 0 && !isFormOpen && (
              <p className="font-nunito text-purple-mid text-sm text-center py-2">Aucune épreuve.</p>
            )}
          </div>
        )
      })}

      {events.length === 0 && (
        <p className="font-nunito text-purple-mid text-sm text-center py-4">Aucun événement.</p>
      )}
    </div>
  )
}
