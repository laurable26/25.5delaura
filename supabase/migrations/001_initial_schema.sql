-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Equipes
create table if not exists equipes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  couleur text,
  created_at timestamptz default now()
);

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  prenom text not null,
  photo_url text,
  pin_hash text not null default '',
  solde integer default 0 not null check (solde >= 0),
  equipe_id uuid references equipes(id),
  role text not null default 'invite'
    check (role in ('admin_general','admin_jeux','admin_ventes','invite')),
  created_at timestamptz default now()
);

-- Events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  photo_url text,
  statut text not null default 'a_venir'
    check (statut in ('a_venir','en_cours','termine')),
  type text check (type in ('jeux','repas','autre')),
  ordre integer,
  created_at timestamptz default now()
);

-- Epreuves
create table if not exists epreuves (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  nom text not null,
  mode text not null check (mode in ('gagnant_perdant','par_points')),
  blerhams_victoire integer default 80,
  blerhams_defaite integer default 20,
  blerhams_par_point integer,
  statut text not null default 'a_venir'
    check (statut in ('a_venir','en_cours','termine')),
  ordre integer,
  created_at timestamptz default now()
);

-- Resultats epreuves
create table if not exists resultats_epreuves (
  id uuid primary key default gen_random_uuid(),
  epreuve_id uuid references epreuves(id) on delete cascade,
  equipe_id uuid references equipes(id) on delete cascade,
  resultat text check (resultat in ('victoire','defaite')),
  score integer,
  blerhams_attribues integer not null default 0,
  created_at timestamptz default now()
);

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  emoji text,
  prix_blerhams integer not null,
  stock integer default 0,
  event_id uuid references events(id),
  actif boolean default true,
  created_at timestamptz default now()
);

-- Transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('transfert','depense','gain_epreuve','bonus','malus')),
  emetteur_id uuid references profiles(id),
  receveur_id uuid references profiles(id),
  montant integer not null,
  description text,
  epreuve_id uuid references epreuves(id),
  product_ids jsonb,
  statut text not null default 'en_attente'
    check (statut in ('en_attente','validee','annulee')),
  created_at timestamptz default now()
);

-- Trigger: create profile on user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, prenom)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'prenom', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
