import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    fetchProfile()
  }, [userId, fetchProfile])

  useEffect(() => {
    if (!userId) return
    // Use a unique channel name per mount to avoid "cannot add callbacks after subscribe()" if
    // the effect fires twice before cleanup (concurrent mode / fast refresh).
    const channelName = `profile-${userId}-${Date.now()}`
    let ch: ReturnType<typeof supabase.channel> | null = null
    try {
      ch = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          (payload) => { setProfile(payload.new as Profile) }
        )
        .subscribe()
    } catch {
      // Non-critical: solde will still update on next manual refetch
    }
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [userId])

  return { profile, loading, error, setProfile, refetch: fetchProfile }
}
