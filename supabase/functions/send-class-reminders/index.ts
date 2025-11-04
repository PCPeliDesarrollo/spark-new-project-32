import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Checking for classes starting in 1 hour...')

    // Get current time and 1 hour from now
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    
    // Format times for comparison
    const targetDate = oneHourFromNow.toISOString().split('T')[0]
    const targetHour = oneHourFromNow.getHours()
    const targetMinute = oneHourFromNow.getMinutes()
    
    // Get all confirmed bookings for today that haven't been reminded yet
    const { data: bookings, error: bookingsError } = await supabase
      .from('class_bookings')
      .select(`
        id,
        user_id,
        class_date,
        reminder_sent,
        class_schedules!inner (
          start_time,
          classes!inner (
            name
          )
        ),
        profiles (
          full_name
        )
      `)
      .eq('status', 'confirmed')
      .eq('reminder_sent', false)
      .eq('class_date', targetDate)

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      throw bookingsError
    }

    console.log(`Found ${bookings?.length || 0} bookings for today`)

    let remindersCount = 0

    // Process each booking
    for (const booking of bookings || []) {
      const schedules = booking.class_schedules as any
      if (!schedules || !schedules.start_time) continue

      // Parse class start time
      const [classHour, classMinute] = schedules.start_time.split(':').map(Number)
      
      // Check if class starts exactly in ~1 hour (within 15 minute window to account for cron timing)
      const minutesDiff = (classHour * 60 + classMinute) - (targetHour * 60 + targetMinute)
      
      if (minutesDiff >= -7 && minutesDiff <= 7) {
        console.log(`Sending reminder for booking ${booking.id}`)
        
        const className = schedules.classes?.name || 'tu clase'
        const profile = booking.profiles as any
        const userName = profile?.full_name || 'Usuario'
        
        // Send push notification using existing edge function
        const { error: notifError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: booking.user_id,
            title: '⏰ Clase en 1 hora',
            message: `¡Hola ${userName}! Tu clase de ${className} empieza a las ${schedules.start_time.slice(0, 5)}. ¡Te esperamos!`,
            type: 'info'
          }
        })

        if (notifError) {
          console.error(`Error sending notification for booking ${booking.id}:`, notifError)
        } else {
          // Mark as reminded
          const { error: updateError } = await supabase
            .from('class_bookings')
            .update({ reminder_sent: true })
            .eq('id', booking.id)

          if (updateError) {
            console.error(`Error updating reminder_sent for booking ${booking.id}:`, updateError)
          } else {
            remindersCount++
          }
        }
      }
    }

    console.log(`Sent ${remindersCount} reminders successfully`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Sent ${remindersCount} class reminders`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in send-class-reminders function:', error)
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
