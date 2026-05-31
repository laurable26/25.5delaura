import { useState, useCallback } from 'react'
import { TransferModal } from './TransferModal'
import { TransferAnimation } from '../ui/TransferAnimation'
import { useRealtimeSolde } from '../../hooks/useRealtime'
import type { Profile } from '../../types'

interface DashboardProps {
  profile: Profile
  coinPhotoUrl?: string | null
  onProfileUpdate: (p: Profile) => void
  showTransferFromDrawer?: boolean
  onTransferClose?: () => void
}

export function Dashboard({ profile, coinPhotoUrl, onProfileUpdate, showTransferFromDrawer, onTransferClose }: DashboardProps) {
  const [showTransfer, setShowTransfer] = useState(false)
  const [animation, setAnimation] = useState<{ from: number; to: number } | null>(null)

  const handleUpdate = useCallback((updated: Profile) => {
    onProfileUpdate(updated)
  }, [onProfileUpdate])

  useRealtimeSolde(profile.id, handleUpdate)

  const transferOpen = showTransfer || (showTransferFromDrawer ?? false)

  function handleTransferSuccess(newSolde: number) {
    setShowTransfer(false)
    onTransferClose?.()
    setAnimation({ from: profile.solde, to: newSolde })
  }

  function handleTransferClose() {
    setShowTransfer(false)
    onTransferClose?.()
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-8 pb-10">
      {/* Solde */}
      <div className="bg-white rounded-card-lg border border-border p-8 text-center shadow-sm">
        <p className="font-nunito text-purple-mid text-sm">Solde actuel</p>
        <p className="font-bangers text-purple-dark text-7xl tracking-wide leading-tight mt-2">
          {profile.solde} <span className="text-5xl">B</span>
        </p>
      </div>

      <p className="font-nunito text-purple-mid text-sm text-center">
        Appuie sur ta photo pour accéder au menu
      </p>

      {transferOpen && (
        <TransferModal
          profile={profile}
          onClose={handleTransferClose}
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
