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

  // Create form
  const [formNom, setFormNom] = useState('')
  const [formEmoji, setFormEmoji] = useState('')
  const [formPrix, setFormPrix] = useState('')
  const [formStock, setFormStock] = useState('')
  const [formCategorie, setFormCategorie] = useState('')
  const [formEventId, setFormEventId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editPrix, setEditPrix] = useState('')
  const [editCategorie, setEditCategorie] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: productsData }, { data: eventsData }] = await Promise.all([
      supabase.from('products').select('*').order('categorie', { nullsFirst: false }).order('nom'),
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
      categorie: formCategorie.trim() || null,
      event_id: formEventId || null,
      actif: true,
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setFormNom(''); setFormEmoji(''); setFormPrix('')
      setFormStock(''); setFormCategorie(''); setFormEventId('')
      setShowForm(false)
      await load()
    }
    setSubmitting(false)
  }

  function startEdit(product: Product) {
    setEditingId(product.id)
    setEditNom(product.nom)
    setEditEmoji(product.emoji ?? '')
    setEditPrix(String(product.prix_blerhams))
    setEditCategorie(product.categorie ?? '')
  }

  async function handleSaveEdit(productId: string) {
    if (!editNom.trim() || !editPrix) return
    setEditSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('products')
      .update({
        nom: editNom.trim(),
        emoji: editEmoji.trim() || null,
        prix_blerhams: parseInt(editPrix),
        categorie: editCategorie.trim() || null,
      })
      .eq('id', productId)
    if (updateError) {
      setError(updateError.message)
    } else {
      setProducts((prev) => prev.map((p) =>
        p.id === productId
          ? { ...p, nom: editNom.trim(), emoji: editEmoji.trim() || null, prix_blerhams: parseInt(editPrix), categorie: editCategorie.trim() || null }
          : p
      ))
      setEditingId(null)
    }
    setEditSaving(false)
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
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, actif: !product.actif } : p))
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
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock: newStock } : p))
    }
    setUpdating(null)
  }

  // Existing categories for datalist suggestions
  const categories = [...new Set(products.map((p) => p.categorie).filter(Boolean))] as string[]

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
              placeholder="🍺"
              value={formEmoji}
              onChange={(e) => setFormEmoji(e.target.value)}
              className="w-14 border border-border rounded-btn px-2 py-2 font-nunito text-purple-dark text-sm bg-bg-main text-center"
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
                placeholder="5"
                value={formPrix}
                onChange={(e) => setFormPrix(e.target.value)}
                className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
              />
            </div>
            <div className="flex-1">
              <label className="font-nunito text-xs text-purple-mid block mb-1">Stock</label>
              <input
                type="number"
                placeholder="20"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
              />
            </div>
          </div>
          <div>
            <label className="font-nunito text-xs text-purple-mid block mb-1">Catégorie</label>
            <input
              list="categories-list"
              type="text"
              placeholder="ex: Boissons, Nourriture..."
              value={formCategorie}
              onChange={(e) => setFormCategorie(e.target.value)}
              className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
            />
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

      <datalist id="categories-list">
        {categories.map((c) => <option key={c} value={c} />)}
      </datalist>

      <div className="flex flex-col gap-3">
        {products.map((product) => {
          const linkedEvent = repasEvents.find((e) => e.id === product.event_id)
          const isEditing = editingId === product.id
          return (
            <div
              key={product.id}
              className={`bg-white rounded-card border p-4 flex flex-col gap-3 ${product.actif ? 'border-border' : 'border-border opacity-60'}`}
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{product.emoji ?? '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-nunito font-bold text-purple-dark truncate">{product.nom}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bangers text-purple-dark">{product.prix_blerhams}B</span>
                    {product.categorie && (
                      <span className="font-nunito text-xs bg-purple-mid bg-opacity-10 text-purple-mid px-2 py-0.5 rounded-full">{product.categorie}</span>
                    )}
                    {linkedEvent && (
                      <span className="font-nunito text-xs text-purple-mid">· {linkedEvent.nom}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActif(product)}
                    disabled={updating === product.id}
                    className={`px-2 py-1 rounded-btn font-nunito font-bold text-xs active:opacity-80 disabled:opacity-50 ${product.actif ? 'bg-green-fluo text-purple-dark' : 'bg-bg-main border border-border text-purple-mid'}`}
                  >
                    {product.actif ? 'Actif' : 'Inactif'}
                  </button>
                  <button
                    onClick={() => isEditing ? setEditingId(null) : startEdit(product)}
                    className="w-7 h-7 flex items-center justify-center rounded bg-bg-main border border-border text-purple-mid text-sm active:opacity-60"
                  >
                    {isEditing ? '✕' : '✏️'}
                  </button>
                </div>
              </div>

              {/* Inline edit */}
              {isEditing && (
                <div className="border-t border-border pt-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="🍺"
                      value={editEmoji}
                      onChange={(e) => setEditEmoji(e.target.value)}
                      className="w-14 border border-border rounded-btn px-2 py-2 font-nunito text-purple-dark text-sm bg-bg-main text-center"
                    />
                    <input
                      autoFocus
                      type="text"
                      value={editNom}
                      onChange={(e) => setEditNom(e.target.value)}
                      className="flex-1 border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="font-nunito text-xs text-purple-mid block mb-1">Prix (B)</label>
                      <input
                        type="number"
                        value={editPrix}
                        onChange={(e) => setEditPrix(e.target.value)}
                        className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="font-nunito text-xs text-purple-mid block mb-1">Catégorie</label>
                      <input
                        list="categories-list"
                        type="text"
                        value={editCategorie}
                        onChange={(e) => setEditCategorie(e.target.value)}
                        className="w-full border border-border rounded-btn px-3 py-2 font-nunito text-purple-dark text-sm bg-bg-main"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(product.id)}
                      disabled={editSaving || !editNom.trim() || !editPrix}
                      className="flex-1 py-2 rounded-btn bg-yellow-fest text-purple-dark font-nunito font-bold text-sm disabled:opacity-50"
                    >
                      {editSaving ? '...' : '✓ Sauvegarder'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded-btn bg-bg-main border border-border font-nunito text-purple-mid text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Stock */}
              {!isEditing && (
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <span className="font-nunito text-purple-mid text-sm">Stock :</span>
                  <button
                    onClick={() => handleUpdateStock(product.id, Math.max(0, product.stock - 1))}
                    disabled={updating === product.id || product.stock === 0}
                    className="w-8 h-8 rounded-btn bg-bg-main border border-border font-nunito font-bold text-purple-dark disabled:opacity-50 active:opacity-80"
                  >
                    −
                  </button>
                  <span className="font-bangers text-purple-dark text-xl w-8 text-center">{product.stock}</span>
                  <button
                    onClick={() => handleUpdateStock(product.id, product.stock + 1)}
                    disabled={updating === product.id}
                    className="w-8 h-8 rounded-btn bg-bg-main border border-border font-nunito font-bold text-purple-dark disabled:opacity-50 active:opacity-80"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {products.length === 0 && (
          <p className="font-nunito text-purple-mid text-sm text-center py-4">Aucun produit dans le catalogue.</p>
        )}
      </div>
    </div>
  )
}
