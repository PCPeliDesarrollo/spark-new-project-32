import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting weekly bookings reset...');

    // Get the start of current week (Monday)
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday (0), go back 6 days, otherwise go back to Monday
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    console.log('Current week start:', currentWeekStart.toISOString());

    // Delete all bookings from previous weeks
    const { data: deletedBookings, error: deleteError } = await supabase
      .from('class_bookings')
      .delete()
      .lt('created_at', currentWeekStart.toISOString())
      .select();

    if (deleteError) {
      console.error('Error deleting old bookings:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${deletedBookings?.length || 0} old bookings`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount: deletedBookings?.length || 0,
        message: `Reset completed. Deleted ${deletedBookings?.length || 0} bookings from previous weeks.`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in reset-weekly-bookings function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
