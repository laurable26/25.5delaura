-- Fix 1: admin_corriger_resultat — upsert + award/correct blerhams on profiles
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
  v_old_blerhams integer := 0;
  v_new_blerhams integer;
  v_member profiles%rowtype;
begin
  select * into v_epreuve from epreuves where id = p_epreuve_id;

  -- Calculate old blerhams so we can adjust profiles
  select coalesce(blerhams_attribues, 0) into v_old_blerhams
  from resultats_epreuves
  where equipe_id = p_equipe_id and epreuve_id = p_epreuve_id and tour = p_tour;

  -- Calculate new blerhams
  if v_epreuve.mode = 'par_points' then
    v_new_blerhams := coalesce(p_score, 0);
  else
    v_new_blerhams := case
      when p_resultat = 'victoire' then v_epreuve.blerhams_victoire
      else v_epreuve.blerhams_defaite
    end;
  end if;

  -- Upsert the result row
  insert into resultats_epreuves (epreuve_id, equipe_id, resultat, score, blerhams_attribues, confirme, tour)
  values (p_epreuve_id, p_equipe_id, p_resultat, p_score, v_new_blerhams, true, p_tour)
  on conflict (epreuve_id, equipe_id, tour) do update
    set resultat = excluded.resultat,
        score = excluded.score,
        blerhams_attribues = excluded.blerhams_attribues,
        confirme = true;

  -- Adjust profiles: subtract old, add new
  if v_new_blerhams <> v_old_blerhams then
    for v_member in select * from profiles where equipe_id = p_equipe_id loop
      update profiles
        set solde = greatest(0, solde - v_old_blerhams + v_new_blerhams)
        where id = v_member.id;
    end loop;
  end if;
end;
$$;

-- Fix 2: enable realtime on profiles so solde updates reach clients
alter publication supabase_realtime add table profiles;
