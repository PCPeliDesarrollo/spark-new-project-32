import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const PUBLIC_VAPID_KEY = "BN0D7Hpz0K_dCZLNVQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWXVBQWX"; // This will be replaced by the actual VAPID key

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkSupport = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(checkSupport);
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    setIsLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission not granted for Notification');
      }

      // Register service worker
      const registration = await registerServiceWorker();
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });

      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const subscriptionData = {
          user_id: user.id,
          subscription: pushSubscription.toJSON() as any
        };

        const { error } = await supabase
          .from('push_subscriptions')
          .upsert(subscriptionData, {
            onConflict: 'user_id,subscription'
          });

        if (error) {
          console.error('Error saving subscription:', error);
          throw error;
        }

        setSubscription(pushSubscription);
        console.log('Push subscription saved successfully');
      }

      return pushSubscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (subscription) {
      try {
        await subscription.unsubscribe();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id);
        }

        setSubscription(null);
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    }
  };

  return {
    isSupported,
    subscription,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush
  };
}
