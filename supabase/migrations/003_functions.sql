-- Transfer Blerhams between users (atomic)
create or replace function transfer_blerhams(
  p_emetteur_id uuid,
  p_receveur_id uuid,
  p_montant integer
)
returns void language plpgsql security definer as $$
declare
  v_solde_emetteur integer;
begin
  -- Lock and check balance
  select solde into v_solde_emetteur
  from profiles
  where id = p_emetteur_id
  for update;

  if v_solde_emetteur < p_montant then
    raise exception 'Solde insuffisant (% < %)', v_solde_emetteur, p_montant;
  end if;

  if p_montant <= 0 then
    raise exception 'Le montant doit être positif';
  end if;

  -- Debit emetteur
  update profiles set solde = solde - p_montant where id = p_emetteur_id;
  -- Credit receveur
  update profiles set solde = solde + p_montant where id = p_receveur_id;

  -- Record transaction
  insert into transactions (type, emetteur_id, receveur_id, montant, statut)
  values ('transfert', p_emetteur_id, p_receveur_id, p_montant, 'validee');
end;
$$;

-- Attribute Blerhams after an épreuve result
create or replace function attribuer_blerhams_epreuve(
  p_epreuve_id uuid,
  p_equipe_id uuid,
  p_resultat text,  -- 'victoire' | 'defaite'
  p_score integer default null
)
returns void language plpgsql security definer as $$
declare
  v_epreuve epreuves%rowtype;
  v_blerhams integer;
  v_member profiles%rowtype;
begin
  select * into v_epreuve from epreuves where id = p_epreuve_id;

  if v_epreuve.mode = 'gagnant_perdant' then
    if p_resultat = 'victoire' then
      v_blerhams := v_epreuve.blerhams_victoire;
    else
      v_blerhams := v_epreuve.blerhams_defaite;
    end if;
  else
    v_blerhams := coalesce(p_score, 0) * coalesce(v_epreuve.blerhams_par_point, 1);
  end if;

  -- Record result
  insert into resultats_epreuves (epreuve_id, equipe_id, resultat, score, blerhams_attribues)
  values (p_epreuve_id, p_equipe_id, p_resultat, p_score, v_blerhams);

  -- Credit all team members
  for v_member in select * from profiles where equipe_id = p_equipe_id loop
    update profiles set solde = solde + v_blerhams where id = v_member.id;

    insert into transactions (type, receveur_id, montant, epreuve_id, statut, description)
    values ('gain_epreuve', v_member.id, v_blerhams, p_epreuve_id, 'validee',
            'Épreuve: ' || v_epreuve.nom);
  end loop;
end;
$$;

-- Apply bonus/malus to a user
create or replace function appliquer_bonus_malus(
  p_user_id uuid,
  p_montant integer,  -- positive = bonus, negative = malus
  p_description text default null
)
returns void language plpgsql security definer as $$
declare
  v_type text;
  v_abs integer;
begin
  if p_montant > 0 then
    v_type := 'bonus';
    v_abs := p_montant;
  else
    v_type := 'malus';
    v_abs := abs(p_montant);
  end if;

  update profiles set solde = greatest(0, solde + p_montant) where id = p_user_id;

  insert into transactions (type, receveur_id, montant, statut, description)
  values (v_type, p_user_id, v_abs, 'validee', p_description);
end;
$$;
