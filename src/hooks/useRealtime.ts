import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export function useRealtimeSolde(
  userId: string | undefined,
  onUpdate: (profile: Profile) => void
) {
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          onUpdate(payload.new as Profile)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onUpdate])
}

export function useRealtimePendingTransaction(
  userId: string | undefined,
  onNew: (txId: string) => void
) {
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`pending-tx-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `receveur_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.statut === 'en_attente') {
            onNew(payload.new.id as string)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onNew])
}
