import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TransferModal } from './TransferModal'
import { TransferAnimation } from '../ui/TransferAnimation'
import { useRealtimeSolde } from '../../hooks/useRealtime'
import type { Profile } from '../../types'

// Mets à jour ces liens quand tu as les URLs définitives
const SPOTIFY_JAM_URL = 'https://open.spotify.com'
const POV_URL = 'https://photos.google.com'

interface DashboardProps {
  profile: Profile
  coinPhotoUrl?: string | null
  onProfileUpdate: (p: Profile) => void
}

interface AccesItem {
  label: string
  emoji: string
  action: 'navigate' | 'external' | 'transfer'
  target?: string
}

const ACCES_UTILES: AccesItem[] = [
  { label: 'Laurapiades',           emoji: '🏆', action: 'navigate',  target: '/laurapiades' },
  { label: 'Rejoindre la jam Spotify', emoji: '🎵', action: 'external', target: SPOTIFY_JAM_URL },
  { label: 'Rejoindre le POV',      emoji: '🎬', action: 'external',  target: POV_URL },
  { label: 'Transférer des Blerhams', emoji: '💸', action: 'transfer' },
]

export function Dashboard({ profile, coinPhotoUrl, onProfileUpdate }: DashboardProps) {
  const [showTransfer, setShowTransfer] = useState(false)
  const [animation, setAnimation] = useState<{ from: number; to: number } | null>(null)
  const navigate = useNavigate()

  const handleUpdate = useCallback((updated: Profile) => {
    onProfileUpdate(updated)
  }, [onProfileUpdate])

  useRealtimeSolde(profile.id, handleUpdate)

  function handleTransferSuccess(newSolde: number) {
    setShowTransfer(false)
    setAnimation({ from: profile.solde, to: newSolde })
  }

  function handleAcces(item: AccesItem) {
    if (item.action === 'navigate' && item.target) {
      navigate(item.target)
    } else if (item.action === 'external' && item.target) {
      window.open(item.target, '_blank', 'noopener,noreferrer')
    } else if (item.action === 'transfer') {
      setShowTransfer(true)
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-28">
      {/* Solde */}
      <div className="bg-white rounded-card-lg border border-border p-6 text-center shadow-sm">
        <p className="font-nunito text-purple-mid text-sm">Solde actuel</p>
        <p className="font-bangers text-purple-dark text-6xl tracking-wide leading-tight mt-1">
          {profile.solde} <span className="text-4xl">B</span>
        </p>
      </div>

      {/* Accès utiles */}
      <div className="flex flex-col gap-3">
        <h2 className="font-bangers text-purple-dark text-xl tracking-wide">Accès utiles</h2>
        {ACCES_UTILES.map((item) => (
          <button
            key={item.label}
            onClick={() => handleAcces(item)}
            className="w-full flex items-center gap-4 bg-white rounded-card border border-border px-4 py-4 active:bg-bg-main transition-colors text-left"
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="font-nunito font-bold text-purple-dark text-base">{item.label}</span>
            <span className="ml-auto text-purple-mid text-lg">›</span>
          </button>
        ))}
      </div>

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
