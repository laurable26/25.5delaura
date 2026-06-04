import { useState } from 'react'

interface PinInputProps {
  onComplete: (pin: string) => void
  disabled?: boolean
  error?: string | null
}

const HEART_PATH = "M 50 28 C 50 22, 34 8, 18 16 C 2 24, 2 46, 18 60 L 50 86 L 82 60 C 98 46, 98 24, 82 16 C 66 8, 50 22, 50 28 Z"

export function PinInput({ onComplete, disabled, error }: PinInputProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', ''])

  function handleDigit(value: string) {
    if (disabled) return
    const newDigits = [...digits]
    const idx = newDigits.findIndex((d) => d === '')
    if (idx === -1) return
    newDigits[idx] = value
    setDigits(newDigits)
    if (idx === 3) {
      onComplete(newDigits.join(''))
      setTimeout(() => setDigits(['', '', '', '']), 400)
    }
  }

  function handleDelete() {
    if (disabled) return
    const newDigits = [...digits]
    const lastFilled = [...newDigits].reverse().findIndex((d) => d !== '')
    if (lastFilled === -1) return
    newDigits[3 - lastFilled] = ''
    setDigits(newDigits)
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Dots */}
      <div className="flex gap-4">
        {digits.map((d, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              d ? 'bg-purple-dark border-purple-dark' : 'border-purple-mid bg-transparent'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-pink-fluo font-nunito text-sm font-bold">{error}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {keys.map((key, i) => {
          if (key === '') return <div key={i} />
          return (
            <button
              key={i}
              onClick={() => (key === '⌫' ? handleDelete() : handleDigit(key))}
              disabled={disabled}
              className="aspect-square w-full relative flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
            >
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))' }}
              >
                <path
                  d={HEART_PATH}
                  fill="white"
                  stroke="#e2e0ec"
                  strokeWidth="2"
                />
              </svg>
              <span className="relative z-10 font-nunito font-bold text-purple-dark text-xl leading-none">
                {key}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
