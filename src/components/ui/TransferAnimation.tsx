import { useEffect, useState } from 'react'
import { BlerhamCoin } from './BlerhamCoin'

interface TransferAnimationProps {
  fromSolde: number
  toSolde: number
  coinPhotoUrl?: string | null
  onClose: () => void
}

export function TransferAnimation({ fromSolde, toSolde, coinPhotoUrl, onClose }: TransferAnimationProps) {
  const [displayed, setDisplayed] = useState(fromSolde)
  const isIncoming = toSolde > fromSolde
  const delta = Math.abs(toSolde - fromSolde)

  useEffect(() => {
    const diff = toSolde - fromSolde
    const steps = 30
    const stepValue = diff / steps
    let current = fromSolde
    let step = 0

    const timer = setInterval(() => {
      step++
      current += stepValue
      setDisplayed(Math.round(current))
      if (step >= steps) {
        setDisplayed(toSolde)
        clearInterval(timer)
      }
    }, 40)

    return () => clearInterval(timer)
  }, [fromSolde, toSolde])

  // Auto-close after 5 seconds
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-purple-dark bg-opacity-95">
      <div className="flex flex-col items-center gap-8 px-6">
        <h2 className="font-bangers text-yellow-fest text-4xl tracking-widest text-center">
          {isIncoming ? '🎉 Blerhams reçus !' : '💸 Transaction envoyée !'}
        </h2>

        <div style={{ perspective: '400px' }}>
          <div className="animate-spin-coin">
            <BlerhamCoin size={140} photoUrl={coinPhotoUrl} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className={`font-bangers text-5xl tracking-wide ${isIncoming ? 'text-green-fluo' : 'text-pink-fluo'}`}>
            {isIncoming ? '+' : '-'}{delta} <span className="text-3xl">B</span>
          </p>
          <p className="font-nunito text-white text-sm opacity-70 mt-1">Nouveau solde</p>
          <p className="font-bangers text-yellow-fest text-4xl tracking-wide">
            {displayed} <span className="text-2xl">Blerhams</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full max-w-xs py-4 rounded-btn bg-yellow-fest text-purple-dark font-nunito font-bold text-lg"
        >
          OK
        </button>
      </div>
    </div>
  )
}
