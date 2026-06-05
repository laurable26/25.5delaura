-- confirmer_equipe: user confirms they found their team
create or replace function confirmer_equipe()
returns void language plpgsql security definer as $$
begin
  update profiles set laurapiades_equipe_confirmee = true where id = auth.uid();
end;
$$;

-- voter_chef: vote for a team leader; elects automatically when all members voted
create or replace function voter_chef(p_equipe_id uuid, p_candidat_id uuid)
returns void language plpgsql security definer as $$
declare
  v_members integer;
  v_votes integer;
  v_winner uuid;
begin
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

-- valider_nom_equipe: chef sets the team's battle name
create or replace function valider_nom_equipe(p_equipe_id uuid, p_nom text)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from equipes where id = p_equipe_id and chef_id = auth.uid()) then
    raise exception 'Seul le chef d''équipe peut choisir le nom';
  end if;
  update equipes set nom_choisi = p_nom where id = p_equipe_id;
end;
$$;

-- demarrer_laurapiades: create a new session (onboarding phase)
create or replace function demarrer_laurapiades()
returns void language plpgsql security definer as $$
begin
  delete from laurapiades_sessions;
  insert into laurapiades_sessions (statut, tour_actif, tour_statut)
  values ('onboarding', 0, 'en_cours');
end;
$$;

-- lancer_tour: start a numbered tour
create or replace function lancer_tour(p_tour integer)
returns void language plpgsql security definer as $$
begin
  update laurapiades_sessions
  set statut = 'en_cours', tour_actif = p_tour, tour_statut = 'en_cours';
end;
$$;

-- terminer_tour: stop play, ask teams for results
create or replace function terminer_tour()
returns void language plpgsql security definer as $$
begin
  update laurapiades_sessions set tour_statut = 'attente_resultats';
end;
$$;

-- terminer_laurapiades: mark the game as finished
create or replace function terminer_laurapiades()
returns void language plpgsql security definer as $$
begin
  update laurapiades_sessions set statut = 'termine';
end;
$$;

-- reinitialiser_laurapiades: wipe all laurapiades state
create or replace function reinitialiser_laurapiades()
returns void language plpgsql security definer as $$
begin
  delete from laurapiades_sessions;
  delete from votes_chef;
  delete from resultats_epreuves where tour is not null;
  update equipes set chef_id = null, nom_choisi = null;
  update profiles set laurapiades_equipe_confirmee = false;
end;
$$;

-- soumettre_resultat_equipe: team submits their match result
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

  -- Upsert this team's result (unconfirmed until cross-checked)
  insert into resultats_epreuves (epreuve_id, equipe_id, resultat, score, blerhams_attribues, confirme, tour)
  values (p_epreuve_id, p_equipe_id, p_resultat, p_score, 0, false, p_tour)
  on conflict (epreuve_id, equipe_id, tour) do update
    set resultat = excluded.resultat, score = excluded.score, confirme = false, blerhams_attribues = 0;

  -- par_points: confirm immediately, no cross-check needed
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

  -- gagnant_perdant: wait for the opposing team
  select * into v_other
  from resultats_epreuves
  where epreuve_id = p_epreuve_id and equipe_id <> p_equipe_id and tour = p_tour
  limit 1;

  if not found then
    return '{"incoherent": false}'::jsonb;
  end if;

  -- Both submitted — check consistency
  if p_resultat = v_other.resultat then
    v_incoherent := true;
    -- 10B malus to all members of both teams
    for v_member in select * from profiles where equipe_id in (p_equipe_id, v_other.equipe_id) loop
      update profiles set solde = greatest(0, solde - 10) where id = v_member.id;
    end loop;
    update resultats_epreuves
      set confirme = true, blerhams_attribues = 0
      where epreuve_id = p_epreuve_id and equipe_id in (p_equipe_id, v_other.equipe_id) and tour = p_tour;
  else
    -- Consistent: award blerhams to each team per their declared result
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

-- admin_reset_resultat_equipe: delete a team's result so they can re-submit
create or replace function admin_reset_resultat_equipe(
  p_epreuve_id uuid,
  p_equipe_id uuid
)
returns void language plpgsql security definer as $$
declare
  v_tour integer;
begin
  select tour into v_tour
  from resultats_epreuves
  where epreuve_id = p_epreuve_id and equipe_id = p_equipe_id
  limit 1;

  -- Also un-confirm the opposing team so they can re-submit
  if v_tour is not null then
    update resultats_epreuves
      set confirme = false, blerhams_attribues = 0
      where epreuve_id = p_epreuve_id and equipe_id <> p_equipe_id and tour = v_tour;
  end if;

  delete from resultats_epreuves
  where epreuve_id = p_epreuve_id and equipe_id = p_equipe_id;
end;
$$;

-- admin_corriger_resultat: admin overrides a confirmed result
create or replace function admin_corriger_resultat(
  p_equipe_id uuid,
  p_epreuve_id uuid,
  p_tour integer,
  p_resultat text,
  p_score integer
)
returns void language plpgsql security definer as $$
declare
  v_epreuve epreuves%rowtype;
  v_blerhams integer;
begin
  select * into v_epreuve from epreuves where id = p_epreuve_id;

  if v_epreuve.mode = 'par_points' then
    v_blerhams := coalesce(p_score, 0);
  else
    v_blerhams := case when p_resultat = 'victoire' then v_epreuve.blerhams_victoire else v_epreuve.blerhams_defaite end;
  end if;

  update resultats_epreuves
    set resultat = p_resultat, score = p_score, blerhams_attribues = v_blerhams
    where equipe_id = p_equipe_id and epreuve_id = p_epreuve_id and tour = p_tour;
end;
$$;

-- Fix appliquer_bonus_malus: add row lock + record actual amount deducted
create or replace function appliquer_bonus_malus(
  p_user_id uuid,
  p_montant integer,
  p_description text default null
)
returns void language plpgsql security definer as $$
declare
  v_type text;
  v_solde integer;
  v_actual integer;
begin
  select solde into v_solde from profiles where id = p_user_id for update;

  if p_montant > 0 then
    v_type := 'bonus';
    v_actual := p_montant;
    update profiles set solde = solde + p_montant where id = p_user_id;
  else
    v_type := 'malus';
    v_actual := least(v_solde, abs(p_montant));
    update profiles set solde = solde - v_actual where id = p_user_id;
  end if;

  insert into transactions (type, receveur_id, montant, statut, description)
  values (v_type, p_user_id, v_actual, 'validee', p_description);
end;
$$;
