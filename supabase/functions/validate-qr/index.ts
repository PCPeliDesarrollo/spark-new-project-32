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

    const { qrCode, accessCode } = await req.json();

    if (!qrCode && !accessCode) {
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

    // If accessCode is provided, validate single class purchase
    if (accessCode) {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: purchase, error: purchaseError } = await supabase
        .from('single_class_purchases')
        .select('*')
        .eq('access_code', accessCode)
        .eq('used', false)
        .single();

      if (purchaseError || !purchase) {
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

      // Check if purchase is from today
      const purchaseDate = new Date(purchase.created_at).toISOString().split('T')[0];
      if (purchaseDate !== today) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'El código solo es válido el día de la compra' 
          }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Mark as used
      await supabase
        .from('single_class_purchases')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', purchase.id);

      // Log access
      if (purchase.user_id) {
        await supabase
          .from('access_logs')
          .insert({
            user_id: purchase.user_id,
            access_type: 'single_class',
            timestamp: new Date().toISOString()
          });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Acceso permitido - Clase individual',
          user: purchase.user_id ? { name: 'Usuario invitado' } : null
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user by ID from QR code
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', qrCode)
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

    // Log access
    const { error: logError } = await supabase
      .from('access_logs')
      .insert({
        user_id: profile.id,
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
          name: `${profile.full_name} ${profile.apellidos || ''}`.trim(),
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
