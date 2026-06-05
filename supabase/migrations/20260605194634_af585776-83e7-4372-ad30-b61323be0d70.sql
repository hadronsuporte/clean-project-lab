CREATE OR REPLACE FUNCTION public.get_financial_report(
  p_barbershop_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_gross_revenue NUMERIC := 0;
  v_total_commission NUMERIC := 0;
  v_completed_count INTEGER := 0;
  v_cancelled_count INTEGER := 0;
BEGIN
  -- Validate period
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Período inválido');
  END IF;

  -- Totals for finished appointments
  SELECT 
    COALESCE(SUM(COALESCE(a.price_charged, a.price)), 0),
    COALESCE(SUM(
      COALESCE(
        a.commission_amount, 
        (COALESCE(a.price_charged, a.price) * COALESCE(b.commission_pct, 0) / 100)
      )
    ), 0),
    COUNT(*)
  INTO 
    v_gross_revenue,
    v_total_commission,
    v_completed_count
  FROM appointments a
  JOIN barbers b ON a.barber_id = b.id
  WHERE a.barbershop_id = p_barbershop_id
    AND a.starts_at >= p_start_date
    AND a.starts_at <= p_end_date
    AND a.status IN ('completed', 'finalizado');

  -- Cancelled count
  SELECT COUNT(*)
  INTO v_cancelled_count
  FROM appointments
  WHERE barbershop_id = p_barbershop_id
    AND starts_at >= p_start_date
    AND starts_at <= p_end_date
    AND status IN ('cancelled', 'canceled', 'cancelado');

  -- Barber Ranking
  WITH barber_stats AS (
    SELECT 
      b.name as barber_name,
      COUNT(*) as total_appointments,
      SUM(COALESCE(a.price_charged, a.price)) as gross_revenue,
      SUM(
        COALESCE(
          a.commission_amount, 
          (COALESCE(a.price_charged, a.price) * COALESCE(b.commission_pct, 0) / 100)
        )
      ) as commission_total
    FROM appointments a
    JOIN barbers b ON a.barber_id = b.id
    WHERE a.barbershop_id = p_barbershop_id
      AND a.starts_at >= p_start_date
      AND a.starts_at <= p_end_date
      AND a.status IN ('completed', 'finalizado')
    GROUP BY b.name
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', barber_name,
      'completed_count', total_appointments,
      'gross_revenue', gross_revenue,
      'commission_total', commission_total,
      'net_revenue', gross_revenue - commission_total
    ) ORDER BY gross_revenue DESC
  ) INTO v_result
  FROM barber_stats;

  -- Service Ranking
  WITH service_stats AS (
    SELECT 
      s.name as service_name,
      COUNT(*) as quantity,
      SUM(COALESCE(a.price_charged, a.price)) as total_revenue
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.barbershop_id = p_barbershop_id
      AND a.starts_at >= p_start_date
      AND a.starts_at <= p_end_date
      AND a.status IN ('completed', 'finalizado')
    GROUP BY s.name
  )
  SELECT 
    jsonb_build_object(
      'success', true,
      'summary', jsonb_build_object(
        'gross_revenue', v_gross_revenue,
        'total_commission', v_total_commission,
        'net_revenue', v_gross_revenue - v_total_commission,
        'completed_count', v_completed_count,
        'cancelled_count', v_cancelled_count,
        'average_ticket', CASE WHEN v_completed_count > 0 THEN v_gross_revenue / v_completed_count ELSE 0 END
      ),
      'barber_ranking', COALESCE(v_result, '[]'::jsonb),
      'service_ranking', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'name', service_name,
            'quantity', quantity,
            'total_revenue', total_revenue
          ) ORDER BY total_revenue DESC
        ), '[]'::jsonb) FROM service_stats
      )
    ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_report TO service_role;
