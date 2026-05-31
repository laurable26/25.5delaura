import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

const LOCKABLE_ITEMS = [
  { key: 'laurapiades', label: 'Laurapiades', emoji: '🏆' },
  { key: 'spotify', label: 'Rejoindre la jam Spotify', emoji: '🎵' },
  { key: 'pov', label: 'Rejoindre le POV', emoji: '🎬' },
  { key: 'transfert', label: 'Transférer des Blerhams', emoji: '💸' },
]

export function AccesUtilesTab() {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('feature_flags').select('key, enabled')
      if (data) setFlags(Object.fromEntries(data.map((f) => [f.key, f.enabled])))
      setLoading(false)
    }
    load()
  }, [])

  async function handleToggle(key: string) {
    const newValue = !(flags[key] ?? true)
    setSaving(key)
    setError(null)
    const { error: err } = await supabase
      .from('feature_flags')
      .upsert({ key, label: LOCKABLE_ITEMS.find((i) => i.key === key)?.label ?? key, enabled: newValue })
    if (err) {
      setError(err.message)
    } else {
      setFlags((prev) => ({ ...prev, [key]: newValue }))
    }
    setSaving(null)
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
      <div>
        <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Accès utiles</h2>
        <p className="font-nunito text-purple-mid text-sm mt-1">
          Activer ou désactiver les accès visibles par les invités.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-card p-3">
          <p className="font-nunito text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {LOCKABLE_ITEMS.map((item) => {
          const enabled = flags[item.key] ?? true
          const isSaving = saving === item.key
          return (
            <div key={item.key} className="bg-white rounded-card border border-border p-4 flex items-center gap-4">
              <span className="text-2xl flex-shrink-0">{item.emoji}</span>
              <p className="font-nunito font-bold text-purple-dark flex-1">{item.label}</p>
              <button
                onClick={() => handleToggle(item.key)}
                disabled={isSaving}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
                  enabled ? 'bg-green-fluo' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>

      <p className="font-nunito text-purple-mid text-xs text-center opacity-60">
        Les admins voient toujours tous leurs accès.
      </p>
    </div>
  )
}
