import type { Event } from '../../types'

interface EventCardProps {
  event: Event
  onClick?: () => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  const isActive = event.statut === 'en_cours'
  const isDone = event.statut === 'termine'

  return (
    <button
      onClick={isActive ? onClick : undefined}
      disabled={!isActive}
      className={`w-full text-left rounded-card border border-border p-4 flex items-center gap-3 transition-all ${
        isActive
          ? 'bg-white shadow-md active:scale-95'
          : isDone
          ? 'bg-white opacity-50'
          : 'bg-white opacity-40'
      }`}
    >
      {event.photo_url && (
        <img
          src={event.photo_url}
          alt={event.nom}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-nunito font-bold text-purple-dark truncate">{event.nom}</p>
        <p className={`text-sm font-nunito ${isActive ? 'text-green-fluo' : 'text-purple-mid'}`}>
          {event.statut === 'a_venir' ? '⏳ À venir' : event.statut === 'en_cours' ? '🟢 En cours' : '✓ Terminé'}
        </p>
      </div>
      {!isActive && (
        <span className="text-purple-mid text-xs font-nunito bg-bg-main px-2 py-1 rounded-full">
          {event.statut === 'a_venir' ? 'Bientôt' : 'Terminé'}
        </span>
      )}
    </button>
  )
}
