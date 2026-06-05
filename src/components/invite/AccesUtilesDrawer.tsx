import { useNavigate } from 'react-router-dom'
import type { Profile, UserRole } from '../../types'

interface AccesItem {
  label: string
  emoji: string
  action: 'navigate' | 'external' | 'transfer'
  target?: string
  admin?: boolean
}

const SPOTIFY_JAM_URL = 'https://spotify.link/ZQEcZuQzJ3b'
const POV_URL = 'https://pov.camera/qr/A92C2060-6326-4E0D-B20A-6EEF34018F90'

const BASE_ITEMS: AccesItem[] = [
  { label: 'Laurapiades',              emoji: '🏆', action: 'navigate', target: '/laurapiades' },
  { label: 'Rejoindre la jam Spotify', emoji: '🎵', action: 'external', target: SPOTIFY_JAM_URL },
  { label: 'Rejoindre le POV',         emoji: '🎬', action: 'external', target: POV_URL },
  { label: 'Transférer des Blerhams',  emoji: '💸', action: 'transfer' },
  { label: 'Mon Profil',               emoji: '👤', action: 'navigate', target: '/profil' },
]

const JEUX_ITEMS: AccesItem[] = [
  { label: 'Admin : Laurapiades 🏆', emoji: '🏆', action: 'navigate', target: '/admin/laurapiades', admin: true },
  { label: 'Admin : Épreuves',       emoji: '🎮', action: 'navigate', target: '/admin/epreuves',    admin: true },
  { label: 'Admin : Classement',     emoji: '📊', action: 'navigate', target: '/admin/classement',  admin: true },
  { label: 'Admin : Équipes',        emoji: '👥', action: 'navigate', target: '/admin/equipes',     admin: true },
]

const VENTES_ITEMS: AccesItem[] = [
  { label: 'Admin : Dépense',   emoji: '🛒', action: 'navigate', target: '/admin/depense',   admin: true },
  { label: 'Admin : Catalogue', emoji: '📦', action: 'navigate', target: '/admin/catalogue', admin: true },
]

const GENERAL_ITEMS: AccesItem[] = [
  { label: 'Admin : Rôles',        emoji: '👑', action: 'navigate', target: '/admin/roles',  admin: true },
  { label: 'Admin : Événements',   emoji: '🎪', action: 'navigate', target: '/admin/events', admin: true },
  { label: 'Admin : Bonus / Malus',emoji: '⚡', action: 'navigate', target: '/admin/bonus',  admin: true },
]

function getAllItems(): AccesItem[] {
  return [...BASE_ITEMS, ...JEUX_ITEMS, ...VENTES_ITEMS, ...GENERAL_ITEMS]
}

function isAllowed(item: AccesItem, role: UserRole): boolean {
  if (!item.admin) return true
  if (role === 'admin_general') return true
  if (role === 'admin_jeux')    return JEUX_ITEMS.includes(item)
  if (role === 'admin_ventes')  return VENTES_ITEMS.includes(item)
  return false
}

interface AccesUtilesDrawerProps {
  profile: Profile
  open: boolean
  onClose: () => void
  onTransfer: () => void
}

export function AccesUtilesDrawer({ profile, open, onClose, onTransfer }: AccesUtilesDrawerProps) {
  const navigate = useNavigate()

  if (!open) return null

  function handleItem(item: AccesItem) {
    if (item.action === 'navigate' && item.target) {
      navigate(item.target)
      onClose()
    } else if (item.action === 'external' && item.target) {
      window.open(item.target, '_blank', 'noopener,noreferrer')
      onClose()
    } else if (item.action === 'transfer') {
      onClose()
      onTransfer()
    }
  }

  const items = getAllItems()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-bg-main rounded-t-2xl z-50 max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Profile header */}
        <div className="flex items-center gap-3 px-4 pb-4 border-b border-border">
          {profile.photo_url ? (
            <img src={profile.photo_url} alt={profile.prenom} className="w-12 h-12 rounded-full object-cover border-2 border-yellow-fest" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-xl border-2 border-yellow-fest">
              {profile.prenom[0]}
            </div>
          )}
          <div>
            <p className="font-bangers text-purple-dark text-xl tracking-wide leading-tight">{profile.prenom}</p>
            <p className="font-bangers text-purple-dark text-2xl leading-tight">{profile.solde} B</p>
          </div>
        </div>

        {/* Items */}
        <div className="flex flex-col gap-2 p-4 pb-10">
          {items.map((item) => {
            const allowed = isAllowed(item, profile.role)
            return (
              <button
                key={item.label}
                onClick={() => allowed && handleItem(item)}
                disabled={!allowed}
                className={`w-full flex items-center gap-4 rounded-card border px-4 py-3 transition-colors text-left ${
                  !allowed
                    ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                    : item.admin
                    ? 'bg-purple-dark/5 border-purple-dark/20 active:opacity-70'
                    : 'bg-white border-border active:opacity-70'
                }`}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className={`font-nunito font-bold text-base ${!allowed ? 'text-gray-400' : item.admin ? 'text-purple-dark/80' : 'text-purple-dark'}`}>
                  {item.label}
                </span>
                <span className={`ml-auto text-lg ${!allowed ? 'text-gray-300' : 'text-purple-mid'}`}>›</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

