CREATE OR REPLACE FUNCTION public.normalize_whatsapp_business_terms()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.message IS NOT NULL THEN
    NEW.message := replace(NEW.message, 'Barbearia:', 'Estabelecimento:');
    NEW.message := replace(NEW.message, 'Barbeiro:', 'Profissional:');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_whatsapp_business_terms_trigger
  ON public.whatsapp_queue;

CREATE TRIGGER normalize_whatsapp_business_terms_trigger
BEFORE INSERT OR UPDATE OF message ON public.whatsapp_queue
FOR EACH ROW
EXECUTE FUNCTION public.normalize_whatsapp_business_terms();

UPDATE public.whatsapp_queue
SET message = replace(
  replace(message, 'Barbearia:', 'Estabelecimento:'),
  'Barbeiro:', 'Profissional:'
)
WHERE sent_at IS NULL
  AND message IS NOT NULL
  AND (message LIKE '%Barbearia:%' OR message LIKE '%Barbeiro:%');

NOTIFY pgrst, 'reload schema';
