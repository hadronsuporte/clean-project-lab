WITH catalog_seed(category_slug, name, slug, icon_key) AS (
  VALUES
    ('barbearias', 'Corte', 'corte', 'corte'),
    ('barbearias', 'Barba', 'barba', 'barba'),
    ('barbearias', 'Corte e barba', 'corte-e-barba', 'corte-e-barba'),
    ('barbearias', 'Corte infantil', 'corte-infantil', 'corte-infantil'),
    ('barbearias', 'Pigmentação', 'pigmentacao', 'pigmentacao'),

    ('cabelos', 'Corte feminino', 'corte-feminino', 'corte-feminino'),
    ('cabelos', 'Escova', 'escova', 'escova'),
    ('cabelos', 'Coloração', 'coloracao', 'coloracao'),
    ('cabelos', 'Hidratação', 'hidratacao', 'hidratacao'),
    ('cabelos', 'Penteados', 'penteados', 'penteados'),

    ('unhas', 'Manicure', 'manicure', 'manicure'),
    ('unhas', 'Pedicure', 'pedicure', 'pedicure'),
    ('unhas', 'Alongamento', 'alongamento', 'alongamento'),
    ('unhas', 'Esmaltação em gel', 'esmaltacao-em-gel', 'esmaltacao-em-gel'),
    ('unhas', 'Nail art', 'nail-art', 'nail-art'),

    ('estetica', 'Limpeza de pele', 'limpeza-de-pele', 'limpeza-de-pele'),
    ('estetica', 'Estética facial', 'estetica-facial', 'estetica-facial'),
    ('estetica', 'Estética corporal', 'estetica-corporal', 'estetica-corporal'),
    ('estetica', 'Drenagem', 'drenagem', 'drenagem'),
    ('estetica', 'Harmonização facial', 'harmonizacao-facial', 'harmonizacao-facial'),

    ('massoterapia', 'Massagem relaxante', 'massagem-relaxante', 'massagem-relaxante'),
    ('massoterapia', 'Massagem terapêutica', 'massagem-terapeutica', 'massagem-terapeutica'),
    ('massoterapia', 'Massagem desportiva', 'massagem-desportiva', 'massagem-desportiva'),
    ('massoterapia', 'Drenagem linfática', 'drenagem-linfatica', 'drenagem-linfatica'),
    ('massoterapia', 'Pedras quentes', 'pedras-quentes', 'pedras-quentes'),

    ('sobrancelhas', 'Design de sobrancelhas', 'design-de-sobrancelhas', 'design-de-sobrancelhas'),
    ('sobrancelhas', 'Henna', 'henna', 'henna'),
    ('sobrancelhas', 'Micropigmentação', 'micropigmentacao', 'micropigmentacao'),
    ('sobrancelhas', 'Lash lifting', 'lash-lifting', 'lash-lifting'),
    ('sobrancelhas', 'Extensão de cílios', 'extensao-de-cilios', 'extensao-de-cilios'),

    ('maquiagem', 'Maquiagem social', 'maquiagem-social', 'maquiagem-social'),
    ('maquiagem', 'Maquiagem para noiva', 'maquiagem-para-noiva', 'maquiagem-para-noiva'),
    ('maquiagem', 'Maquiagem para festa', 'maquiagem-para-festa', 'maquiagem-para-festa'),
    ('maquiagem', 'Maquiagem editorial', 'maquiagem-editorial', 'maquiagem-editorial'),
    ('maquiagem', 'Maquiagem dia a dia', 'maquiagem-dia-a-dia', 'maquiagem-dia-a-dia'),

    ('depilacao', 'Depilação com cera', 'depilacao-com-cera', 'depilacao-com-cera'),
    ('depilacao', 'Depilação a laser', 'depilacao-a-laser', 'depilacao-a-laser'),
    ('depilacao', 'Depilação facial', 'depilacao-facial', 'depilacao-facial'),
    ('depilacao', 'Depilação corporal', 'depilacao-corporal', 'depilacao-corporal'),
    ('depilacao', 'Depilação íntima', 'depilacao-intima', 'depilacao-intima'),

    ('podologia', 'Atendimento clínico', 'atendimento-clinico', 'atendimento-clinico'),
    ('podologia', 'Unha encravada', 'unha-encravada', 'unha-encravada'),
    ('podologia', 'Calosidades', 'calosidades', 'calosidades'),
    ('podologia', 'Reflexologia', 'reflexologia', 'reflexologia'),
    ('podologia', 'Spa dos pés', 'spa-dos-pes', 'spa-dos-pes')
)
INSERT INTO public.service_catalog (category_id, name, slug, icon_key, active)
SELECT category.id, seed.name, seed.slug, seed.icon_key, true
FROM catalog_seed seed
JOIN public.business_categories category ON category.slug = seed.category_slug
ON CONFLICT (category_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    icon_key = EXCLUDED.icon_key,
    active = true,
    updated_at = now();

NOTIFY pgrst, 'reload schema';
