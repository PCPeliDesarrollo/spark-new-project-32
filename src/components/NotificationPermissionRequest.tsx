import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";

export function NotificationPermissionRequest() {
  const [showRequest, setShowRequest] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if we should show the notification request
    const hasRequestedBefore = localStorage.getItem("notification_permission_requested");
    const notificationPermission = "Notification" in window ? Notification.permission : "denied";

    if (!hasRequestedBefore && notificationPermission === "default" && !dismissed) {
      setShowRequest(true);
    }
  }, [dismissed]);

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      console.log("Este navegador no soporta notificaciones");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      localStorage.setItem("notification_permission_requested", "true");
      setShowRequest(false);
      
      if (permission === "granted") {
        console.log("Permisos de notificación concedidos");
      }
    } catch (error) {
      console.error("Error al solicitar permisos:", error);
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
          Activa las notificaciones para recibir recordatorios de tus clases, cumpleaños y noticias importantes de Pantera CrossTraining.
        </p>
        <Button onClick={handleRequestPermission} size="sm" className="w-fit">
          Activar notificaciones
        </Button>
      </AlertDescription>
    </Alert>
  );
}
