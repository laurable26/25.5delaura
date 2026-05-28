-- Enable RLS on all tables
alter table profiles enable row level security;
alter table equipes enable row level security;
alter table events enable row level security;
alter table epreuves enable row level security;
alter table resultats_epreuves enable row level security;
alter table products enable row level security;
alter table transactions enable row level security;

-- Helper function: get current user's role
create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

-- PROFILES policies
create policy "Users can view their own profile"
  on profiles for select using (id = auth.uid());

create policy "Admin general can view all profiles"
  on profiles for select using (get_my_role() = 'admin_general');

create policy "Users can update their own profile"
  on profiles for update using (id = auth.uid());

create policy "Admin general can update all profiles"
  on profiles for update using (get_my_role() = 'admin_general');

-- Allow users to see other users' prenom and photo for transfers
create policy "Users can view basic info of others"
  on profiles for select using (true);

-- EQUIPES policies
create policy "Everyone can view equipes"
  on equipes for select using (true);

create policy "Admin general can manage equipes"
  on equipes for all using (get_my_role() = 'admin_general');

-- EVENTS policies
create policy "Everyone can view events"
  on events for select using (true);

create policy "Admin general can manage events"
  on events for all using (get_my_role() = 'admin_general');

-- EPREUVES policies
create policy "Everyone can view epreuves"
  on epreuves for select using (true);

create policy "Admin jeux can manage epreuves"
  on epreuves for all using (get_my_role() in ('admin_general','admin_jeux'));

-- RESULTATS_EPREUVES policies
create policy "Everyone can view resultats"
  on resultats_epreuves for select using (true);

create policy "Admin jeux can manage resultats"
  on resultats_epreuves for all using (get_my_role() in ('admin_general','admin_jeux'));

-- PRODUCTS policies
create policy "Everyone can view active products"
  on products for select using (actif = true);

create policy "Admin ventes can manage products"
  on products for all using (get_my_role() in ('admin_general','admin_ventes'));

-- TRANSACTIONS policies
create policy "Users can view their own transactions"
  on transactions for select
  using (emetteur_id = auth.uid() or receveur_id = auth.uid());

create policy "Admin general can view all transactions"
  on transactions for select using (get_my_role() = 'admin_general');

create policy "Users can create transfers"
  on transactions for insert
  with check (
    type = 'transfert'
    and emetteur_id = auth.uid()
  );

create policy "Admin ventes can create depenses"
  on transactions for insert
  with check (
    type = 'depense'
    and get_my_role() in ('admin_general','admin_ventes')
  );

create policy "Admin jeux can create gain_epreuve"
  on transactions for insert
  with check (
    type in ('gain_epreuve','bonus','malus')
    and get_my_role() in ('admin_general','admin_jeux')
  );

create policy "Users can validate their own pending transactions"
  on transactions for update
  using (receveur_id = auth.uid() and statut = 'en_attente');

create policy "Admin can update any transaction"
  on transactions for update
  using (get_my_role() = 'admin_general');
