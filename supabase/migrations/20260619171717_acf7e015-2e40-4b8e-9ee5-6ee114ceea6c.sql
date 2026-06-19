
-- 1) Update upsert_catalog_service to accept optional icon_key and normalize aliases to canonical entries.
CREATE OR REPLACE FUNCTION public.upsert_catalog_service(
  p_barbershop_id uuid,
  p_name text,
  p_icon_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_category_id uuid;
  v_category_slug text;
  v_slug text;
  v_canonical_slug text;
  v_canonical_name text;
  v_canonical_icon text;
  v_catalog_id uuid;
  v_is_authorized boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (
        role = 'superadmin'
        OR (role = 'owner' AND barbershop_id = p_barbershop_id)
      )
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Não autorizado a cadastrar serviços neste estabelecimento.';
  END IF;

  SELECT b.category_id, bc.slug
    INTO v_category_id, v_category_slug
    FROM public.barbershops b
    LEFT JOIN public.business_categories bc ON bc.id = b.category_id
   WHERE b.id = p_barbershop_id;

  IF v_category_id IS NULL THEN
    SELECT id, slug INTO v_category_id, v_category_slug
      FROM public.business_categories WHERE slug = 'barbearias' LIMIT 1;
  END IF;

  v_slug := public.normalize_service_slug(p_name);
  IF v_slug IS NULL OR v_slug = '' THEN
    RAISE EXCEPTION 'Nome de serviço inválido.';
  END IF;

  -- Canonical alias resolution (per-category-aware where it matters)
  v_canonical_slug := v_slug;
  v_canonical_name := trim(p_name);
  v_canonical_icon := COALESCE(NULLIF(trim(p_icon_key), ''), v_slug);

  IF v_category_slug = 'massoterapia' THEN
    IF v_slug IN ('relaxante','massagem-relaxante') THEN
      v_canonical_slug := 'massagem-relaxante'; v_canonical_name := 'Massagem relaxante';
      v_canonical_icon := COALESCE(NULLIF(trim(p_icon_key),''), 'massagem-relaxante');
    ELSIF v_slug IN ('terapeutica','massagem-terapeutica') THEN
      v_canonical_slug := 'massagem-terapeutica'; v_canonical_name := 'Massagem terapêutica';
      v_canonical_icon := COALESCE(NULLIF(trim(p_icon_key),''), 'massagem-terapeutica');
    ELSIF v_slug IN ('desportiva','esportiva','massagem-desportiva','massagem-esportiva') THEN
      v_canonical_slug := 'massagem-desportiva'; v_canonical_name := 'Massagem desportiva';
      v_canonical_icon := COALESCE(NULLIF(trim(p_icon_key),''), 'massagem-desportiva');
    ELSIF v_slug IN ('drenagem','drenagem-linfatica','massagem-drenagem','drenagem-massagem') THEN
      v_canonical_slug := 'drenagem-linfatica'; v_canonical_name := 'Drenagem linfática';
      v_canonical_icon := COALESCE(NULLIF(trim(p_icon_key),''), 'drenagem-linfatica');
    ELSIF v_slug IN ('pedras-quentes','massagem-com-pedras-quentes','pedras') THEN
      v_canonical_slug := 'pedras-quentes'; v_canonical_name := 'Pedras quentes';
      v_canonical_icon := COALESCE(NULLIF(trim(p_icon_key),''), 'pedras-quentes');
    ELSIF v_slug IN ('auriculoterapia') THEN
      v_canonical_slug := 'auriculoterapia'; v_canonical_name := 'Auriculoterapia';
      v_canonical_icon := COALESCE(NULLIF(trim(p_icon_key),''), 'auriculoterapia');
    END IF;
  ELSIF v_category_slug = 'estetica' THEN
    IF v_slug IN ('drenagem','drenagem-linfatica') THEN
      v_canonical_slug := 'drenagem-linfatica'; v_canonical_name := 'Drenagem linfática';
      v_canonical_icon := COALESCE(NULLIF(trim(p_icon_key),''), 'drenagem-linfatica');
    END IF;
  END IF;

  SELECT id INTO v_catalog_id
    FROM public.service_catalog
   WHERE category_id = v_category_id AND slug = v_canonical_slug;

  IF v_catalog_id IS NULL THEN
    INSERT INTO public.service_catalog (category_id, name, slug, icon_key, active)
    VALUES (v_category_id, v_canonical_name, v_canonical_slug, v_canonical_icon, true)
    RETURNING id INTO v_catalog_id;
  ELSE
    -- Update icon_key only if explicitly provided
    IF p_icon_key IS NOT NULL AND trim(p_icon_key) <> '' THEN
      UPDATE public.service_catalog
         SET icon_key = trim(p_icon_key),
             updated_at = now()
       WHERE id = v_catalog_id;
    END IF;
  END IF;

  RETURN v_catalog_id;
END;
$function$;

-- 2) Backfill: consolidate alias rows into canonical rows for massoterapia and estetica.
DO $$
DECLARE
  v_cat_mass uuid;
  v_cat_est uuid;
  v_canonical_id uuid;
  v_alias RECORD;
  v_aliases TEXT[][] := ARRAY[
    -- {category_slug, alias_slug, canonical_slug, canonical_name, canonical_icon_key}
    ARRAY['massoterapia','relaxante','massagem-relaxante','Massagem relaxante','massagem-relaxante'],
    ARRAY['massoterapia','terapeutica','massagem-terapeutica','Massagem terapêutica','massagem-terapeutica'],
    ARRAY['massoterapia','desportiva','massagem-desportiva','Massagem desportiva','massagem-desportiva'],
    ARRAY['massoterapia','esportiva','massagem-desportiva','Massagem desportiva','massagem-desportiva'],
    ARRAY['massoterapia','massagem-esportiva','massagem-desportiva','Massagem desportiva','massagem-desportiva'],
    ARRAY['massoterapia','drenagem','drenagem-linfatica','Drenagem linfática','drenagem-linfatica'],
    ARRAY['massoterapia','massagem-drenagem','drenagem-linfatica','Drenagem linfática','drenagem-linfatica'],
    ARRAY['massoterapia','pedras','pedras-quentes','Pedras quentes','pedras-quentes'],
    ARRAY['massoterapia','massagem-com-pedras-quentes','pedras-quentes','Pedras quentes','pedras-quentes'],
    ARRAY['estetica','drenagem','drenagem-linfatica','Drenagem linfática','drenagem-linfatica']
  ];
  i int;
BEGIN
  FOR i IN 1..array_length(v_aliases,1) LOOP
    DECLARE
      v_cat_slug text := v_aliases[i][1];
      v_alias_slug text := v_aliases[i][2];
      v_canon_slug text := v_aliases[i][3];
      v_canon_name text := v_aliases[i][4];
      v_canon_icon text := v_aliases[i][5];
      v_cat_id uuid;
      v_alias_id uuid;
      v_canon_id uuid;
    BEGIN
      SELECT id INTO v_cat_id FROM public.business_categories WHERE slug = v_cat_slug;
      IF v_cat_id IS NULL THEN CONTINUE; END IF;

      -- Ensure canonical exists
      SELECT id INTO v_canon_id FROM public.service_catalog
        WHERE category_id = v_cat_id AND slug = v_canon_slug;
      IF v_canon_id IS NULL THEN
        INSERT INTO public.service_catalog (category_id, name, slug, icon_key, active)
        VALUES (v_cat_id, v_canon_name, v_canon_slug, v_canon_icon, true)
        RETURNING id INTO v_canon_id;
      ELSE
        UPDATE public.service_catalog
           SET name = v_canon_name,
               icon_key = COALESCE(NULLIF(icon_key,''), v_canon_icon)
         WHERE id = v_canon_id;
      END IF;

      -- Find alias
      SELECT id INTO v_alias_id FROM public.service_catalog
        WHERE category_id = v_cat_id AND slug = v_alias_slug;
      IF v_alias_id IS NULL OR v_alias_id = v_canon_id THEN CONTINUE; END IF;

      -- Move references
      UPDATE public.services
         SET catalog_service_id = v_canon_id
       WHERE catalog_service_id = v_alias_id;

      -- Delete alias if now unused
      IF NOT EXISTS (SELECT 1 FROM public.services WHERE catalog_service_id = v_alias_id) THEN
        DELETE FROM public.service_catalog WHERE id = v_alias_id;
      END IF;
    END;
  END LOOP;
END $$;

-- 3) Seed canonical massoterapia entries (idempotent)
INSERT INTO public.service_catalog (category_id, name, slug, icon_key, active)
SELECT bc.id, v.name, v.slug, v.icon_key, true
FROM public.business_categories bc
CROSS JOIN (VALUES
  ('Massagem relaxante','massagem-relaxante','massagem-relaxante'),
  ('Massagem terapêutica','massagem-terapeutica','massagem-terapeutica'),
  ('Massagem desportiva','massagem-desportiva','massagem-desportiva'),
  ('Drenagem linfática','drenagem-linfatica','drenagem-linfatica'),
  ('Pedras quentes','pedras-quentes','pedras-quentes')
) AS v(name, slug, icon_key)
WHERE bc.slug = 'massoterapia'
ON CONFLICT DO NOTHING;
