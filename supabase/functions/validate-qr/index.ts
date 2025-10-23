import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { qrCode } = await req.json();

    if (!qrCode) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'QR code is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user by ID from QR code
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, user_id')
      .eq('user_id', qrCode)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Usuario no encontrado' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user is blocked
    if (profile.is_blocked) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Usuario bloqueado. Contacta con administración.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log access
    const { error: logError } = await supabase
      .from('access_logs')
      .insert({
        user_id: profile.user_id,
        access_type: 'door_entry',
        timestamp: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging access:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Acceso permitido',
        user: {
          name: profile.full_name,
          email: profile.email
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error interno del servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
