-- Supabase blocks DELETE without a WHERE clause even inside security definer functions.
-- Add WHERE id IS NOT NULL to satisfy this restriction.

create or replace function demarrer_laurapiades()
returns void language plpgsql security definer as $$
begin
  delete from laurapiades_sessions where id is not null;
  insert into laurapiades_sessions (statut, tour_actif, tour_statut)
  values ('onboarding', 0, 'en_cours');
end;
$$;

create or replace function reinitialiser_laurapiades()
returns void language plpgsql security definer as $$
begin
  delete from laurapiades_sessions where id is not null;
  delete from votes_chef where id is not null;
  delete from resultats_epreuves where tour is not null;
  update equipes set chef_id = null, nom_choisi = null where id is not null;
  update profiles set laurapiades_equipe_confirmee = false where id is not null;
end;
$$;
