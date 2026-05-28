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

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-purple-dark bg-opacity-95">
      <div className="flex flex-col items-center gap-8 px-6">
        <h2 className="font-bangers text-yellow-fest text-4xl tracking-widest text-center">
          Transfert envoyé !
        </h2>

        <div style={{ perspective: '400px' }}>
          <div className="animate-spin-coin">
            <BlerhamCoin size={120} photoUrl={coinPhotoUrl} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="font-nunito text-white text-sm opacity-70">Nouveau solde</p>
          <p className="font-bangers text-yellow-fest text-5xl tracking-wide">
            {displayed} <span className="text-3xl">Blerhams</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full max-w-xs py-4 rounded-btn bg-yellow-fest text-purple-dark font-nunito font-900 text-lg"
        >
          Terminé
        </button>
      </div>
    </div>
  )
}
