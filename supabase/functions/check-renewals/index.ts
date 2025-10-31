import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Profile {
  id: string;
  full_name: string;
  blocked: boolean;
}

interface SubscriptionRenewal {
  id: string;
  user_id: string;
  next_payment_date: string;
  notified_at_3_days: boolean;
  notified_at_5_days: boolean;
  profiles: Profile;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Checking subscription renewals...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Obtener todas las renovaciones pendientes
    const { data: renewals, error: renewalsError } = await supabase
      .from('subscription_renewals')
      .select(`
        *,
        profiles!inner (
          id,
          full_name,
          blocked
        )
      `)
      .returns<SubscriptionRenewal[]>();

    if (renewalsError) {
      console.error('Error fetching renewals:', renewalsError);
      throw renewalsError;
    }

    console.log(`Found ${renewals?.length || 0} renewals to check`);

    const notifications: Array<{ user_id: string; title: string; message: string; type: string }> = [];
    const usersToBlock: string[] = [];

    for (const renewal of renewals || []) {
      const nextPaymentDate = new Date(renewal.next_payment_date);
      nextPaymentDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`User ${renewal.profiles.full_name}: ${daysDiff} days until payment`);

      // Notificación 3 días antes del vencimiento
      if (daysDiff === 3 && !renewal.notified_at_3_days) {
        console.log(`Notifying user ${renewal.profiles.full_name} - 3 days warning`);
        
        notifications.push({
          user_id: renewal.user_id,
          title: 'Renovación próxima',
          message: 'Tu suscripción vence en 3 días. Por favor, renueva tu pago para evitar la suspensión de tu cuenta.',
          type: 'warning'
        });

        // Notificar a admins
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (admins) {
          for (const admin of admins) {
            notifications.push({
              user_id: admin.user_id,
              title: 'Usuario próximo a vencer',
              message: `${renewal.profiles.full_name} debe renovar su suscripción en 3 días.`,
              type: 'info'
            });
          }
        }

        // Marcar como notificado
        await supabase
          .from('subscription_renewals')
          .update({ notified_at_3_days: true })
          .eq('id', renewal.id);
      }

      // 5 días después del vencimiento: bloquear usuario y notificar
      if (daysDiff <= -5 && !renewal.profiles.blocked) {
        console.log(`Blocking user ${renewal.profiles.full_name} - 5 days overdue`);
        
        usersToBlock.push(renewal.user_id);

        notifications.push({
          user_id: renewal.user_id,
          title: 'Cuenta bloqueada',
          message: 'Tu cuenta ha sido bloqueada por falta de pago. Contacta con el administrador para renovar tu suscripción.',
          type: 'error'
        });

        // Notificar a admins
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (admins) {
          for (const admin of admins) {
            notifications.push({
              user_id: admin.user_id,
              title: 'Usuario bloqueado por impago',
              message: `${renewal.profiles.full_name} ha sido bloqueado automáticamente por falta de pago (5+ días de retraso).`,
              type: 'warning'
            });
          }
        }

        await supabase
          .from('subscription_renewals')
          .update({ notified_at_5_days: true })
          .eq('id', renewal.id);
      }

      // Notificación en la fecha exacta de vencimiento
      if (daysDiff === 0 && !renewal.notified_at_5_days) {
        console.log(`Notifying user ${renewal.profiles.full_name} - payment due today`);
        
        notifications.push({
          user_id: renewal.user_id,
          title: '¡Renovación vencida!',
          message: 'Tu suscripción vence hoy. Renueva tu pago lo antes posible. Después de 5 días, tu cuenta será bloqueada automáticamente.',
          type: 'error'
        });

        // Notificar a admins
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (admins) {
          for (const admin of admins) {
            notifications.push({
              user_id: admin.user_id,
              title: 'Usuario con pago vencido',
              message: `${renewal.profiles.full_name} tiene su pago vencido hoy. Será bloqueado automáticamente en 5 días.`,
              type: 'warning'
            });
          }
        }
      }

      // Notificaciones para días 1-4 después del vencimiento
      if (daysDiff < 0 && daysDiff > -5 && !renewal.notified_at_5_days) {
        const daysOverdue = Math.abs(daysDiff);
        const daysUntilBlock = 5 - daysOverdue;
        
        console.log(`User ${renewal.profiles.full_name} is ${daysOverdue} days overdue`);
        
        notifications.push({
          user_id: renewal.user_id,
          title: `¡Urgente! ${daysUntilBlock} días para bloqueo`,
          message: `Tu pago está vencido hace ${daysOverdue} día${daysOverdue > 1 ? 's' : ''}. Tu cuenta será bloqueada en ${daysUntilBlock} día${daysUntilBlock > 1 ? 's' : ''} si no renuevas.`,
          type: 'error'
        });
      }
    }

    // Bloquear usuarios
    if (usersToBlock.length > 0) {
      console.log(`Blocking ${usersToBlock.length} users`);
      const { error: blockError } = await supabase
        .from('profiles')
        .update({ blocked: true })
        .in('id', usersToBlock);

      if (blockError) {
        console.error('Error blocking users:', blockError);
      }
    }

    // Insertar todas las notificaciones
    if (notifications.length > 0) {
      console.log(`Inserting ${notifications.length} notifications`);
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error inserting notifications:', notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: renewals?.length || 0,
        blocked: usersToBlock.length,
        notifications: notifications.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in check-renewals:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
