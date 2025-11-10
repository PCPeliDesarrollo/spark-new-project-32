import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Only admins can process payments");
    }

    const { userId } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log("Processing payment for user:", userId);

    // Get current renewal info
    const { data: currentRenewal, error: fetchError } = await supabaseAdmin
      .from("subscription_renewals")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching renewal:", fetchError);
      throw new Error("Error al buscar información de renovación");
    }

    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    if (currentRenewal) {
      // Update existing renewal
      const { error: updateError } = await supabaseAdmin
        .from("subscription_renewals")
        .update({
          last_payment_date: today.toISOString().split('T')[0],
          next_payment_date: nextMonth.toISOString().split('T')[0],
          notified_at_3_days: false,
          notified_at_5_days: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating renewal:", updateError);
        throw new Error("Error al actualizar renovación");
      }
    } else {
      // Create new renewal
      const { error: insertError } = await supabaseAdmin
        .from("subscription_renewals")
        .insert({
          user_id: userId,
          last_payment_date: today.toISOString().split('T')[0],
          next_payment_date: nextMonth.toISOString().split('T')[0],
          notified_at_3_days: false,
          notified_at_5_days: false,
        });

      if (insertError) {
        console.error("Error creating renewal:", insertError);
        throw new Error("Error al crear renovación");
      }
    }

    // Unblock user if blocked
    const { error: unblockError } = await supabaseAdmin
      .from("profiles")
      .update({ blocked: false })
      .eq("id", userId);

    if (unblockError) {
      console.error("Error unblocking user:", unblockError);
    }

    // Reset monthly classes: delete all future bookings for this user
    const todayDate = today.toISOString().split('T')[0];
    const { error: deleteBookingsError } = await supabaseAdmin
      .from("class_bookings")
      .delete()
      .eq("user_id", userId)
      .gte("class_date", todayDate);

    if (deleteBookingsError) {
      console.error("Error deleting future bookings:", deleteBookingsError);
    } else {
      console.log("Deleted future bookings for user:", userId);
    }

    // Get user info for notification
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    // Create success notification for user
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Pago registrado",
      message: `Tu pago mensual ha sido registrado correctamente. Próximo pago: ${nextMonth.toLocaleDateString("es-ES")}`,
      type: "success",
    });

    // Notify admins
    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (admins) {
      for (const admin of admins) {
        await supabaseAdmin.from("notifications").insert({
          user_id: admin.user_id,
          title: "Pago registrado",
          message: `Pago registrado para ${profile?.full_name || "usuario"}. Próximo pago: ${nextMonth.toLocaleDateString("es-ES")}`,
          type: "info",
        });
      }
    }

    console.log("Payment processed successfully for user:", userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Pago registrado correctamente",
        nextPaymentDate: nextMonth.toISOString().split('T')[0]
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing payment:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
