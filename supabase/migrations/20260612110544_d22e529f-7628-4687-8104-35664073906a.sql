-- Update get_barber_dashboard to follow new grouping rules
CREATE OR REPLACE FUNCTION public.get_barber_dashboard(p_day date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_barber_id UUID;
    v_barbershop_id UUID;
    v_summary JSON;
    v_today_appointments JSON;
    v_upcoming_appointments JSON;
    v_history_appointments JSON;
    v_target_date DATE := COALESCE(p_day, CURRENT_DATE);
BEGIN
    -- Get barber ID for current user
    SELECT id, barbershop_id INTO v_barber_id, v_barbershop_id FROM public.barbers WHERE user_id = auth.uid();

    IF v_barber_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Perfil de barbeiro não encontrado');
    END IF;

    -- Summary (Only completed + attended for revenue)
    SELECT json_build_object(
        'appointments_today', (SELECT COUNT(*) FROM appointments WHERE barber_id = v_barber_id AND starts_at::DATE = v_target_date AND status NOT IN ('completed', 'no_show', 'cancelled', 'canceled', 'cancelado') AND COALESCE(client_attended, true) = true),
        'gross_today', COALESCE((SELECT SUM(COALESCE(price_charged, price, 0)) FROM appointments WHERE barber_id = v_barber_id AND starts_at::DATE = v_target_date AND status = 'completed' AND client_attended = true), 0),
        'commission_today', COALESCE((SELECT SUM(commission_amount) FROM appointments WHERE barber_id = v_barber_id AND starts_at::DATE = v_target_date AND status = 'completed' AND client_attended = true), 0),
        'commission_pct', (SELECT commission_pct FROM barbers WHERE id = v_barber_id)
    ) INTO v_summary;

    -- Today: Today's date, not completed, not no_show, not canceled, attended must not be false
    SELECT json_agg(t) INTO v_today_appointments
    FROM (
        SELECT * FROM appointments 
        WHERE barber_id = v_barber_id 
          AND starts_at::DATE = v_target_date
          AND status NOT IN ('completed', 'no_show', 'cancelled', 'canceled', 'cancelado')
          AND COALESCE(client_attended, true) = true
        ORDER BY starts_at ASC
    ) t;

    -- Upcoming: Future date, not completed, not no_show, not canceled, attended must not be false
    SELECT json_agg(t) INTO v_upcoming_appointments
    FROM (
        SELECT * FROM appointments 
        WHERE barber_id = v_barber_id 
          AND starts_at::DATE > v_target_date
          AND status NOT IN ('completed', 'no_show', 'cancelled', 'canceled', 'cancelado')
          AND COALESCE(client_attended, true) = true
        ORDER BY starts_at ASC
        LIMIT 50
    ) t;

    -- History: status completed OR no_show OR cancelled OR client_attended = false
    SELECT json_agg(t) INTO v_history_appointments
    FROM (
        SELECT * FROM appointments 
        WHERE barber_id = v_barber_id 
          AND (status IN ('completed', 'no_show', 'cancelled', 'canceled', 'cancelado') OR client_attended = false)
        ORDER BY starts_at DESC
        LIMIT 50
    ) t;

    RETURN json_build_object(
        'success', true,
        'summary', v_summary,
        'today', COALESCE(v_today_appointments, '[]'::json),
        'upcoming', COALESCE(v_upcoming_appointments, '[]'::json),
        'history', COALESCE(v_history_appointments, '[]'::json)
    );
END;
$function$;

-- Update get_owner_dashboard_appointments
-- Recreate the view completely to avoid column mismatch
DROP VIEW IF EXISTS public.owner_appointments_view CASCADE;

CREATE VIEW public.owner_appointments_view AS
 SELECT a.id,
    a.starts_at,
    a.status,
    a.price_charged,
    a.barbershop_id,
    a.client_attended,
    u_client.name AS client_name,
    u_client.phone AS client_phone,
    u_barber.name AS barber_name,
    s.name AS service_name,
    s.price AS service_price
   FROM ((((appointments a
     JOIN users u_client ON ((a.client_id = u_client.id)))
     JOIN barbers b ON ((a.barber_id = b.id)))
     JOIN users u_barber ON ((b.user_id = u_barber.id)))
     JOIN services s ON ((a.service_id = s.id)));

-- Recreate function get_owner_dashboard_appointments
DROP FUNCTION IF EXISTS public.get_owner_dashboard_appointments(p_day date);

CREATE OR REPLACE FUNCTION public.get_owner_dashboard_appointments(p_day date)
 RETURNS TABLE(
    id uuid,
    client_name text, 
    client_phone text,
    barber_name text, 
    service_name text, 
    starts_at timestamp with time zone, 
    price_charged numeric, 
    status text,
    client_attended boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_barbershop_id UUID;
BEGIN
    -- Get barbershop_id for the current user
    SELECT barbershop_id INTO v_barbershop_id
    FROM public.users
    WHERE id = auth.uid();

    IF v_barbershop_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        v.id,
        v.client_name,
        v.client_phone,
        v.barber_name,
        v.service_name,
        v.starts_at,
        v.price_charged,
        v.status,
        v.client_attended
    FROM public.owner_appointments_view v
    WHERE v.barbershop_id = v_barbershop_id
    ORDER BY v.starts_at DESC;
END;
$function$;
