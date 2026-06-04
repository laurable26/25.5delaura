import { useState } from 'react'

interface PinInputProps {
  onComplete: (pin: string) => void
  disabled?: boolean
  error?: string | null
}

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
    <div className="flex flex-col items-center gap-6">
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
      <div className="grid grid-cols-3 gap-4 w-full max-w-sm px-2">
        {keys.map((key, i) => {
          if (key === '') return <div key={i} />
          return (
            <button
              key={i}
              onClick={() => (key === '⌫' ? handleDelete() : handleDigit(key))}
              disabled={disabled}
              className="h-16 rounded-btn bg-white border border-border text-purple-dark font-nunito font-bold text-2xl active:bg-bg-main transition-colors disabled:opacity-50"
            >
              {key}
            </button>
          )
        })}
      </div>
    </div>
  )
}
