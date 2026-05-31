import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { hashPin } from '../../../lib/bcrypt'
import type { Profile, UserRole } from '../../../types'

async function callEdge(slug: string, body: Record<string, unknown>): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${slug}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify(body),
    }
  )
  const json = await res.json()
  if (!res.ok) return json.error ?? 'Erreur'
  return null
}

const ROLES: UserRole[] = ['invite', 'admin_jeux', 'admin_ventes', 'admin_general']

const ROLE_LABELS: Record<UserRole, string> = {
  invite: 'Invité',
  admin_jeux: 'Admin Jeux',
  admin_ventes: 'Admin Ventes',
  admin_general: 'Admin Général',
}

export function RolesTab() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [newPrenom, setNewPrenom] = useState('')
  const [newPin, setNewPin] = useState('0000')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrenom, setEditPrenom] = useState('')
  const [editPin, setEditPin] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('profiles').select('*').order('prenom')
    if (fetchError) setError(fetchError.message)
    else setProfiles(data ?? [])
    setLoading(false)
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdating(userId)
    setError(null)
    const { error: updateError } = await supabase
      .from('profiles').update({ role: newRole }).eq('id', userId)
    if (updateError) setError(updateError.message)
    else setProfiles((prev) => prev.map((p) => p.id === userId ? { ...p, role: newRole } : p))
    setUpdating(null)
  }

  function startEdit(profile: Profile) {
    setEditingId(profile.id)
    setEditPrenom(profile.prenom)
    setEditPin('')
    setEditError(null)
    setConfirmDeleteId(null)
  }

  async function handleSaveEdit(userId: string) {
    if (!editPrenom.trim()) return
    if (editPin && !/^\d{4}$/.test(editPin)) { setEditError('Le code doit être 4 chiffres'); return }
    setEditSaving(true)
    setEditError(null)
    const updates: Record<string, unknown> = { prenom: editPrenom.trim() }
    if (editPin) updates.pin_hash = await hashPin(editPin)
    const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', userId)
    if (updateError) {
      setEditError(updateError.message)
    } else {
      setProfiles((prev) => prev.map((p) => p.id === userId ? { ...p, prenom: editPrenom.trim() } : p))
      setEditingId(null)
    }
    setEditSaving(false)
  }

  async function handleDelete(userId: string) {
    setDeleting(true)
    setError(null)
    const err = await callEdge('delete-user', { user_id: userId })
    if (err) {
      setError(err)
    } else {
      setProfiles((prev) => prev.filter((p) => p.id !== userId))
      setConfirmDeleteId(null)
    }
    setDeleting(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newPrenom.trim()) return
    if (!/^\d{4}$/.test(newPin)) { setCreateError('Le code doit être 4 chiffres'); return }
    setCreating(true)
    setCreateError(null)
    setCreateSuccess(null)
    const err = await callEdge('create-guest', { prenom: newPrenom.trim(), initial_pin: newPin })
    if (err) {
      setCreateError(err)
    } else {
      setCreateSuccess(`${newPrenom.trim()} créé avec le code ${newPin}`)
      setNewPrenom('')
      setNewPin('0000')
      const { data } = await supabase.from('profiles').select('*').order('prenom')
      setProfiles(data ?? [])
    }
    setCreating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <p className="font-nunito text-purple-mid">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-10">
      <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Gestion des rôles</h2>

      {/* Créer un invité */}
      <div className="bg-white rounded-card border border-border p-4 flex flex-col gap-3">
        <p className="font-bangers text-purple-dark text-lg tracking-wide">Ajouter un invité</p>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Prénom"
            value={newPrenom}
            onChange={(e) => setNewPrenom(e.target.value)}
            className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark bg-bg-main outline-none"
          />
          <div className="flex gap-2 items-center">
            <label className="font-nunito text-purple-mid text-sm shrink-0">Code initial :</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-20 border border-border rounded-btn px-3 py-2 font-nunito text-center text-purple-dark bg-bg-main outline-none tracking-widest"
            />
          </div>
          {createError && <p className="font-nunito text-pink-fluo text-sm">{createError}</p>}
          {createSuccess && <p className="font-nunito text-green-fluo text-sm font-bold">{createSuccess} ✓</p>}
          <button
            type="submit"
            disabled={creating || !newPrenom.trim()}
            className="w-full py-3 rounded-btn bg-pink-fluo text-white font-nunito font-bold disabled:opacity-40"
          >
            {creating ? 'Création...' : '+ Créer l\'invité'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-card p-3">
          <p className="font-nunito text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {profiles.map((profile) => {
          const isEditing = editingId === profile.id
          const isConfirmingDelete = confirmDeleteId === profile.id
          return (
            <div key={profile.id} className="bg-white rounded-card border border-border p-4 flex flex-col gap-3">

              {/* Confirmation suppression */}
              {isConfirmingDelete && (
                <div className="bg-red-50 border border-red-200 rounded-btn p-3 flex items-center justify-between gap-3">
                  <p className="font-nunito text-red-600 text-sm">
                    Supprimer <strong>{profile.prenom}</strong> définitivement ?
                  </p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDelete(profile.id)}
                      disabled={deleting}
                      className="px-3 py-1 rounded-btn bg-red-500 text-white font-nunito font-bold text-xs disabled:opacity-50"
                    >
                      {deleting ? '...' : 'Supprimer'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1 rounded-btn bg-bg-main border border-border font-nunito text-purple-mid text-xs"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Header ligne */}
              <div className="flex items-center gap-2">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt={profile.prenom} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-lg flex-shrink-0">
                    {profile.prenom[0]}
                  </div>
                )}
                <p className="font-nunito font-bold text-purple-dark flex-1">{profile.prenom}</p>
                <select
                  value={profile.role}
                  onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                  disabled={updating === profile.id}
                  className="font-nunito text-purple-dark text-sm border border-border rounded-btn px-2 py-1 bg-bg-main disabled:opacity-50"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <button
                  onClick={() => isEditing ? setEditingId(null) : startEdit(profile)}
                  className="w-7 h-7 flex items-center justify-center rounded bg-bg-main border border-border text-purple-mid text-sm active:opacity-60 flex-shrink-0"
                >
                  {isEditing ? '✕' : '✏️'}
                </button>
                <button
                  onClick={() => { setConfirmDeleteId(isConfirmingDelete ? null : profile.id); setEditingId(null) }}
                  className="w-7 h-7 flex items-center justify-center rounded bg-bg-main border border-red-200 text-red-400 text-sm active:opacity-60 flex-shrink-0"
                >
                  🗑️
                </button>
              </div>

              {/* Inline edit */}
              {isEditing && (
                <div className="border-t border-border pt-3 flex flex-col gap-2">
                  <div>
                    <label className="font-nunito text-xs text-purple-mid block mb-1">Prénom</label>
                    <input
                      autoFocus
                      type="text"
                      value={editPrenom}
                      onChange={(e) => setEditPrenom(e.target.value)}
                      className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
                    />
                  </div>
                  <div>
                    <label className="font-nunito text-xs text-purple-mid block mb-1">
                      Nouveau code PIN <span className="opacity-60">(laisser vide pour ne pas changer)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="ex: 1234"
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-24 border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main text-center tracking-widest"
                    />
                  </div>
                  {editError && <p className="font-nunito text-pink-fluo text-xs">{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(profile.id)}
                      disabled={editSaving || !editPrenom.trim()}
                      className="flex-1 py-2 rounded-btn bg-yellow-fest text-purple-dark font-nunito font-bold text-sm disabled:opacity-50"
                    >
                      {editSaving ? '...' : '✓ Sauvegarder'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded-btn bg-bg-main border border-border font-nunito text-purple-mid text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
