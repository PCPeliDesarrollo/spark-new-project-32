import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          fecha_nacimiento: string | null
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient<Database>(supabaseUrl, supabaseKey)

    const today = new Date()
    const todayMonth = today.getMonth() + 1 // JavaScript months are 0-indexed
    const todayDay = today.getDate()

    console.log(`Checking birthdays for ${todayMonth}/${todayDay}`)

    // Obtener todos los perfiles con fecha de nacimiento
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, fecha_nacimiento')
      .not('fecha_nacimiento', 'is', null)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    console.log(`Found ${profiles?.length || 0} profiles with birthdays`)

    let birthdayCount = 0

    for (const profile of profiles || []) {
      if (!profile.fecha_nacimiento) continue

      const birthDate = new Date(profile.fecha_nacimiento)
      const birthMonth = birthDate.getMonth() + 1
      const birthDay = birthDate.getDate()

      // Verificar si hoy es el cumpleaños
      if (birthMonth === todayMonth && birthDay === todayDay) {
        console.log(`Birthday found for user ${profile.id}: ${profile.full_name}`)
        birthdayCount++

        const userName = profile.full_name || 'Usuario'

        // Enviar notificación de cumpleaños
        await supabase.from('notifications').insert({
          user_id: profile.id,
          title: '¡Feliz Cumpleaños! 🎉',
          message: `Querido/a ${userName}, toda la familia Panthera te desea un feliz cumpleaños. ¡Que tengas un día increíble lleno de alegría y salud! 💪🎂`,
          type: 'success'
        })

        console.log(`Birthday notification sent to ${profile.full_name}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${profiles?.length || 0} profiles, found ${birthdayCount} birthdays` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in check-birthdays function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
