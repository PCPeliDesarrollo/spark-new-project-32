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
    // Optional device-level shared secret. When the environment variable
    // `QR_DEVICE_SECRET` is configured, only callers presenting the matching
    // header may validate codes. If unset, the endpoint stays open for
    // backwards compatibility with the physical door reader.
    const deviceSecret = Deno.env.get('QR_DEVICE_SECRET');
    if (deviceSecret) {
      const provided = req.headers.get('x-device-secret');
      if (provided !== deviceSecret) {
        return new Response(
          JSON.stringify({ success: false, message: 'No autorizado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Código de acceso requerido' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate that code is 6 digits
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Formato de código inválido' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check profiles table for permanent access code
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, apellidos, email, blocked, access_code')
      .eq('access_code', code)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking access code:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error al verificar el código' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Código inválido' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user is blocked
    if (profile.blocked) {
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

    // Log the access
    await supabase
      .from('access_logs')
      .insert({
        user_id: profile.id,
        access_type: 'door_entry',
        timestamp: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Acceso permitido',
        user: {
          name: `${profile.full_name} ${profile.apellidos || ''}`.trim()
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
