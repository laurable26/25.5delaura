import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { useProfile } from './hooks/useProfile'
import { useRealtimePendingTransaction } from './hooks/useRealtime'
import { Home } from './pages/Home'
import { PhotoStep } from './pages/Onboarding/PhotoStep'
import { PinStep } from './pages/Onboarding/PinStep'
import { DepenseConfirmModal } from './components/invite/DepenseConfirmModal'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from './types'

type OnboardingStep = 'photo' | 'pin' | 'done'

function getOnboardingStep(profile: { photo_url: string | null; pin_hash: string } | null): OnboardingStep {
  if (!profile) return 'photo'
  if (!profile.photo_url) return 'photo'
  if (!profile.pin_hash) return 'pin'
  return 'done'
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [coinPhotoUrl, setCoinPhotoUrl] = useState<string | null>(null)

  const { profile, loading: profileLoading, setProfile, refetch } = useProfile(session?.user?.id)
  const [pendingTxId, setPendingTxId] = useState<string | null>(null)

  const handlePendingTx = useCallback((txId: string) => {
    setPendingTxId(txId)
  }, [])

  useRealtimePendingTransaction(session?.user?.id, handlePendingTx)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return

    async function loadCoinPhoto() {
      const { data } = supabase.storage
        .from('assets')
        .getPublicUrl('coins/blerham.jpeg')
      setCoinPhotoUrl(data.publicUrl)
    }

    loadCoinPhoto()
  }, [session])

  const handleProfileUpdate = useCallback((p: Profile) => {
    setProfile(p)
  }, [setProfile])

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-yellow-fest animate-pulse" />
          <p className="font-nunito text-purple-mid">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center px-6">
        <div className="text-center mb-10">
          <h1 className="font-bangers text-purple-dark text-5xl tracking-widest">BLERHAM</h1>
          <p className="font-nunito text-purple-mid mt-2">25.5 de Laura — 06.06.2026</p>
        </div>
        <div className="w-full max-w-xs bg-white rounded-card-lg border border-border p-6 text-center">
          <p className="font-nunito text-purple-dark font-bold">Connecte-toi avec le lien magique envoyé par Laura ✨</p>
        </div>
      </div>
    )
  }

  const onboardingStep = getOnboardingStep(profile)

  if (onboardingStep !== 'done') {
    return (
      <div className="min-h-screen bg-bg-main">
        <div className="mx-auto max-w-mobile min-h-screen">
          {onboardingStep === 'photo' && (
            <PhotoStep userId={session.user.id} onNext={refetch} />
          )}
          {onboardingStep === 'pin' && (
            <PinStep userId={session.user.id} onComplete={refetch} />
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Home
        profile={profile!}
        coinPhotoUrl={coinPhotoUrl}
        onProfileUpdate={handleProfileUpdate}
      />
      {pendingTxId && profile && (
        <DepenseConfirmModal
          transactionId={pendingTxId}
          pinHash={profile.pin_hash}
          onDone={() => { setPendingTxId(null); refetch() }}
        />
      )}
    </>
  )
}
