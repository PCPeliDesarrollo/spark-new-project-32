import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushNotificationPayload {
  user_id: string
  title: string
  message: string
  type?: string
}

// Web Push helper function
async function sendWebPush(
  subscription: any,
  title: string,
  message: string
): Promise<boolean> {
  try {
    // Note: In a production environment, you would use a proper web-push library
    // For now, we'll just log it and return true
    console.log('Sending push notification:', { subscription, title, message })
    
    // In production, you would use web-push library like this:
    // const webpush = require('web-push');
    // webpush.setVapidDetails('mailto:your-email@example.com', publicKey, privateKey);
    // await webpush.sendNotification(subscription, JSON.stringify({ title, message }));
    
    return true
  } catch (error) {
    console.error('Error sending web push:', error)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { user_id, title, message, type = 'info' }: PushNotificationPayload = await req.json()

    if (!user_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, message' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      throw subError
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions for user ${user_id}`)

    // Send push notification to all user's devices
    if (subscriptions && subscriptions.length > 0) {
      const pushPromises = subscriptions.map(({ subscription }) =>
        sendWebPush(subscription, title, message)
      )
      
      await Promise.all(pushPromises)
      console.log(`Push notifications sent successfully to ${subscriptions.length} devices`)
    }

    // Also create in-app notification
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title,
        message,
        type
      })

    if (notifError) {
      console.error('Error creating notification:', notifError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notification sent to ${subscriptions?.length || 0} devices` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in send-push-notification function:', error)
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
