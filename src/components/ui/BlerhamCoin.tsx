import { useState } from 'react'

interface BlerhamCoinProps {
  size?: number
  spinning?: boolean
  photoUrl?: string | null
}

export function BlerhamCoin({ size = 80, spinning = false, photoUrl }: BlerhamCoinProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      className={`rounded-full overflow-hidden border-4 border-yellow-fest shadow-lg flex-shrink-0 ${spinning ? 'animate-spin-coin' : ''}`}
      style={{ width: size, height: size }}
    >
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt="Blerham"
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-purple-dark font-bangers"
          style={{ fontSize: size * 0.35, backgroundColor: '#FFE600' }}
        >
          B
        </div>
      )}
    </div>
  )
}
