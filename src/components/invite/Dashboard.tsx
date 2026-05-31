import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TransferModal } from './TransferModal'
import { useRealtimeSolde } from '../../hooks/useRealtime'
import type { Profile, UserRole } from '../../types'

const SPOTIFY_JAM_URL = 'https://open.spotify.com/socialsession/7pSjdKRRmhsfbbR45KPiDl?si=Zj9FGwKSSDClDvCoEiUxeg&utm_source=share-options-sheet&utm_medium=share-link'
const POV_URL = 'https://pov.camera/qr/A92C2060-6326-4E0D-B20A-6EEF34018F90'

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

const BASE_ITEMS: AccesItem[] = [
  { label: 'Laurapiades',              emoji: '🏆', action: 'navigate', target: '/laurapiades' },
  { label: 'Rejoindre la jam Spotify', emoji: '🎵', action: 'external', target: SPOTIFY_JAM_URL },
  { label: 'Rejoindre le POV',         emoji: '🎬', action: 'external', target: POV_URL },
  { label: 'Transférer des Blerhams',  emoji: '💸', action: 'transfer' },
]

const JEUX_ITEMS: AccesItem[] = [
  { label: 'Admin : Épreuves',   emoji: '🎮', action: 'navigate', target: '/admin/epreuves' },
  { label: 'Admin : Rotations',  emoji: '🔄', action: 'navigate', target: '/admin/rotations' },
  { label: 'Admin : Classement', emoji: '📊', action: 'navigate', target: '/admin/classement' },
  { label: 'Admin : Équipes',    emoji: '👥', action: 'navigate', target: '/admin/equipes' },
]

const VENTES_ITEMS: AccesItem[] = [
  { label: 'Admin : Commande', emoji: '🛒', action: 'navigate', target: '/admin/depense' },
  { label: 'Admin : Catalogue', emoji: '📦', action: 'navigate', target: '/admin/catalogue' },
]

const GENERAL_ITEMS: AccesItem[] = [
  { label: 'Admin : Rôles',        emoji: '👑', action: 'navigate', target: '/admin/roles' },
  { label: 'Admin : Événements',   emoji: '🎪', action: 'navigate', target: '/admin/events' },
  { label: 'Admin : Bonus / Malus',emoji: '⚡', action: 'navigate', target: '/admin/bonus' },
]

function getItems(role: UserRole): AccesItem[] {
  if (role === 'admin_general') return [...BASE_ITEMS, ...JEUX_ITEMS, ...VENTES_ITEMS, ...GENERAL_ITEMS]
  if (role === 'admin_jeux')    return [...BASE_ITEMS, ...JEUX_ITEMS]
  if (role === 'admin_ventes')  return [...BASE_ITEMS, ...VENTES_ITEMS]
  return BASE_ITEMS
}

export function Dashboard({ profile, onProfileUpdate }: DashboardProps) {
  const [showTransfer, setShowTransfer] = useState(false)
  const navigate = useNavigate()

  const handleUpdate = useCallback((updated: Profile) => {
    onProfileUpdate(updated)
  }, [onProfileUpdate])

  useRealtimeSolde(profile.id, handleUpdate)

  function handleTransferSuccess(newSolde: number) {
    setShowTransfer(false)
    onProfileUpdate({ ...profile, solde: newSolde })
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

  const items = getItems(profile.role)

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-10">
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
        {items.map((item) => (
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
    </div>
  )
}
