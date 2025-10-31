import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      subscription_renewals: {
        Row: {
          id: string
          user_id: string
          next_payment_date: string
          last_payment_date: string | null
          notified_at_3_days: boolean
          notified_at_5_days: boolean
          created_at: string
          updated_at: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          blocked: boolean
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role: string
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
    today.setHours(0, 0, 0, 0)

    console.log('Checking renewals for date:', today.toISOString())

    // Obtener todas las renovaciones
    const { data: renewals, error: renewalsError } = await supabase
      .from('subscription_renewals')
      .select('*')

    if (renewalsError) {
      console.error('Error fetching renewals:', renewalsError)
      throw renewalsError
    }

    console.log(`Found ${renewals?.length || 0} renewals to check`)

    // Obtener todos los admins para notificarles
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')

    const adminIds = admins?.map(a => a.user_id) || []

    for (const renewal of renewals || []) {
      const nextPaymentDate = new Date(renewal.next_payment_date)
      nextPaymentDate.setHours(0, 0, 0, 0)
      
      const daysUntilPayment = Math.floor((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const daysOverdue = -daysUntilPayment

      console.log(`User ${renewal.user_id}: ${daysUntilPayment} days until payment`)

      // Obtener información del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, blocked')
        .eq('id', renewal.user_id)
        .maybeSingle()

      const userName = profile?.full_name || 'Usuario'

      // Notificación 3 días antes
      if (daysUntilPayment === 3 && !renewal.notified_at_3_days) {
        console.log(`Sending 3-day reminder to user ${renewal.user_id}`)
        
        await supabase.from('notifications').insert({
          user_id: renewal.user_id,
          title: 'Renovación próxima',
          message: 'Tu suscripción se renueva en 3 días. Asegúrate de realizar el pago para seguir disfrutando del gimnasio.',
          type: 'warning'
        })

        await supabase
          .from('subscription_renewals')
          .update({ notified_at_3_days: true })
          .eq('id', renewal.id)
      }

      // Notificación el día del pago
      if (daysUntilPayment === 0 && !renewal.notified_at_5_days) {
        console.log(`Sending payment day notification to user ${renewal.user_id}`)
        
        await supabase.from('notifications').insert({
          user_id: renewal.user_id,
          title: '¡Hoy es el día de renovación!',
          message: 'Tu suscripción debe renovarse hoy. Tienes 5 días para realizar el pago antes de que tu cuenta sea bloqueada.',
          type: 'warning'
        })

        // Notificar a admins
        for (const adminId of adminIds) {
          await supabase.from('notifications').insert({
            user_id: adminId,
            title: 'Renovación pendiente',
            message: `${userName} debe renovar su suscripción hoy.`,
            type: 'info'
          })
        }
      }

      // Notificaciones durante los 5 días de gracia (días 1-4)
      if (daysOverdue > 0 && daysOverdue < 5) {
        console.log(`User ${renewal.user_id} is ${daysOverdue} days overdue`)
        
        await supabase.from('notifications').insert({
          user_id: renewal.user_id,
          title: `Pago pendiente - Día ${daysOverdue} de 5`,
          message: `Te quedan ${5 - daysOverdue} días para renovar tu suscripción antes de que tu cuenta sea bloqueada.`,
          type: 'warning'
        })

        // Notificar a admins sobre usuarios con pago pendiente
        if (daysOverdue === 1 || daysOverdue === 3) {
          for (const adminId of adminIds) {
            await supabase.from('notifications').insert({
              user_id: adminId,
              title: 'Usuario con pago pendiente',
              message: `${userName} lleva ${daysOverdue} día(s) sin renovar su suscripción.`,
              type: 'warning'
            })
          }
        }
      }

      // Bloquear cuenta después de 5 días
      if (daysOverdue >= 5 && !profile?.blocked) {
        console.log(`Blocking user ${renewal.user_id} after ${daysOverdue} days overdue`)
        
        await supabase
          .from('profiles')
          .update({ blocked: true })
          .eq('id', renewal.user_id)

        await supabase.from('notifications').insert({
          user_id: renewal.user_id,
          title: 'Cuenta bloqueada',
          message: 'Tu cuenta ha sido bloqueada por falta de pago. Contacta con el administrador para reactivarla.',
          type: 'warning'
        })

        // Notificar a admins
        for (const adminId of adminIds) {
          await supabase.from('notifications').insert({
            user_id: adminId,
            title: 'Usuario bloqueado',
            message: `${userName} ha sido bloqueado automáticamente por falta de pago.`,
            type: 'warning'
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${renewals?.length || 0} renewals` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in check-renewals function:', error)
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
