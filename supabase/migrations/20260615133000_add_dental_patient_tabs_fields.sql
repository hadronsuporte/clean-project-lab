ALTER TABLE public.dental_patients
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone_secondary text,
  ADD COLUMN IF NOT EXISTS patient_number text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS social_network text,
  ADD COLUMN IF NOT EXISTS plan_name text NOT NULL DEFAULT 'Particular',
  ADD COLUMN IF NOT EXISTS insurance_card_number text,
  ADD COLUMN IF NOT EXISTS insurance_holder text,
  ADD COLUMN IF NOT EXISTS insurance_responsible_cpf text,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

CREATE INDEX IF NOT EXISTS idx_dental_patients_clinic_email
ON public.dental_patients(clinic_id, email);

CREATE INDEX IF NOT EXISTS idx_dental_patients_clinic_patient_number
ON public.dental_patients(clinic_id, patient_number);

CREATE INDEX IF NOT EXISTS idx_dental_patients_clinic_record_number
ON public.dental_patients(clinic_id, record_number);

CREATE OR REPLACE FUNCTION public.get_dental_patients(
  p_clinic_id uuid,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text,
  record_number text,
  age integer,
  cpf text,
  phone text,
  phone_country_code text,
  tags text[],
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.record_number,
    CASE
      WHEN p.birth_date IS NULL THEN NULL
      ELSE date_part('year', age(current_date, p.birth_date))::integer
    END AS age,
    p.cpf,
    p.phone,
    p.phone_country_code,
    p.tags,
    p.created_at
  FROM public.dental_patients p
  WHERE p.clinic_id = p_clinic_id
    AND public.is_dental_clinic_member(p.clinic_id)
    AND (
      p_search IS NULL
      OR trim(p_search) = ''
      OR unaccent(lower(p.full_name)) LIKE '%' || unaccent(lower(trim(p_search))) || '%'
      OR unaccent(lower(COALESCE(p.email, ''))) LIKE '%' || unaccent(lower(trim(p_search))) || '%'
      OR unaccent(lower(COALESCE(p.record_number, ''))) LIKE '%' || unaccent(lower(trim(p_search))) || '%'
      OR unaccent(lower(COALESCE(p.patient_number, ''))) LIKE '%' || unaccent(lower(trim(p_search))) || '%'
      OR regexp_replace(COALESCE(p.cpf, ''), '\D', '', 'g') LIKE '%' || regexp_replace(trim(p_search), '\D', '', 'g') || '%'
      OR regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') LIKE '%' || regexp_replace(trim(p_search), '\D', '', 'g') || '%'
    )
  ORDER BY p.full_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_dental_patients(uuid, text) TO authenticated;
