import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Equipe, Profile } from '../../../types'

export function EquipesTab() {
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameNumero, setRenameNumero] = useState('')
  const [renaming, setRenaming] = useState(false)

  // Assign state
  const [assigningEquipeId, setAssigningEquipeId] = useState<string | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: eq }, { data: pr }] = await Promise.all([
      supabase.from('equipes').select('*').order('nom'),
      supabase.from('profiles').select('*').order('prenom'),
    ])
    setEquipes(eq ?? [])
    setProfiles(pr ?? [])
    setLoading(false)
  }

  async function handleRename(equipeId: string) {
    if (!renameValue.trim()) return
    setRenaming(true)
    setError(null)
    const numero = renameNumero ? parseInt(renameNumero) : null
    const { error: err } = await supabase
      .from('equipes')
      .update({ nom: renameValue.trim(), numero })
      .eq('id', equipeId)
    if (err) {
      setError(err.message)
    } else {
      setEquipes((prev) => prev.map((e) => e.id === equipeId ? { ...e, nom: renameValue.trim(), numero } : e))
      setRenamingId(null)
    }
    setRenaming(false)
  }

  async function handleAssign(profileId: string, equipeId: string | null) {
    setAssigning(true)
    setError(null)
    const { error: err } = await supabase
      .from('profiles')
      .update({ equipe_id: equipeId })
      .eq('id', profileId)
    if (err) {
      setError(err.message)
    } else {
      setProfiles((prev) =>
        prev.map((p) => p.id === profileId ? { ...p, equipe_id: equipeId } : p)
      )
      setAssigningEquipeId(null)
      setSelectedProfileId('')
    }
    setAssigning(false)
  }

  async function handleDelete(equipeId: string) {
    setDeleting(true)
    setError(null)
    // Unassign all members first
    await supabase.from('profiles').update({ equipe_id: null }).eq('equipe_id', equipeId)
    const { error: err } = await supabase.from('equipes').delete().eq('id', equipeId)
    if (err) {
      setError(err.message)
    } else {
      setEquipes((prev) => prev.filter((e) => e.id !== equipeId))
      setProfiles((prev) => prev.map((p) => p.equipe_id === equipeId ? { ...p, equipe_id: null } : p))
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
    <div className="flex flex-col gap-4 px-4 pt-6 pb-10">
      <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Gestion des équipes</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-card p-3">
          <p className="font-nunito text-red-600 text-sm">{error}</p>
        </div>
      )}

      {equipes.map((equipe) => {
        const members = profiles.filter((p) => p.equipe_id === equipe.id)
        const unassigned = profiles.filter((p) => !p.equipe_id)
        const isRenaming = renamingId === equipe.id
        const isAssigning = assigningEquipeId === equipe.id
        const isConfirmingDelete = confirmDeleteId === equipe.id

        return (
          <div key={equipe.id} className="bg-white rounded-card border border-border p-4 flex flex-col gap-3">
            {/* Confirmation suppression */}
            {isConfirmingDelete && (
              <div className="bg-red-50 border border-red-200 rounded-btn p-3 flex items-center justify-between gap-3">
                <p className="font-nunito text-red-600 text-sm">
                  Supprimer <strong>{equipe.nom}</strong> ? ({members.length} membre{members.length !== 1 ? 's' : ''} désassignés)
                </p>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(equipe.id)}
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

            {/* Header équipe */}
            <div className="flex items-center gap-3">
              {isRenaming ? (
                <div className="flex gap-2 flex-1">
                  <input
                    type="number"
                    placeholder="#"
                    value={renameNumero}
                    onChange={(e) => setRenameNumero(e.target.value)}
                    className="w-14 border border-border rounded-btn px-2 py-1.5 font-nunito text-purple-dark text-sm bg-bg-main text-center"
                  />
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(equipe.id); if (e.key === 'Escape') setRenamingId(null) }}
                    className="flex-1 border border-border rounded-btn px-3 py-1.5 font-nunito text-purple-dark text-sm bg-bg-main"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  {equipe.numero !== null && (
                    <span className="font-bangers text-purple-mid text-base">#{equipe.numero}</span>
                  )}
                  <p className="font-bangers text-purple-dark text-lg tracking-wide">{equipe.nom}</p>
                </div>
              )}

              {isRenaming ? (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRename(equipe.id)}
                    disabled={renaming}
                    className="px-3 py-1 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-xs disabled:opacity-50"
                  >
                    {renaming ? '...' : '✓'}
                  </button>
                  <button
                    onClick={() => setRenamingId(null)}
                    className="px-3 py-1 rounded-btn bg-bg-main border border-border font-nunito text-purple-mid text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setRenamingId(equipe.id); setRenameValue(equipe.nom); setRenameNumero(equipe.numero !== null ? String(equipe.numero) : '') }}
                    className="px-3 py-1 rounded-btn bg-bg-main border border-border font-nunito text-purple-mid text-xs active:opacity-70"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(equipe.id)}
                    className="px-3 py-1 rounded-btn bg-bg-main border border-red-200 font-nunito text-red-400 text-xs active:opacity-70"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>

            {/* Membres */}
            <div className="flex flex-col gap-1.5">
              {members.length === 0 && (
                <p className="font-nunito text-purple-mid text-xs italic">Aucun membre</p>
              )}
              {members.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.prenom} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-xs flex-shrink-0">
                      {p.prenom[0]}
                    </div>
                  )}
                  <span className="font-nunito text-purple-dark text-sm flex-1">{p.prenom}</span>
                  <button
                    onClick={() => handleAssign(p.id, null)}
                    className="text-purple-mid text-xs font-nunito active:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Ajouter un membre */}
            {isAssigning ? (
              <div className="flex gap-2">
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="flex-1 border border-border rounded-btn px-2 py-1.5 font-nunito text-purple-dark text-sm bg-bg-main"
                >
                  <option value="">Choisir un invité...</option>
                  {unassigned.map((p) => (
                    <option key={p.id} value={p.id}>{p.prenom}</option>
                  ))}
                  {profiles.filter((p) => p.equipe_id && p.equipe_id !== equipe.id).map((p) => {
                    const eq = equipes.find((e) => e.id === p.equipe_id)
                    return (
                      <option key={p.id} value={p.id}>{p.prenom} (de {eq?.nom ?? '?'})</option>
                    )
                  })}
                </select>
                <button
                  onClick={() => selectedProfileId && handleAssign(selectedProfileId, equipe.id)}
                  disabled={assigning || !selectedProfileId}
                  className="px-3 py-1.5 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-xs disabled:opacity-50"
                >
                  {assigning ? '...' : '✓'}
                </button>
                <button
                  onClick={() => { setAssigningEquipeId(null); setSelectedProfileId('') }}
                  className="px-3 py-1.5 rounded-btn bg-bg-main border border-border font-nunito text-purple-mid text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAssigningEquipeId(equipe.id); setSelectedProfileId('') }}
                className="self-start px-3 py-1 rounded-btn bg-bg-main border border-border font-nunito text-purple-mid text-xs active:opacity-70"
              >
                + Ajouter un membre
              </button>
            )}
          </div>
        )
      })}

      {/* Sans équipe */}
      {profiles.filter((p) => !p.equipe_id).length > 0 && (
        <div className="bg-bg-main rounded-card border border-border p-4 flex flex-col gap-2">
          <p className="font-nunito text-purple-mid text-sm font-bold">Sans équipe</p>
          {profiles.filter((p) => !p.equipe_id).map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.prenom} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-xs flex-shrink-0">
                  {p.prenom[0]}
                </div>
              )}
              <span className="font-nunito text-purple-dark text-sm">{p.prenom}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
