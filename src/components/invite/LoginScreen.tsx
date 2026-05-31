import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { PinInput } from '../ui/PinInput'

interface LoginProfile {
  id: string
  prenom: string
  photo_url: string | null
}

export function LoginScreen() {
  const [profiles, setProfiles] = useState<LoginProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<LoginProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logging, setLogging] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('profiles_login')
      .select('id, prenom, photo_url')
      .order('prenom')
      .then(({ data }) => {
        setProfiles(data ?? [])
        setLoading(false)
      })
  }, [])

  async function handlePin(pin: string) {
    if (!selected) return
    setLogging(true)
    setError(null)

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login-with-pin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ profile_id: selected.id, pin }),
        }
      )

      const json = await res.json()

      if (!res.ok || json.error) {
        setError(json.error ?? 'Erreur de connexion')
        setLogging(false)
        return
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: json.hashed_token,
        type: 'magiclink',
      })

      if (verifyError) {
        setError('Erreur de session : ' + verifyError.message)
      }
    } catch {
      setError('Erreur réseau')
    }

    setLogging(false)
  }

  const filtered = profiles.filter((p) =>
    p.prenom.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      <div className="mx-auto w-full max-w-mobile flex flex-col min-h-screen">
        {/* Header */}
        <div className="text-center pt-12 pb-6 px-6">
          <h1 className="font-bangers text-purple-dark text-5xl tracking-widest">
            25.5 de Laura
          </h1>
          <p className="font-nunito text-purple-mid mt-1">06.06.2026 🎪</p>
        </div>

        {selected ? (
          /* Step 2: PIN entry */
          <div className="flex flex-col items-center gap-6 px-6 flex-1">
            <button
              onClick={() => { setSelected(null); setError(null) }}
              className="self-start text-purple-mid font-nunito text-sm"
            >
              ← Retour
            </button>

            <div className="flex flex-col items-center gap-3">
              {selected.photo_url ? (
                <img
                  src={selected.photo_url}
                  alt={selected.prenom}
                  className="w-20 h-20 rounded-full object-cover border-4 border-yellow-fest"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-3xl border-4 border-yellow-fest">
                  {selected.prenom[0]}
                </div>
              )}
              <p className="font-bangers text-purple-dark text-2xl tracking-wide">
                {selected.prenom}
              </p>
            </div>

            <p className="font-nunito text-purple-mid text-sm text-center">
              Entre ton code PIN à 4 chiffres
            </p>

            <PinInput
              onComplete={handlePin}
              disabled={logging}
              error={error}
            />

            {logging && (
              <p className="font-nunito text-purple-mid text-sm">Connexion...</p>
            )}
          </div>
        ) : (
          /* Step 1: select name */
          <div className="flex flex-col gap-4 px-4 flex-1">
            <p className="font-nunito font-bold text-purple-dark text-center text-lg">
              C'est qui ?
            </p>

            {profiles.length > 6 && (
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-border rounded-btn px-4 py-3 font-nunito text-purple-dark bg-white outline-none"
              />
            )}

            {loading ? (
              <p className="font-nunito text-purple-mid text-center py-8">Chargement...</p>
            ) : (
              <div className="flex flex-col gap-2 pb-8">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="flex items-center gap-3 bg-white rounded-card border border-border px-4 py-3 active:bg-bg-main transition-colors text-left"
                  >
                    {p.photo_url ? (
                      <img
                        src={p.photo_url}
                        alt={p.prenom}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-lg flex-shrink-0">
                        {p.prenom[0]}
                      </div>
                    )}
                    <span className="font-nunito font-bold text-purple-dark">{p.prenom}</span>
                    <span className="ml-auto text-purple-mid text-lg">›</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="font-nunito text-purple-mid text-center py-4">
                    Aucun résultat
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
