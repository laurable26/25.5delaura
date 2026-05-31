import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title: string
  subtitle?: string
  profilePhotoUrl?: string | null
  profilePrenom?: string
  showBack?: boolean
}

export function Header({ title, subtitle, profilePhotoUrl, profilePrenom, showBack }: HeaderProps) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-30 bg-bg-main border-b border-border px-4 py-3 flex items-center gap-3">
      {showBack && (
        <button
          onClick={() => navigate('/')}
          className="flex-shrink-0 text-purple-mid font-nunito text-xl leading-none pr-1"
          aria-label="Retour"
        >
          ←
        </button>
      )}
      {profilePhotoUrl !== undefined && (
        <div className="flex-shrink-0">
          {profilePhotoUrl ? (
            <img
              src={profilePhotoUrl}
              alt={profilePrenom ?? ''}
              className="w-9 h-9 rounded-full object-cover border-2 border-yellow-fest"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-base border-2 border-yellow-fest">
              {profilePrenom?.[0] ?? '?'}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="font-bangers text-purple-dark text-2xl tracking-wide leading-none truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="font-nunito text-purple-mid text-sm leading-none mt-0.5">{subtitle}</p>
        )}
      </div>
    </header>
  )
}
