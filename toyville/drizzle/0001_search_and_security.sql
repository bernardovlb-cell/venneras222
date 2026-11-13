-- Extensões de busca (disponíveis no PostgreSQL padrão e no Supabase)
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
-- unaccent() não é IMMUTABLE; este wrapper permite usá-lo em índices.
CREATE OR REPLACE FUNCTION tv_norm(txt text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, txt)) $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING gin (tv_norm(name) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS brands_name_trgm_idx ON brands USING gin (tv_norm(name) gin_trgm_ops);--> statement-breakpoint
-- Defesa em profundidade: o app acessa o banco somente pelo servidor (papel dono das tabelas).
-- Com RLS ativo e SEM políticas, papéis como "anon"/"authenticated" do Supabase não leem nem gravam nada.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\_\_%' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
