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

    // Get reminder type from request body (morning or hourly)
    const body = await req.json().catch(() => ({}))
    const reminderType = body.type || 'hourly'

    console.log(`Running ${reminderType} reminders...`)

    const now = new Date()
    
    if (reminderType === 'morning') {
      // Morning reminder: notify about all classes today
      return await sendMorningReminders(supabase, now)
    } else {
      // Hourly reminder: notify 1 hour before class
      return await sendHourlyReminders(supabase, now)
    }
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

async function sendMorningReminders(supabase: any, now: Date) {
  console.log('Sending morning reminders for today\'s classes...')
  
  const today = now.toISOString().split('T')[0]
  
  // Get all confirmed bookings for today grouped by user
  const { data: bookings, error: bookingsError } = await supabase
    .from('class_bookings')
    .select(`
      id,
      user_id,
      class_date,
      morning_reminder_sent,
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
    .eq('morning_reminder_sent', false)
    .eq('class_date', today)
    .order('class_schedules(start_time)', { ascending: true })

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError)
    throw bookingsError
  }

  console.log(`Found ${bookings?.length || 0} bookings for today`)

  // Group bookings by user
  const userBookings = new Map<string, any[]>()
  for (const booking of bookings || []) {
    if (!userBookings.has(booking.user_id)) {
      userBookings.set(booking.user_id, [])
    }
    userBookings.get(booking.user_id)!.push(booking)
  }

  let remindersCount = 0

  // Send one notification per user with all their classes
  for (const [userId, userClasses] of userBookings) {
    const profile = userClasses[0].profiles as any
    const userName = profile?.full_name || 'Usuario'
    
    let classesText = ''
    if (userClasses.length === 1) {
      const schedules = userClasses[0].class_schedules as any
      const className = schedules.classes?.name || 'clase'
      classesText = `Tienes ${className} a las ${schedules.start_time.slice(0, 5)}`
    } else {
      classesText = `Tienes ${userClasses.length} clases hoy:\n`
      userClasses.forEach(booking => {
        const schedules = booking.class_schedules as any
        const className = schedules.classes?.name || 'clase'
        classesText += `• ${className} a las ${schedules.start_time.slice(0, 5)}\n`
      })
    }
    
    // Send push notification
    const { error: notifError } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userId,
        title: '🌅 Buenos días, ' + userName,
        message: classesText + '\n¡Que tengas un gran entrenamiento!',
        type: 'info'
      }
    })

    if (notifError) {
      console.error(`Error sending morning notification to user ${userId}:`, notifError)
    } else {
      // Mark all bookings as reminded
      const bookingIds = userClasses.map(b => b.id)
      const { error: updateError } = await supabase
        .from('class_bookings')
        .update({ morning_reminder_sent: true })
        .in('id', bookingIds)

      if (updateError) {
        console.error(`Error updating morning_reminder_sent:`, updateError)
      } else {
        remindersCount++
      }
    }
  }

  console.log(`Sent ${remindersCount} morning reminders successfully`)

  return new Response(
    JSON.stringify({ 
      success: true,
      message: `Sent ${remindersCount} morning reminders`
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  )
}

async function sendHourlyReminders(supabase: any, now: Date) {
  console.log('Checking for classes starting in 1 hour...')
  
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
  
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

  console.log(`Found ${bookings?.length || 0} bookings to check`)

  let remindersCount = 0

  // Process each booking
  for (const booking of bookings || []) {
    const schedules = booking.class_schedules as any
    if (!schedules || !schedules.start_time) continue

    // Parse class start time
    const [classHour, classMinute] = schedules.start_time.split(':').map(Number)
    
    // Check if class starts exactly in ~1 hour (within 15 minute window)
    const minutesDiff = (classHour * 60 + classMinute) - (targetHour * 60 + targetMinute)
    
    if (minutesDiff >= -7 && minutesDiff <= 7) {
      console.log(`Sending 1-hour reminder for booking ${booking.id}`)
      
      const className = schedules.classes?.name || 'tu clase'
      const profile = booking.profiles as any
      const userName = profile?.full_name || 'Usuario'
      
      // Send push notification
      const { error: notifError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: booking.user_id,
          title: '⏰ Clase en 1 hora',
          message: `¡Hola ${userName}! Tu clase de ${className} empieza a las ${schedules.start_time.slice(0, 5)}. ¡Prepárate!`,
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

  console.log(`Sent ${remindersCount} hourly reminders successfully`)

  return new Response(
    JSON.stringify({ 
      success: true,
      message: `Sent ${remindersCount} hourly reminders`
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  )
}
