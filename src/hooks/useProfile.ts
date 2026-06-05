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
    const ch = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => { setProfile(payload.new as Profile) }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])

  return { profile, loading, error, setProfile, refetch: fetchProfile }
}
