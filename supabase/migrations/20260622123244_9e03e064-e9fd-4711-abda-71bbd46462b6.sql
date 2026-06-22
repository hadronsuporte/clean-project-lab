-- 1) Categoria Pet (idempotente)
INSERT INTO public.business_categories (slug, name)
SELECT 'pet', 'Pet'
WHERE NOT EXISTS (SELECT 1 FROM public.business_categories WHERE slug = 'pet');

-- 2) Coluna pet_types em barbershops (idempotente)
ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS pet_types text[];

-- 3) Catálogo global Pet (idempotente, sem assumir UNIQUE constraint)
WITH cat AS (
  SELECT id FROM public.business_categories WHERE slug = 'pet' LIMIT 1
), src(name, slug, icon_key) AS (
  VALUES
    ('Banho',              'banho',               'pet-banho'),
    ('Tosa',               'tosa',                'pet-tosa'),
    ('Banho e tosa',       'banho-e-tosa',        'pet-banho-e-tosa'),
    ('Tosa higiênica',     'tosa-higienica',      'pet-tosa-higienica'),
    ('Hidratação',         'hidratacao-pet',      'pet-hidratacao'),
    ('Corte de unhas',     'corte-de-unhas',      'pet-corte-de-unhas'),
    ('Limpeza de ouvidos', 'limpeza-de-ouvidos',  'pet-limpeza-de-ouvidos'),
    ('Escovação',          'escovacao',           'pet-escovacao'),
    ('Táxi pet',           'taxi-pet',            'pet-taxi'),
    ('Creche pet',         'creche-pet',          'pet-creche')
)
INSERT INTO public.service_catalog (category_id, name, slug, icon_key, active)
SELECT cat.id, src.name, src.slug, src.icon_key, true
FROM cat, src
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_catalog sc
  WHERE sc.category_id = cat.id AND sc.slug = src.slug
);