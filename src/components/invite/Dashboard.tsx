import { useState, useCallback } from 'react'
import { BlerhamCoin } from '../ui/BlerhamCoin'
import { EventCard } from '../ui/EventCard'
import { TransferModal } from './TransferModal'
import { TransferAnimation } from '../ui/TransferAnimation'
import { useRealtimeSolde } from '../../hooks/useRealtime'
import type { Profile, Event } from '../../types'

interface DashboardProps {
  profile: Profile
  events: Event[]
  coinPhotoUrl?: string | null
  onProfileUpdate: (p: Profile) => void
}

export function Dashboard({ profile, events, coinPhotoUrl, onProfileUpdate }: DashboardProps) {
  const [showTransfer, setShowTransfer] = useState(false)
  const [animation, setAnimation] = useState<{ from: number; to: number } | null>(null)

  const handleUpdate = useCallback((updated: Profile) => {
    onProfileUpdate(updated)
  }, [onProfileUpdate])

  useRealtimeSolde(profile.id, handleUpdate)

  function handleTransferSuccess(newSolde: number) {
    setShowTransfer(false)
    setAnimation({ from: profile.solde, to: newSolde })
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-28">
      {/* Solde */}
      <div className="bg-white rounded-card-lg border border-border p-6 flex flex-col items-center gap-4 shadow-sm">
        <BlerhamCoin size={96} photoUrl={coinPhotoUrl} />
        <div className="text-center">
          <p className="font-nunito text-purple-mid text-sm">Ton solde</p>
          <p className="font-bangers text-purple-dark text-5xl tracking-wide leading-none mt-1">
            {profile.solde}
          </p>
          <p className="font-nunito font-bold text-purple-mid text-lg">Blerhams</p>
        </div>
        <button
          onClick={() => setShowTransfer(true)}
          className="w-full py-3 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-base active:opacity-80 transition-opacity"
        >
          💸 Transférer des Blerhams
        </button>
      </div>

      {/* Événements */}
      {events.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-bangers text-purple-dark text-xl tracking-wide">Événements</h2>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {showTransfer && (
        <TransferModal
          profile={profile}
          onClose={() => setShowTransfer(false)}
          onSuccess={handleTransferSuccess}
        />
      )}

      {animation && (
        <TransferAnimation
          fromSolde={animation.from}
          toSolde={animation.to}
          coinPhotoUrl={coinPhotoUrl}
          onClose={() => setAnimation(null)}
        />
      )}
    </div>
  )
}
