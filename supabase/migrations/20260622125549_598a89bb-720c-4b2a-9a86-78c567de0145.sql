CREATE OR REPLACE FUNCTION public.get_barbershops_by_category_service(
  p_category_slug text,
  p_catalog_service_id uuid DEFAULT NULL::uuid,
  p_pet_type text DEFAULT NULL::text
)
RETURNS TABLE(
  id uuid, name text, address text, phone text, logo_url text, description text,
  latitude double precision, longitude double precision, blocked boolean,
  subscription_status text, created_at timestamp with time zone,
  category_id uuid, category_slug text, category_name text, pet_types text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.name, b.address, b.phone, b.logo_url, b.description,
    b.latitude, b.longitude, b.blocked, b.subscription_status, b.created_at,
    b.category_id,
    COALESCE(c.slug, 'barbearias')::text AS category_slug,
    COALESCE(c.name, 'Barbearias')::text AS category_name,
    COALESCE(b.pet_types, ARRAY[]::text[]) AS pet_types
  FROM public.barbershops b
  LEFT JOIN public.business_categories c ON c.id = b.category_id
  WHERE COALESCE(b.blocked, false) = false
    AND (
      p_category_slug IS NULL
      OR p_category_slug = 'todos'
      OR c.slug = p_category_slug
    )
    AND (
      p_catalog_service_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.services s
        WHERE s.barbershop_id = b.id
          AND s.catalog_service_id = p_catalog_service_id
      )
    )
    AND (
      p_pet_type IS NULL
      OR (b.pet_types IS NOT NULL AND p_pet_type = ANY(b.pet_types))
    )
  ORDER BY b.name ASC;
END;
$function$;