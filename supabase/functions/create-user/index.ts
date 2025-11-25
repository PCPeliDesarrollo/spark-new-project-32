import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || !roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, full_name, apellidos, telefono, fecha_nacimiento, access_code, role } = await req.json();

    if (!email || !password || !fecha_nacimiento || !access_code) {
      return new Response(JSON.stringify({ error: "Email, password, fecha de nacimiento y código de acceso son requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate access_code format
    if (!/^\d{6}$/.test(access_code)) {
      return new Response(JSON.stringify({ error: "El código de acceso debe tener exactamente 6 dígitos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if access_code already exists
    const { data: existingCode } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("access_code", access_code)
      .maybeSingle();

    if (existingCode) {
      return new Response(JSON.stringify({ error: "Este código de acceso ya está en uso" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newUser.user) {
      // Update profile with additional fields including access_code
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          apellidos: apellidos || null,
          telefono: telefono || null,
          fecha_nacimiento: fecha_nacimiento || null,
          access_code: access_code,
        })
        .eq("id", newUser.user.id);

      if (profileUpdateError) {
        console.error("Error updating profile:", profileUpdateError);
        return new Response(JSON.stringify({ error: "Error al actualizar el perfil del usuario" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update the user's role if specified (default is handled by trigger)
      if (role && role !== "standard") {
        const { error: roleUpdateError } = await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", newUser.user.id);

        if (roleUpdateError) {
          console.error("Error updating role:", roleUpdateError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, user: newUser.user }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
