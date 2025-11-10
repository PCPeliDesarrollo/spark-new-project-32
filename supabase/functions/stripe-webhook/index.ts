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
      event = await stripe.webhooks.constructEventAsync(
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

        // Generate unique 6-digit access code
        const generateAccessCode = () => {
          return Math.floor(100000 + Math.random() * 900000).toString();
        };

        let accessCode = generateAccessCode();
        
        // Ensure code is unique
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          const { data: existing } = await supabaseAdmin
            .from("single_class_purchases")
            .select("id")
            .eq("access_code", accessCode)
            .eq("used", false)
            .maybeSingle();
          
          if (!existing) {
            isUnique = true;
          } else {
            accessCode = generateAccessCode();
            attempts++;
          }
        }

        // Insert purchase record
        const purchaseData: any = {
          stripe_payment_id: paymentIntentId,
          amount: 450, // €4.50 in cents
          qr_code: userId || `guest-${paymentIntentId}`,
          access_code: accessCode,
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
            <p>Has comprado con éxito una clase individual en Panthera Fitness Alburquerque.</p>
            <p><strong>Detalles de tu compra:</strong></p>
            <ul>
              <li>Producto: Clase Individual</li>
              <li>Precio: €4.50</li>
              <li>Fecha: ${new Date().toLocaleDateString("es-ES")}</li>
            </ul>
            <p style="font-size: 16px; font-weight: bold; margin: 30px 0;">Tu código de acceso es:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%); color: white; font-size: 48px; font-weight: bold; padding: 30px; border-radius: 15px; letter-spacing: 8px; box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);">
                ${accessCode}
              </div>
            </div>
            <p><strong>Importante:</strong> Este código es válido solo para HOY ${new Date().toLocaleDateString("es-ES")}. Guarda este email y presenta el código en la entrada del gimnasio.</p>
            <p style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
              ⚠️ <strong>Atención:</strong> El código debe usarse el mismo día de la compra. Una vez usado, no podrás reutilizarlo.
            </p>
            <p style="background: #E0F2FE; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0;">
              📧 <strong>¿No has recibido el correo en 10 minutos?</strong><br/>
              Revisa tu carpeta de spam o contacta con nosotros al <strong>623 61 69 50</strong>
            </p>
            <p>¡Nos vemos en el gimnasio!</p>
            <p style="color: #666; font-size: 12px; margin-top: 40px;">
              Panthera Fitness Alburquerque<br/>
              Teléfono: 623 61 69 50<br/>
              Este email contiene tu código de acceso personal. No lo compartas con nadie.
            </p>
          </div>
        `;

        const { error: emailError } = await resend.emails.send({
          from: "Panthera Fitness <onboarding@resend.dev>",
          to: [userEmail],
          subject: `Tu código de acceso: ${accessCode} - Panthera Fitness 🎉`,
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
            message: `Has comprado una clase individual. Tu código de acceso es: ${accessCode}. Válido solo para hoy.`,
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
