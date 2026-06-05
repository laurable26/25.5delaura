-- Columns missing from existing tables
alter table equipes add column if not exists numero integer;
alter table equipes add column if not exists chef_id uuid references profiles(id);
alter table equipes add column if not exists nom_choisi text;

alter table profiles add column if not exists laurapiades_equipe_confirmee boolean not null default false;

alter table resultats_epreuves add column if not exists confirme boolean not null default false;
alter table resultats_epreuves add column if not exists tour integer;

alter table products add column if not exists categorie text;

-- Unique constraint needed for upsert in soumettre_resultat_equipe
alter table resultats_epreuves
  add constraint if not exists resultats_epreuves_unique_match unique (epreuve_id, equipe_id, tour);

-- laurapiades_sessions
create table if not exists laurapiades_sessions (
  id uuid primary key default gen_random_uuid(),
  statut text not null default 'attente'
    check (statut in ('attente','onboarding','en_cours','termine')),
  tour_actif integer not null default 0,
  tour_statut text not null default 'en_cours'
    check (tour_statut in ('en_cours','attente_resultats')),
  created_at timestamptz default now()
);

-- votes_chef
create table if not exists votes_chef (
  id uuid primary key default gen_random_uuid(),
  equipe_id uuid references equipes(id) on delete cascade not null,
  votant_id uuid references profiles(id) on delete cascade not null,
  candidat_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(equipe_id, votant_id)
);

-- feature_flags
create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default false,
  created_at timestamptz default now()
);

-- RLS
alter table laurapiades_sessions enable row level security;
alter table votes_chef enable row level security;
alter table feature_flags enable row level security;

create policy "Everyone can view laurapiades sessions"
  on laurapiades_sessions for select using (true);
create policy "Admin can manage laurapiades sessions"
  on laurapiades_sessions for all using (get_my_role() in ('admin_general','admin_jeux'));

create policy "Everyone can view votes"
  on votes_chef for select using (true);
create policy "Users can insert their own vote"
  on votes_chef for insert with check (votant_id = auth.uid());
create policy "Admin can manage votes"
  on votes_chef for all using (get_my_role() in ('admin_general','admin_jeux'));

create policy "Everyone can view feature flags"
  on feature_flags for select using (true);
create policy "Admin can manage feature flags"
  on feature_flags for all using (get_my_role() = 'admin_general');

-- Realtime
alter publication supabase_realtime add table laurapiades_sessions;
alter publication supabase_realtime add table votes_chef;
alter publication supabase_realtime add table equipes;
