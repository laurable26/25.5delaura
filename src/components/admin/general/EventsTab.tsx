import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Event, EventStatut, EventType } from '../../../types'

const STATUS_NEXT: Record<EventStatut, EventStatut | null> = {
  a_venir: 'en_cours',
  en_cours: 'termine',
  termine: null,
}

const STATUS_LABELS: Record<EventStatut, string> = {
  a_venir: '⏳ À venir',
  en_cours: '🔥 En cours',
  termine: '✓ Terminé',
}

const STATUS_NEXT_LABELS: Record<EventStatut, string> = {
  a_venir: 'Démarrer',
  en_cours: 'Terminer',
  termine: '',
}

const TYPE_OPTIONS: EventType[] = ['jeux', 'repas', 'autre']
const TYPE_LABELS: Record<EventType, string> = {
  jeux: '🎮 Jeux',
  repas: '🍽️ Repas',
  autre: '🎪 Autre',
}

export function EventsTab() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formNom, setFormNom] = useState('')
  const [formType, setFormType] = useState<EventType>('jeux')
  const [formOrdre, setFormOrdre] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .order('ordre', { nullsFirst: false })
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setEvents(data ?? [])
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!formNom.trim()) return
    setSubmitting(true)
    setError(null)
    const { error: insertError } = await supabase.from('events').insert({
      nom: formNom.trim(),
      type: formType,
      ordre: formOrdre ? parseInt(formOrdre) : null,
      statut: 'a_venir',
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setFormNom('')
      setFormType('jeux')
      setFormOrdre('')
      setShowForm(false)
      await load()
    }
    setSubmitting(false)
  }

  async function handleStatusChange(event: Event) {
    const next = STATUS_NEXT[event.statut]
    if (!next) return
    setUpdating(event.id)
    const { error: updateError } = await supabase
      .from('events')
      .update({ statut: next })
      .eq('id', event.id)
    if (updateError) {
      setError(updateError.message)
    } else {
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, statut: next } : e))
      )
    }
    setUpdating(null)
  }

  async function handleDelete(eventId: string) {
    if (!confirm('Supprimer cet événement ?')) return
    setUpdating(eventId)
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
    if (deleteError) {
      setError(deleteError.message)
      setUpdating(null)
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== eventId))
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <p className="font-nunito text-purple-mid">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Événements</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-sm active:opacity-80"
        >
          {showForm ? 'Annuler' : '+ Nouveau'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-card p-3">
          <p className="font-nunito text-red-600 text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-card border border-border p-4 flex flex-col gap-3">
          <p className="font-nunito font-bold text-purple-dark">Nouvel événement</p>
          <input
            type="text"
            placeholder="Nom de l'événement"
            value={formNom}
            onChange={(e) => setFormNom(e.target.value)}
            className="border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main w-full"
          />
          <div className="flex gap-2">
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as EventType)}
              className="flex-1 border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Ordre"
              value={formOrdre}
              onChange={(e) => setFormOrdre(e.target.value)}
              className="w-24 border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={submitting || !formNom.trim()}
            className="py-2 rounded-btn bg-yellow-fest text-purple-dark font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80"
          >
            {submitting ? 'Création...' : 'Créer'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={`bg-white rounded-card border p-4 ${
              event.statut === 'en_cours' ? 'border-pink-fluo' : 'border-border'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-nunito font-bold text-purple-dark truncate">{event.nom}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-nunito text-xs text-purple-mid">{TYPE_LABELS[event.type]}</span>
                  <span className={`text-xs font-nunito px-2 py-0.5 rounded-full ${
                    event.statut === 'en_cours'
                      ? 'bg-pink-fluo text-white'
                      : event.statut === 'termine'
                      ? 'bg-gray-100 text-purple-mid'
                      : 'bg-bg-main text-purple-mid'
                  }`}>
                    {STATUS_LABELS[event.statut]}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(event.id)}
                disabled={updating === event.id}
                className="text-red-400 font-nunito text-sm px-2 py-1 rounded-btn active:opacity-80 disabled:opacity-50"
              >
                🗑️
              </button>
            </div>
            {STATUS_NEXT[event.statut] && (
              <button
                onClick={() => handleStatusChange(event)}
                disabled={updating === event.id}
                className="mt-3 w-full py-2 rounded-btn bg-bg-main border border-border font-nunito font-bold text-purple-dark text-sm disabled:opacity-50 active:opacity-80"
              >
                {updating === event.id ? '...' : STATUS_NEXT_LABELS[event.statut]}
              </button>
            )}
          </div>
        ))}
        {events.length === 0 && (
          <p className="font-nunito text-purple-mid text-sm text-center py-4">
            Aucun événement.
          </p>
        )}
      </div>
    </div>
  )
}
