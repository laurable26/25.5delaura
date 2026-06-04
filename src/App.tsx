import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { useProfile } from './hooks/useProfile'
import { useRealtimePendingTransaction } from './hooks/useRealtime'
import { Home } from './pages/Home'
import { PhotoStep } from './pages/Onboarding/PhotoStep'
import { PinStep } from './pages/Onboarding/PinStep'
import { DepenseConfirmModal } from './components/invite/DepenseConfirmModal'
import { TransferAnimation } from './components/ui/TransferAnimation'
import { LoginScreen } from './components/invite/LoginScreen'
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
  const [soldeAnimation, setSoldeAnimation] = useState<{ from: number; to: number; description?: string | null } | null>(null)
  const prevSoldeRef = useRef<number | null>(null)

  const handlePendingTx = useCallback((txId: string) => {
    setPendingTxId((prev) => prev ?? txId)
  }, [])

  useRealtimePendingTransaction(session?.user?.id, handlePendingTx)

  // Fallback: check for pending transactions on mount (in case realtime event was missed)
  useEffect(() => {
    if (!session?.user?.id) return
    supabase
      .from('transactions')
      .select('id')
      .eq('receveur_id', session.user.id)
      .eq('statut', 'en_attente')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) setPendingTxId((prev) => prev ?? data.id)
      })
  }, [session?.user?.id])

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
        .getPublicUrl('coins/blehram.png')
      setCoinPhotoUrl(data.publicUrl)
    }

    loadCoinPhoto()
  }, [session])

  // Initialise the ref once the profile loads
  useEffect(() => {
    if (profile && prevSoldeRef.current === null) {
      prevSoldeRef.current = profile.solde
    }
  }, [profile])

  const handleProfileUpdate = useCallback((p: Profile) => {
    const prev = prevSoldeRef.current
    if (prev !== null && prev !== p.solde) {
      supabase
        .from('transactions')
        .select('description')
        .eq('receveur_id', p.id)
        .in('type', ['bonus', 'malus', 'transfert_recu'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          setSoldeAnimation({ from: prev, to: p.solde, description: data?.description ?? null })
        })
    }
    prevSoldeRef.current = p.solde
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
    return <LoginScreen />
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
        onLogout={() => setSession(null)}
      />
      {pendingTxId && profile && (
        <DepenseConfirmModal
          transactionId={pendingTxId}
          pinHash={profile.pin_hash}
          onDone={() => { setPendingTxId(null); refetch() }}
        />
      )}
      {soldeAnimation && (
        <TransferAnimation
          fromSolde={soldeAnimation.from}
          toSolde={soldeAnimation.to}
          coinPhotoUrl={coinPhotoUrl}
          description={soldeAnimation.description}
          onClose={() => setSoldeAnimation(null)}
        />
      )}
    </>
  )
}
