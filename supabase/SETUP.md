# Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run migrations in order:
   - 001_initial_schema.sql
   - 002_rls.sql
   - 003_functions.sql
   - 004_realtime.sql
3. In Storage: create bucket "avatars" (public) and bucket "assets" (public)
4. Upload photo_pour_blehrams.jpeg to assets/coins/blerham.jpeg
5. Copy .env.example to .env and fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
