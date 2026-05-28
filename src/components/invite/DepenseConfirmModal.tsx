import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { PinInput } from '../ui/PinInput'
import { usePin } from '../../hooks/usePin'
import type { Transaction, Product } from '../../types'

interface DepenseConfirmModalProps {
  transactionId: string
  pinHash: string
  onDone: () => void
}

export function DepenseConfirmModal({ transactionId, pinHash, onDone }: DepenseConfirmModalProps) {
  const [tx, setTx] = useState<Transaction | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const { checkPin, verifying, error: pinError } = usePin(pinHash)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single()

      if (data) {
        setTx(data as Transaction)
        if (data.product_ids && Array.isArray(data.product_ids)) {
          const ids = data.product_ids.map((p: { product_id: string }) => p.product_id)
          const { data: prods } = await supabase
            .from('products')
            .select('*')
            .in('id', ids)
          setProducts((prods ?? []) as Product[])
        }
      }
      setLoading(false)
    }
    load()
  }, [transactionId])

  async function handlePin(pin: string) {
    const valid = await checkPin(pin)
    if (!valid) return

    setProcessing(true)
    const { error } = await supabase.rpc('valider_depense', {
      p_transaction_id: transactionId,
    })

    if (!error) {
      setDone(true)
      setTimeout(onDone, 1800)
    }
    setProcessing(false)
  }

  async function handleRefuse() {
    await supabase
      .from('transactions')
      .update({ statut: 'annulee' })
      .eq('id', transactionId)
    onDone()
  }

  if (loading || !tx) return null

  const productLines = tx.product_ids as { product_id: string; qty: number }[] | null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-purple-dark bg-opacity-95">
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {done ? (
          <div className="flex flex-col items-center gap-4">
            <span className="text-6xl">✅</span>
            <p className="font-bangers text-yellow-fest text-3xl tracking-wide text-center">
              Paiement validé !
            </p>
            <p className="font-nunito text-white text-lg font-bold">
              -{tx.montant} Blerhams
            </p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="font-bangers text-yellow-fest text-3xl tracking-wide">
                Commande 🛒
              </h2>
              <p className="font-nunito text-white opacity-70 mt-1 text-sm">
                L'équipe ventes veut te facturer
              </p>
            </div>

            {/* Order details */}
            <div className="w-full bg-white bg-opacity-10 rounded-card p-4 flex flex-col gap-2">
              {productLines && productLines.map((line) => {
                const prod = products.find((p) => p.id === line.product_id)
                return (
                  <div key={line.product_id} className="flex justify-between items-center">
                    <span className="font-nunito text-white">
                      {prod?.emoji} {prod?.nom ?? '?'} × {line.qty}
                    </span>
                    <span className="font-nunito text-yellow-fest font-bold">
                      {(prod?.prix_blerhams ?? 0) * line.qty} B
                    </span>
                  </div>
                )
              })}
              {!productLines && tx.description && (
                <p className="font-nunito text-white">{tx.description}</p>
              )}
              <div className="border-t border-white border-opacity-20 pt-2 flex justify-between items-center">
                <span className="font-nunito font-bold text-white">Total</span>
                <span className="font-bangers text-yellow-fest text-2xl">{tx.montant} Blerhams</span>
              </div>
            </div>

            <div className="text-center">
              <p className="font-nunito text-white text-sm mb-4">
                Saisis ton PIN pour confirmer
              </p>
              <PinInput
                onComplete={handlePin}
                disabled={verifying || processing}
                error={pinError}
              />
            </div>

            <button
              onClick={handleRefuse}
              className="font-nunito text-white opacity-50 text-sm underline"
            >
              Refuser la commande
            </button>
          </>
        )}
      </div>
    </div>
  )
}
