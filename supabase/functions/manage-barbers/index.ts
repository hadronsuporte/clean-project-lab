import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the requester's user info
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user: requester }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !requester) {
      throw new Error('Não autorizado')
    }

    // Verify if requester is owner
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, barbershop_id')
      .eq('id', requester.id)
      .single()

    if (profile?.role !== 'owner') {
      throw new Error('Apenas donos podem gerenciar barbeiros')
    }

    const { action, barberData } = await req.json()

    if (action === 'create') {
      const { email, password, name, whatsapp, bio, commission, active, avatar_url } = barberData

      // 1. Create Auth User
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name }
      })

      if (createError) throw createError

      // 2. Create Profile
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: newUser.user.id,
          full_name: name,
          whatsapp,
          avatar_url,
          role: 'barber',
          barbershop_id: profile.barbershop_id
        })

      if (profileError) throw profileError

      // 3. Create Barber
      const { error: barberError } = await supabaseClient
        .from('barbers')
        .insert({
          user_id: newUser.user.id,
          barbershop_id: profile.barbershop_id,
          name,
          bio,
          active,
          commission_pct: parseFloat(commission),
          photo_url: avatar_url
        })

      if (barberError) throw barberError

      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Ação inválida')
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
