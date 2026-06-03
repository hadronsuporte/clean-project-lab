-- Drop functions that will have their return types or signatures changed
DROP FUNCTION IF EXISTS public.get_barber_dashboard(date);
DROP FUNCTION IF EXISTS public.get_owner_dashboard_appointments(date);

CREATE OR REPLACE FUNCTION public.get_barber_dashboard(p_day date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_barber_id UUID;
    v_barbershop_id UUID;
    v_commission_pct NUMERIC;
    v_summary JSONB;
    v_today JSONB;
    v_upcoming JSONB;
    v_history JSONB;
BEGIN
    v_user_id := auth.uid();
    
    -- Get barber info
    SELECT id, barbershop_id, COALESCE(commission_pct, 0)
    INTO v_barber_id, v_barbershop_id, v_commission_pct
    FROM public.barbers 
    WHERE user_id = v_user_id AND active = true
    LIMIT 1;

    IF v_barber_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Barbeiro não encontrado ou inativo');
    END IF;

    -- Summary for p_day (total counts and money for today)
    SELECT jsonb_build_object(
        'appointments_today', count(*),
        'gross_today', coalesce(sum(price_charged), 0),
        'commission_today', coalesce(
            sum(
                CASE 
                    WHEN status IN ('completed', 'finalizado') THEN COALESCE(commission_amount, price_charged * (v_commission_pct / 100.0))
                    ELSE 0 
                END
            ), 0
        ),
        'commission_pct', v_commission_pct
    ) INTO v_summary
    FROM public.appointments
    WHERE barber_id = v_barber_id
      AND starts_at::date = p_day
      AND status NOT IN ('cancelled', 'canceled', 'cancelado');

    -- Today's active appointments (not finished, not cancelled)
    SELECT coalesce(jsonb_agg(item), '[]'::jsonb) INTO v_today
    FROM (
        SELECT 
            a.id,
            u.name as client_name,
            u.phone as client_phone,
            s.name as service_name,
            a.starts_at,
            a.price,
            a.price_charged,
            COALESCE(a.commission_amount, a.price_charged * (v_commission_pct / 100.0)) as commission_amount,
            a.status
        FROM public.appointments a
        JOIN public.users u ON a.client_id = u.id
        JOIN public.services s ON a.service_id = s.id
        WHERE a.barber_id = v_barber_id
          AND a.starts_at::date = p_day
          AND a.status NOT IN ('completed', 'finalizado', 'cancelled', 'canceled', 'cancelado')
          AND a.starts_at > now() - interval '1 hour'
        ORDER BY a.starts_at ASC
    ) item;

    -- Upcoming (future days)
    SELECT coalesce(jsonb_agg(item), '[]'::jsonb) INTO v_upcoming
    FROM (
        SELECT 
            a.id,
            u.name as client_name,
            u.phone as client_phone,
            s.name as service_name,
            a.starts_at,
            a.price,
            a.price_charged,
            COALESCE(a.commission_amount, a.price_charged * (v_commission_pct / 100.0)) as commission_amount,
            a.status
        FROM public.appointments a
        JOIN public.users u ON a.client_id = u.id
        JOIN public.services s ON a.service_id = s.id
        WHERE a.barber_id = v_barber_id
          AND (
            (a.starts_at::date > p_day)
            OR (a.starts_at::date = p_day AND a.status NOT IN ('completed', 'finalizado', 'cancelled', 'canceled', 'cancelado') AND a.starts_at > now())
          )
          AND a.status NOT IN ('completed', 'finalizado', 'cancelled', 'canceled', 'cancelado')
        ORDER BY a.starts_at ASC
    ) item;

    -- History (finished, cancelled or past)
    SELECT coalesce(jsonb_agg(item), '[]'::jsonb) INTO v_history
    FROM (
        SELECT 
            a.id,
            u.name as client_name,
            u.phone as client_phone,
            s.name as service_name,
            a.starts_at,
            a.price,
            a.price_charged,
            COALESCE(a.commission_amount, a.price_charged * (v_commission_pct / 100.0)) as commission_amount,
            a.status
        FROM public.appointments a
        JOIN public.users u ON a.client_id = u.id
        JOIN public.services s ON a.service_id = s.id
        WHERE a.barber_id = v_barber_id
          AND (
            a.status IN ('completed', 'finalizado', 'cancelled', 'canceled', 'cancelado')
            OR a.starts_at < now() - interval '1 hour'
          )
        ORDER BY a.starts_at DESC
        LIMIT 50
    ) item;

    RETURN jsonb_build_object(
        'success', true,
        'summary', v_summary,
        'today', v_today,
        'upcoming', v_upcoming,
        'history', v_history
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_owner_dashboard_appointments(p_day date)
 RETURNS TABLE(client_name text, barber_name text, service_name text, starts_at timestamp with time zone, price_charged numeric, status text)
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

    -- Returning all appointments for the barbershop
    RETURN QUERY
    SELECT 
        v.client_name,
        v.barber_name,
        v.service_name,
        v.starts_at,
        v.price_charged,
        v.status
    FROM public.owner_appointments_view v
    WHERE v.barbershop_id = v_barbershop_id
    ORDER BY v.starts_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finish_barber_appointment(p_appointment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID;
    v_barber_id UUID;
    v_commission_pct NUMERIC;
    v_price_charged NUMERIC;
    v_commission_amount NUMERIC;
BEGIN
    v_user_id := auth.uid();

    -- Check if appointment exists and belongs to the barber
    SELECT a.barber_id, a.price_charged, b.commission_pct
    INTO v_barber_id, v_price_charged, v_commission_pct
    FROM public.appointments a
    JOIN public.barbers b ON a.barber_id = b.id
    WHERE a.id = p_appointment_id AND b.user_id = v_user_id;

    IF v_barber_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado ou sem permissão');
    END IF;

    -- Calculate commission
    v_commission_amount := v_price_charged * (COALESCE(v_commission_pct, 0) / 100.0);

    -- Update appointment
    UPDATE public.appointments
    SET status = 'completed',
        price = v_price_charged,
        commission_amount = v_commission_amount
    WHERE id = p_appointment_id;

    RETURN jsonb_build_object(
        'success', true, 
        'price', v_price_charged, 
        'commission_amount', v_commission_amount
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
