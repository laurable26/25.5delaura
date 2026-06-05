-- Validate a pending "depense" transaction (triggered by the user's PIN confirmation)
create or replace function valider_depense(
  p_transaction_id uuid
)
returns void language plpgsql security definer as $$
declare
  v_tx transactions%rowtype;
  v_solde integer;
begin
  -- Lock the transaction row
  select * into v_tx
  from transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'Transaction introuvable';
  end if;

  if v_tx.statut <> 'en_attente' then
    raise exception 'La transaction n''est plus en attente (statut: %)', v_tx.statut;
  end if;

  -- Check balance
  select solde into v_solde
  from profiles
  where id = v_tx.receveur_id
  for update;

  if v_solde < v_tx.montant then
    raise exception 'Solde insuffisant (% < %)', v_solde, v_tx.montant;
  end if;

  -- Debit the user
  update profiles
  set solde = solde - v_tx.montant
  where id = v_tx.receveur_id;

  -- Mark transaction as validated
  update transactions
  set statut = 'validee'
  where id = p_transaction_id;
end;
$$;
