# Setup complet — Blerham 25.5 de Laura

## Supabase (déjà fait ✅)

Projet : **blerham-25-5-de-laura** (`uenqoajlxkirszuifzcu`) — région Paris (eu-west-3)

Migrations appliquées automatiquement :
- 001 — schéma (7 tables + trigger new_user)
- 002 — RLS policies
- 003 — fonctions SQL (transfer, epreuve, bonus/malus)
- 004 — Realtime (profiles, resultats_epreuves, transactions)
- 005 — Seed data (10 équipes + 3 événements)

Buckets Storage créés : `avatars` (photos profil) et `assets` (pièce Blerham)

### À faire manuellement dans Supabase Dashboard

1. **Auth → Settings** :
   - Désactiver "Enable email confirmations"
   - Site URL : `https://ton-projet.vercel.app`
   - Redirect URLs : `https://ton-projet.vercel.app/**`

2. **Uploader la photo pièce** :
   - Storage → bucket `assets` → dossier `coins/`
   - Uploader `photo_pour_blehrams.jpeg` → chemin `coins/blerham.jpeg`

3. **Passer Laura en admin_general** (après son premier login) :
   - SQL Editor → copier/coller le contenu de `promote_admin.sql` → Run

---

## Vercel

### Premier déploiement
1. Aller sur https://vercel.com/new
2. Importer le repo GitHub `laurable26/25.5delaura`
3. Framework : Vite (auto-détecté)
4. Variables d'environnement :
   - `VITE_SUPABASE_URL` = `https://uenqoajlxkirszuifzcu.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (voir fichier `.env` local)
5. Deploy → copier l'URL → la mettre dans Supabase Auth Settings

### Déploiements suivants
Push sur `main` → déploiement automatique.

---

## Créer les comptes invités

Dans Supabase Dashboard → Authentication → Users → "Invite user" :
- Email de l'invité
- User Metadata (JSON) : `{"prenom": "Prénom"}`

L'invité reçoit un lien magique → onboarding photo + PIN → dashboard.

---

## Variables d'environnement (.env local)

```
VITE_SUPABASE_URL=https://uenqoajlxkirszuifzcu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlbnFvYWpseGtpcnN6dWlmemN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODA5MzEsImV4cCI6MjA5NTU1NjkzMX0.M9vO4w1mKZ4rsQ7ypXfl4GfVvmLRytA9waYPA-awaGU
```
