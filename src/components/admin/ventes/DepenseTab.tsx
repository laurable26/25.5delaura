import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Profile, Product, Transaction } from '../../../types'

interface OrderItem {
  product: Product
  qty: number
}

type ViewState = 'select_user' | 'build_order' | 'waiting'

export function DepenseTab() {
  const [view, setView] = useState<ViewState>('select_user')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingTxId, setPendingTxId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: profilesData }, { data: productsData }] = await Promise.all([
        supabase.from('profiles').select('*').order('prenom'),
        supabase.from('products').select('*').eq('actif', true).order('nom'),
      ])
      setProfiles(profilesData ?? [])
      setProducts(productsData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Watch for transaction status change
  useEffect(() => {
    if (!pendingTxId) return

    const channel = supabase
      .channel(`tx-status-${pendingTxId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${pendingTxId}`,
        },
        (payload) => {
          const tx = payload.new as Transaction
          if (tx.statut === 'validee') {
            // Success - reset
            setPendingTxId(null)
            setView('select_user')
            setSelectedUser(null)
            setOrderItems([])
            setError(null)
            // Refresh profiles for updated solde
            supabase.from('profiles').select('*').order('prenom').then(({ data }) => {
              if (data) setProfiles(data)
            })
          } else if (tx.statut === 'annulee') {
            setPendingTxId(null)
            setError('Transaction annulée par l\'utilisateur.')
            setView('build_order')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pendingTxId])

  const orderTotal = orderItems.reduce(
    (sum, item) => sum + item.product.prix_blerhams * item.qty,
    0
  )

  function handleSelectUser(profile: Profile) {
    setSelectedUser(profile)
    setView('build_order')
    setOrderItems([])
    setError(null)
  }

  function handleQtyChange(product: Product, delta: number) {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (!existing) {
        if (delta > 0) return [...prev, { product, qty: delta }]
        return prev
      }
      const newQty = existing.qty + delta
      if (newQty <= 0) return prev.filter((i) => i.product.id !== product.id)
      return prev.map((i) =>
        i.product.id === product.id ? { ...i, qty: newQty } : i
      )
    })
  }

  async function handleValidate() {
    if (!selectedUser || orderItems.length === 0) return
    setSubmitting(true)
    setError(null)

    const productIds = orderItems.map((item) => ({
      product_id: item.product.id,
      qty: item.qty,
    }))

    const { data, error: insertError } = await supabase
      .from('transactions')
      .insert({
        type: 'depense',
        emetteur_id: null,
        receveur_id: selectedUser.id,
        montant: orderTotal,
        description: `Commande: ${orderItems.map((i) => `${i.qty}x ${i.product.nom}`).join(', ')}`,
        product_ids: productIds,
        statut: 'en_attente',
      })
      .select()
      .single()

    if (insertError || !data) {
      setError(insertError?.message ?? 'Erreur lors de la création')
      setSubmitting(false)
      return
    }

    setPendingTxId(data.id)
    setView('waiting')
    setSubmitting(false)
  }

  function handleCancel() {
    setPendingTxId(null)
    setView('build_order')
    setError(null)
  }

  const filteredProfiles = search
    ? profiles.filter((p) =>
        p.prenom.toLowerCase().includes(search.toLowerCase())
      )
    : profiles

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <p className="font-nunito text-purple-mid">Chargement...</p>
      </div>
    )
  }

  // Waiting for PIN confirmation
  if (view === 'waiting' && selectedUser) {
    return (
      <div className="flex flex-col items-center gap-6 px-4 pt-20 pb-28">
        <div className="w-20 h-20 rounded-full border-4 border-pink-fluo border-t-transparent animate-spin" />
        <div className="text-center">
          <p className="font-bangers text-purple-dark text-2xl tracking-wide">
            En attente...
          </p>
          <p className="font-nunito text-purple-mid text-base mt-2">
            En attente de confirmation PIN de{' '}
            <span className="font-bold text-purple-dark">{selectedUser.prenom}</span>
          </p>
        </div>
        <div className="bg-white rounded-card border border-border p-4 w-full">
          <p className="font-nunito font-bold text-purple-dark text-sm mb-2">Commande :</p>
          {orderItems.map((item) => (
            <div key={item.product.id} className="flex justify-between py-1">
              <span className="font-nunito text-purple-dark text-sm">
                {item.product.emoji} {item.qty}× {item.product.nom}
              </span>
              <span className="font-nunito font-bold text-purple-dark text-sm">
                {item.product.prix_blerhams * item.qty}B
              </span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 flex justify-between">
            <span className="font-nunito font-bold text-purple-dark">Total</span>
            <span className="font-bangers text-purple-dark text-lg">{orderTotal}B</span>
          </div>
        </div>
        <button
          onClick={handleCancel}
          className="px-6 py-2 rounded-btn bg-bg-main border border-border font-nunito text-purple-dark text-sm active:opacity-80"
        >
          Annuler
        </button>
      </div>
    )
  }

  // Build order view
  if (view === 'build_order' && selectedUser) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setView('select_user')
              setSelectedUser(null)
              setOrderItems([])
              setError(null)
            }}
            className="text-purple-mid font-nunito text-sm active:opacity-80"
          >
            ← Retour
          </button>
          <div className="flex items-center gap-2 flex-1">
            {selectedUser.photo_url ? (
              <img
                src={selectedUser.photo_url}
                alt={selectedUser.prenom}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-sm">
                {selectedUser.prenom[0]}
              </div>
            )}
            <div>
              <p className="font-nunito font-bold text-purple-dark text-sm">{selectedUser.prenom}</p>
              <p className="font-nunito text-purple-mid text-xs">{selectedUser.solde}B</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-card p-3">
            <p className="font-nunito text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {products.length === 0 && (
            <p className="font-nunito text-purple-mid text-sm text-center py-4">Aucun produit actif.</p>
          )}
          {(() => {
            // Group by categorie
            const grouped: { label: string | null; items: typeof products }[] = []
            const seen = new Set<string | null>()
            for (const p of products) {
              if (!seen.has(p.categorie)) {
                seen.add(p.categorie)
                grouped.push({ label: p.categorie, items: products.filter((x) => x.categorie === p.categorie) })
              }
            }
            // Sort: named categories first, null last
            grouped.sort((a, b) => {
              if (a.label === null) return 1
              if (b.label === null) return -1
              return a.label.localeCompare(b.label)
            })
            return grouped.map(({ label, items }) => (
              <div key={label ?? '__sans__'} className="flex flex-col gap-2">
                {label && (
                  <h3 className="font-bangers text-purple-dark text-lg tracking-wide px-1">{label}</h3>
                )}
                {!label && grouped.some((g) => g.label !== null) && (
                  <h3 className="font-bangers text-purple-mid text-base tracking-wide px-1">Autres</h3>
                )}
                {items.map((product) => {
                  const item = orderItems.find((i) => i.product.id === product.id)
                  const qty = item?.qty ?? 0
                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-card border border-border p-3 flex items-center gap-3"
                    >
                      <span className="text-2xl flex-shrink-0">{product.emoji ?? '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-nunito font-bold text-purple-dark text-sm truncate">{product.nom}</p>
                        <p className="font-nunito text-purple-mid text-xs">
                          {product.prix_blerhams}B · Stock: {product.stock}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQtyChange(product, -1)}
                          disabled={qty === 0}
                          className="w-8 h-8 rounded-btn bg-bg-main border border-border font-nunito font-bold text-purple-dark disabled:opacity-30 active:opacity-80"
                        >
                          −
                        </button>
                        <span className={`font-bangers text-lg w-6 text-center ${qty > 0 ? 'text-pink-fluo' : 'text-purple-dark'}`}>{qty}</span>
                        <button
                          onClick={() => handleQtyChange(product, 1)}
                          disabled={qty >= product.stock}
                          className="w-8 h-8 rounded-btn bg-bg-main border border-border font-nunito font-bold text-purple-dark disabled:opacity-30 active:opacity-80"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          })()}
        </div>

        {orderItems.length > 0 && (
          <div className="bg-white rounded-card border border-border p-4 flex flex-col gap-3">
            <h3 className="font-nunito font-bold text-purple-dark">Commande</h3>
            {orderItems.map((item) => (
              <div key={item.product.id} className="flex justify-between">
                <span className="font-nunito text-purple-dark text-sm">
                  {item.product.emoji} {item.qty}× {item.product.nom}
                </span>
                <span className="font-nunito font-bold text-purple-dark text-sm">
                  {item.product.prix_blerhams * item.qty}B
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-nunito font-bold text-purple-dark">Total</span>
              <span className="font-bangers text-purple-dark text-xl">{orderTotal}B</span>
            </div>
            {orderTotal > selectedUser.solde && (
              <p className="font-nunito text-red-500 text-xs">
                Solde insuffisant ({selectedUser.solde}B disponibles)
              </p>
            )}
            <button
              onClick={handleValidate}
              disabled={submitting || orderTotal > selectedUser.solde}
              className="py-3 rounded-btn bg-pink-fluo text-white font-nunito font-bold text-base disabled:opacity-50 active:opacity-80"
            >
              {submitting ? 'Envoi...' : '🛒 Valider la commande'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // Select user view
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
      <h2 className="font-bangers text-purple-dark text-2xl tracking-wide">Nouvelle commande</h2>

      <input
        type="text"
        placeholder="Rechercher un invité..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border border-border rounded-btn px-4 py-2.5 font-nunito text-purple-dark bg-white w-full"
      />

      <div className="flex flex-col gap-2">
        {filteredProfiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => handleSelectUser(profile)}
            className="bg-white rounded-card border border-border p-3 flex items-center gap-3 active:opacity-80 text-left"
          >
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.prenom}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-mid flex items-center justify-center font-bangers text-white text-lg flex-shrink-0">
                {profile.prenom[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-nunito font-bold text-purple-dark">{profile.prenom}</p>
              <p className="font-nunito text-purple-mid text-sm">
                {profile.role.replace('_', ' ')}
              </p>
            </div>
            <span className="font-bangers text-purple-dark text-xl">{profile.solde}B</span>
          </button>
        ))}
        {filteredProfiles.length === 0 && (
          <p className="font-nunito text-purple-mid text-sm text-center py-4">
            Aucun invité trouvé.
          </p>
        )}
      </div>
    </div>
  )
}
