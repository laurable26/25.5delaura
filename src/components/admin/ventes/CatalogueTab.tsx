import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Product, Event } from '../../../types'

export function CatalogueTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [repasEvents, setRepasEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  // Form state
  const [formNom, setFormNom] = useState('')
  const [formEmoji, setFormEmoji] = useState('')
  const [formPrix, setFormPrix] = useState('')
  const [formStock, setFormStock] = useState('')
  const [formEventId, setFormEventId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: productsData }, { data: eventsData }] = await Promise.all([
      supabase.from('products').select('*').order('nom'),
      supabase.from('events').select('*').eq('type', 'repas').order('nom'),
    ])
    setProducts(productsData ?? [])
    setRepasEvents(eventsData ?? [])
    setLoading(false)
  }

  async function handleCreate() {
    if (!formNom.trim() || !formPrix || !formStock) return
    setSubmitting(true)
    setError(null)
    const { error: insertError } = await supabase.from('products').insert({
      nom: formNom.trim(),
      emoji: formEmoji.trim() || null,
      prix_blerhams: parseInt(formPrix),
      stock: parseInt(formStock),
      event_id: formEventId || null,
      actif: true,
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setFormNom('')
      setFormEmoji('')
      setFormPrix('')
      setFormStock('')
      setFormEventId('')
      setShowForm(false)
      await load()
    }
    setSubmitting(false)
  }

  async function handleToggleActif(product: Product) {
    setUpdating(product.id)
    const { error: updateError } = await supabase
      .from('products')
      .update({ actif: !product.actif })
      .eq('id', product.id)
    if (updateError) {
      setError(updateError.message)
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, actif: !product.actif } : p))
      )
    }
    setUpdating(null)
  }

  async function handleUpdateStock(productId: string, newStock: number) {
    setUpdating(productId)
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId)
    if (updateError) {
      setError(updateError.message)
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
      )
    }
    setUpdating(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <p className="font-nunito text-purple-mid">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Catalogue</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-sm active:opacity-80"
        >
          {showForm ? 'Annuler' : '+ Produit'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-card p-3">
          <p className="font-nunito text-red-600 text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-card border border-border p-4 flex flex-col gap-3">
          <p className="font-nunito font-bold text-purple-dark">Nouveau produit</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Emoji"
              value={formEmoji}
              onChange={(e) => setFormEmoji(e.target.value)}
              className="w-16 border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main text-center"
            />
            <input
              type="text"
              placeholder="Nom du produit"
              value={formNom}
              onChange={(e) => setFormNom(e.target.value)}
              className="flex-1 border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="font-nunito text-xs text-purple-mid block mb-1">Prix (B)</label>
              <input
                type="number"
                placeholder="Prix"
                value={formPrix}
                onChange={(e) => setFormPrix(e.target.value)}
                className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
              />
            </div>
            <div className="flex-1">
              <label className="font-nunito text-xs text-purple-mid block mb-1">Stock</label>
              <input
                type="number"
                placeholder="Stock"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
              />
            </div>
          </div>
          {repasEvents.length > 0 && (
            <div>
              <label className="font-nunito text-xs text-purple-mid block mb-1">Associer à un repas</label>
              <select
                value={formEventId}
                onChange={(e) => setFormEventId(e.target.value)}
                className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
              >
                <option value="">Sans événement</option>
                {repasEvents.map((e) => (
                  <option key={e.id} value={e.id}>{e.nom}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={submitting || !formNom.trim() || !formPrix || !formStock}
            className="py-2 rounded-btn bg-yellow-fest text-purple-dark font-nunito font-bold text-sm disabled:opacity-50 active:opacity-80"
          >
            {submitting ? 'Création...' : 'Créer le produit'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {products.map((product) => {
          const linkedEvent = repasEvents.find((e) => e.id === product.event_id)
          return (
            <div
              key={product.id}
              className={`bg-white rounded-card border p-4 ${
                product.actif ? 'border-border' : 'border-border opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{product.emoji ?? '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-nunito font-bold text-purple-dark truncate">{product.nom}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bangers text-purple-dark">{product.prix_blerhams}B</span>
                    {linkedEvent && (
                      <span className="font-nunito text-xs text-purple-mid">· {linkedEvent.nom}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActif(product)}
                  disabled={updating === product.id}
                  className={`px-3 py-1 rounded-btn font-nunito font-bold text-xs active:opacity-80 disabled:opacity-50 ${
                    product.actif
                      ? 'bg-green-fluo text-purple-dark'
                      : 'bg-bg-main border border-border text-purple-mid'
                  }`}
                >
                  {product.actif ? 'Actif' : 'Inactif'}
                </button>
              </div>

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                <span className="font-nunito text-purple-mid text-sm">Stock :</span>
                <button
                  onClick={() => handleUpdateStock(product.id, Math.max(0, product.stock - 1))}
                  disabled={updating === product.id || product.stock === 0}
                  className="w-8 h-8 rounded-btn bg-bg-main border border-border font-nunito font-bold text-purple-dark disabled:opacity-50 active:opacity-80"
                >
                  −
                </button>
                <span className="font-bangers text-purple-dark text-xl w-8 text-center">
                  {product.stock}
                </span>
                <button
                  onClick={() => handleUpdateStock(product.id, product.stock + 1)}
                  disabled={updating === product.id}
                  className="w-8 h-8 rounded-btn bg-bg-main border border-border font-nunito font-bold text-purple-dark disabled:opacity-50 active:opacity-80"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
        {products.length === 0 && (
          <p className="font-nunito text-purple-mid text-sm text-center py-4">
            Aucun produit dans le catalogue.
          </p>
        )}
      </div>
    </div>
  )
}
