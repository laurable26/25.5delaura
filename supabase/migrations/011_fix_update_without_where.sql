-- Supabase blocks UPDATE without a WHERE clause even inside security definer functions.

create or replace function lancer_tour(p_tour integer)
returns void language plpgsql security definer as $$
begin
  update laurapiades_sessions
  set statut = 'en_cours', tour_actif = p_tour, tour_statut = 'en_cours'
  where id is not null;
end;
$$;

create or replace function terminer_tour()
returns void language plpgsql security definer as $$
begin
  update laurapiades_sessions set tour_statut = 'attente_resultats'
  where id is not null;
end;
$$;

create or replace function terminer_laurapiades()
returns void language plpgsql security definer as $$
begin
  update laurapiades_sessions set statut = 'termine'
  where id is not null;
end;
$$;
