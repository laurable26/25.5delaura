import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Profile, UserRole } from '../../../types'

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

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('prenom')
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setProfiles(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdating(userId)
    setError(null)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
      )
    }
    setUpdating(null)
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
      <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Gestion des rôles</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-card p-3">
          <p className="font-nunito text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="bg-white rounded-card border border-border p-4 flex items-center gap-3"
          >
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.prenom}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
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
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            {updating === profile.id && (
              <span className="text-purple-mid text-xs font-nunito">...</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
