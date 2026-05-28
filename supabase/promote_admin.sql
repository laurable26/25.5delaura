-- À exécuter dans le SQL Editor Supabase APRÈS le premier login de Laura
-- Remplace 'contact.laurable@gmail.com' par l'email exact utilisé

update profiles
set role = 'admin_general'
where id = (
  select id from auth.users
  where email = 'contact.laurable@gmail.com'
  limit 1
);
