-- Seed: équipes du 06.06.2026 (thème festival Y2K)
insert into equipes (nom, couleur) values
  ('Les Glitters',  '#FF3EA5'),
  ('Y2K Fever',     '#FFE600'),
  ('Néon Crew',     '#39FF14'),
  ('Club Lavande',  '#8B6BAE'),
  ('Les Comètes',   '#00CFFF'),
  ('Bass Boosted',  '#FF6B35'),
  ('Disco Biscuit', '#FF1493'),
  ('Acid Wash',     '#ADFF2F'),
  ('Rave Nation',   '#9400D3'),
  ('Glitch Gang',   '#00FF7F')
on conflict do nothing;

-- Seed: événements de la soirée
insert into events (nom, type, statut, ordre) values
  ('Laurapiades',   'jeux',  'a_venir', 1),
  ('Repas de Gala', 'repas', 'a_venir', 2),
  ('After Party',   'autre', 'a_venir', 3)
on conflict do nothing;
