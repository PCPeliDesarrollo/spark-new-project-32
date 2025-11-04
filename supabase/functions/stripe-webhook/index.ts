import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Webhook signature verification failed:", errorMessage);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Webhook event received:", event.type);

    // Handle successful payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.type === "single_class") {
        const userId = session.metadata.user_id;
        const email = session.metadata.email || session.customer_details?.email;
        const paymentIntentId = session.payment_intent as string;

        console.log("Processing single class payment for:", email);

        // Initialize Supabase with service role key
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        let fullName = "";
        let userEmail = email;

        // If user_id exists, get profile info
        if (userId) {
          const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("full_name, email")
            .eq("id", userId)
            .single();

          if (!profileError && profile) {
            fullName = profile.full_name || "";
            userEmail = profile.email;
          }
        }

        // Generate unique QR code
        const qrCode = userId || `guest-${paymentIntentId}`;

        // Insert purchase record
        const purchaseData: any = {
          stripe_payment_id: paymentIntentId,
          amount: 450, // €4.50 in cents
          qr_code: qrCode,
        };

        // Only add user_id if it exists (registered user)
        if (userId) {
          purchaseData.user_id = userId;
        }

        const { data: purchase, error: insertError } = await supabaseAdmin
          .from("single_class_purchases")
          .insert(purchaseData)
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting purchase:", insertError);
          throw new Error("No se pudo registrar la compra");
        }

        console.log("Purchase recorded:", purchase.id);

        // Send email with QR code
        const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #3B82F6;">¡Gracias por tu compra!</h1>
            <p>Hola${fullName ? ` ${fullName}` : ""},</p>
            <p>Has comprado con éxito una clase individual en Pantera Fitness.</p>
            <p><strong>Detalles de tu compra:</strong></p>
            <ul>
              <li>Producto: Clase Individual</li>
              <li>Precio: €4.50</li>
              <li>Fecha: ${new Date().toLocaleDateString("es-ES")}</li>
            </ul>
            <p>Tu código QR para acceder al gimnasio es:</p>
            <div style="text-align: center; margin: 30px 0;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrCode}" 
                   alt="QR Code" 
                   style="width: 300px; height: 300px; border: 2px solid #3B82F6; padding: 10px; background: white;" />
            </div>
            <p><strong>Importante:</strong> Guarda este email para poder acceder a tu clase. Presenta el código QR en la entrada del gimnasio.</p>
            <p>¡Nos vemos en el gimnasio!</p>
            <p style="color: #666; font-size: 12px; margin-top: 40px;">
              Pantera Fitness<br/>
              Este email contiene tu código QR personal. No lo compartas con nadie.
            </p>
          </div>
        `;

        const { error: emailError } = await resend.emails.send({
          from: "Pantera Fitness <onboarding@resend.dev>",
          to: [userEmail],
          subject: "Tu clase individual en Pantera Fitness 🎉",
          html: emailHtml,
        });

        if (emailError) {
          console.error("Error sending email:", emailError);
          // Don't throw - payment was successful, just log the error
        } else {
          console.log("Email sent successfully to:", userEmail);
        }

        // Create notification only for registered users
        if (userId) {
          await supabaseAdmin.from("notifications").insert({
            user_id: userId,
            title: "¡Compra exitosa!",
            message: "Has comprado una clase individual. Revisa tu email para ver el código QR.",
            type: "success",
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
