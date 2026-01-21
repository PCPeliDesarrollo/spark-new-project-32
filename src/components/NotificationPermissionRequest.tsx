import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

export function NotificationPermissionRequest() {
  const [showRequest, setShowRequest] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { isSupported, subscribeToPush, isLoading } = usePushNotifications();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we should show the notification request
    const hasRequestedBefore = localStorage.getItem("notification_permission_requested");
    const notificationPermission = "Notification" in window ? Notification.permission : "denied";

    if (!hasRequestedBefore && notificationPermission === "default" && !dismissed && isSupported) {
      setShowRequest(true);
    }
  }, [dismissed, isSupported]);

  const handleRequestPermission = async () => {
    if (!isSupported) {
      toast({
        title: "No soportado",
        description: "Tu navegador no soporta notificaciones push",
        variant: "destructive",
      });
      return;
    }

    try {
      await subscribeToPush();
      localStorage.setItem("notification_permission_requested", "true");
      setShowRequest(false);
      
      toast({
        title: "¡Notificaciones activadas!",
        description: "Recibirás notificaciones push incluso cuando no estés en la app",
      });
    } catch (error) {
      console.error("Error al solicitar permisos:", error);
      toast({
        title: "Error",
        description: "No se pudieron activar las notificaciones. Por favor, verifica los permisos de tu navegador.",
        variant: "destructive",
      });
      localStorage.setItem("notification_permission_requested", "true");
      setShowRequest(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("notification_permission_requested", "true");
    setDismissed(true);
    setShowRequest(false);
  };

  if (!showRequest) return null;

  return (
    <Alert className="mb-4 border-primary/50 bg-primary/10 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      <Bell className="h-4 w-4" />
      <AlertTitle>Mantente al tanto</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          Activa las notificaciones para recibir recordatorios de tus clases, cumpleaños y noticias importantes de Panthera Fitness Alburquerque.
        </p>
        <Button 
          onClick={handleRequestPermission} 
          size="sm" 
          className="w-fit"
          disabled={isLoading}
        >
          {isLoading ? "Activando..." : "Activar notificaciones"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
