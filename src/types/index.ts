export type UserRole = 'admin_general' | 'admin_jeux' | 'admin_ventes' | 'invite'

export interface Profile {
  id: string
  prenom: string
  photo_url: string | null
  pin_hash: string
  solde: number
  equipe_id: string | null
  role: UserRole
  created_at: string
}

export interface Equipe {
  id: string
  nom: string
  couleur: string | null
  created_at: string
}

export type EventStatut = 'a_venir' | 'en_cours' | 'termine'
export type EventType = 'jeux' | 'repas' | 'autre'

export interface Event {
  id: string
  nom: string
  photo_url: string | null
  statut: EventStatut
  type: EventType
  ordre: number | null
  created_at: string
}

export type EpreuveMode = 'gagnant_perdant' | 'par_points'
export type EpreuveStatut = 'a_venir' | 'en_cours' | 'termine'

export interface Epreuve {
  id: string
  event_id: string
  nom: string
  mode: EpreuveMode
  blerhams_victoire: number
  blerhams_defaite: number
  blerhams_par_point: number | null
  statut: EpreuveStatut
  ordre: number | null
  created_at: string
}

export interface ResultatEpreuve {
  id: string
  epreuve_id: string
  equipe_id: string
  resultat: 'victoire' | 'defaite' | null
  score: number | null
  blerhams_attribues: number
  created_at: string
}

export interface Product {
  id: string
  nom: string
  emoji: string | null
  prix_blerhams: number
  stock: number
  event_id: string | null
  categorie: string | null
  actif: boolean
  created_at: string
}

export type TransactionType = 'transfert' | 'depense' | 'gain_epreuve' | 'bonus' | 'malus'
export type TransactionStatut = 'en_attente' | 'validee' | 'annulee'

export interface Transaction {
  id: string
  type: TransactionType
  emetteur_id: string | null
  receveur_id: string | null
  montant: number
  description: string | null
  epreuve_id: string | null
  product_ids: { product_id: string; qty: number }[] | null
  statut: TransactionStatut
  created_at: string
}
