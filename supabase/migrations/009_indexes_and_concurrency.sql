-- profiles_login view: used by LoginScreen (unauthenticated), exposes only safe columns
create or replace view profiles_login
  with (security_invoker = off) as
  select id, prenom, photo_url from profiles;

grant select on profiles_login to anon, authenticated;

-- Indexes on high-traffic query patterns
create index if not exists idx_profiles_equipe_id
  on profiles(equipe_id);

create index if not exists idx_votes_chef_equipe_id
  on votes_chef(equipe_id);

create index if not exists idx_resultats_epreuves_equipe_tour
  on resultats_epreuves(equipe_id, tour);

create index if not exists idx_transactions_receveur_statut
  on transactions(receveur_id, statut);

-- Fix voter_chef: lock the equipes row to prevent double-election race condition
create or replace function voter_chef(p_equipe_id uuid, p_candidat_id uuid)
returns void language plpgsql security definer as $$
declare
  v_members integer;
  v_votes integer;
  v_winner uuid;
begin
  -- Lock the team row to serialise concurrent votes
  perform 1 from equipes where id = p_equipe_id for update;

  insert into votes_chef (equipe_id, votant_id, candidat_id)
  values (p_equipe_id, auth.uid(), p_candidat_id)
  on conflict (equipe_id, votant_id) do update set candidat_id = excluded.candidat_id;

  select count(*) into v_members from profiles where equipe_id = p_equipe_id;
  select count(*) into v_votes  from votes_chef  where equipe_id = p_equipe_id;

  if v_votes >= v_members then
    select candidat_id into v_winner
    from votes_chef where equipe_id = p_equipe_id
    group by candidat_id
    order by count(*) desc, random()
    limit 1;
    update equipes set chef_id = v_winner where id = p_equipe_id;
  end if;
end;
$$;

-- Fix soumettre_resultat_equipe: lock opposing team row to prevent missed cross-check
create or replace function soumettre_resultat_equipe(
  p_epreuve_id uuid,
  p_equipe_id uuid,
  p_resultat text,
  p_score integer,
  p_tour integer
)
returns jsonb language plpgsql security definer as $$
declare
  v_epreuve epreuves%rowtype;
  v_other resultats_epreuves%rowtype;
  v_blerhams integer;
  v_incoherent boolean := false;
  v_member profiles%rowtype;
begin
  select * into v_epreuve from epreuves where id = p_epreuve_id;

  -- Lock both team slots (order by equipe_id to avoid deadlock)
  perform 1 from resultats_epreuves
  where epreuve_id = p_epreuve_id and tour = p_tour
  for update;

  insert into resultats_epreuves (epreuve_id, equipe_id, resultat, score, blerhams_attribues, confirme, tour)
  values (p_epreuve_id, p_equipe_id, p_resultat, p_score, 0, false, p_tour)
  on conflict (epreuve_id, equipe_id, tour) do update
    set resultat = excluded.resultat, score = excluded.score, confirme = false, blerhams_attribues = 0;

  if v_epreuve.mode = 'par_points' then
    v_blerhams := coalesce(p_score, 0);
    update resultats_epreuves
      set confirme = true, blerhams_attribues = v_blerhams
      where epreuve_id = p_epreuve_id and equipe_id = p_equipe_id and tour = p_tour;
    for v_member in select * from profiles where equipe_id = p_equipe_id loop
      update profiles set solde = solde + v_blerhams where id = v_member.id;
    end loop;
    return '{"incoherent": false}'::jsonb;
  end if;

  select * into v_other
  from resultats_epreuves
  where epreuve_id = p_epreuve_id and equipe_id <> p_equipe_id and tour = p_tour
  limit 1;

  if not found then
    return '{"incoherent": false}'::jsonb;
  end if;

  if p_resultat = v_other.resultat then
    v_incoherent := true;
    for v_member in select * from profiles where equipe_id in (p_equipe_id, v_other.equipe_id) loop
      update profiles set solde = greatest(0, solde - 10) where id = v_member.id;
    end loop;
    update resultats_epreuves
      set confirme = true, blerhams_attribues = 0
      where epreuve_id = p_epreuve_id and equipe_id in (p_equipe_id, v_other.equipe_id) and tour = p_tour;
  else
    v_blerhams := case when p_resultat = 'victoire' then v_epreuve.blerhams_victoire else v_epreuve.blerhams_defaite end;
    update resultats_epreuves
      set confirme = true, blerhams_attribues = v_blerhams
      where epreuve_id = p_epreuve_id and equipe_id = p_equipe_id and tour = p_tour;
    for v_member in select * from profiles where equipe_id = p_equipe_id loop
      update profiles set solde = solde + v_blerhams where id = v_member.id;
    end loop;

    v_blerhams := case when v_other.resultat = 'victoire' then v_epreuve.blerhams_victoire else v_epreuve.blerhams_defaite end;
    update resultats_epreuves
      set confirme = true, blerhams_attribues = v_blerhams
      where epreuve_id = p_epreuve_id and equipe_id = v_other.equipe_id and tour = p_tour;
    for v_member in select * from profiles where equipe_id = v_other.equipe_id loop
      update profiles set solde = solde + v_blerhams where id = v_member.id;
    end loop;
  end if;

  return jsonb_build_object('incoherent', v_incoherent);
end;
$$;
