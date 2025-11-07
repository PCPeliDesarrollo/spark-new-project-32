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

    // Validar código de acceso temporal
    const { data: accessCode, error: codeError } = await supabase
      .from('access_codes')
      .select('*, profiles(*)')
      .eq('code', code)
      .eq('used', false)
      .single();

    if (codeError || !accessCode) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Código inválido o ya utilizado' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar que no haya expirado
    const now = new Date();
    const expiresAt = new Date(accessCode.expires_at);
    
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'El código ha expirado' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar que el usuario no esté bloqueado
    if (accessCode.profiles.blocked) {
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

    // Marcar código como usado
    await supabase
      .from('access_codes')
      .update({ used: true })
      .eq('id', accessCode.id);

    // Registrar acceso
    await supabase
      .from('access_logs')
      .insert({
        user_id: accessCode.user_id,
        access_type: 'door_entry',
        timestamp: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Acceso permitido',
        user: {
          name: `${accessCode.profiles.full_name} ${accessCode.profiles.apellidos || ''}`.trim(),
          email: accessCode.profiles.email
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
