import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

const isAuthSessionError = (error: unknown) => {
  const authError = error as { message?: string; code?: string; status?: number };
  const value = `${authError?.message ?? ""} ${authError?.code ?? ""}`.toLowerCase();
  return authError?.status === 401 || /session|jwt|expired|not.*authenticated|auth.*missing|invalid.*token/.test(value);
};

const getPasswordErrorMessage = (error: unknown) => {
  const authError = error as { message?: string; code?: string; status?: number; weak_password?: { reasons?: string[] } };
  const raw = authError?.message ?? "";
  const code = authError?.code ?? "";
  const reasons = authError?.weak_password?.reasons?.join(" ") ?? "";
  const value = `${raw} ${code} ${reasons}`.toLowerCase();

  if (/same|different|misma|distinta/.test(value)) {
    return "La nueva contraseña debe ser distinta de la actual.";
  }

  if (/pwned|leaked|compromised|breach|breached|data breach|filtraci|exposed|expuesta|vulnerada/.test(value)) {
    return "Esa contraseña aparece en filtraciones conocidas. Usa otra más segura, con mayúsculas, minúsculas, números y algún símbolo.";
  }

  if (/weak|password|contraseña|character|caracter|minimum|mínimo|least|lower|upper|digit|number|symbol|security/.test(value)) {
    return "La contraseña no cumple los requisitos de seguridad. Usa mínimo 8 caracteres, con mayúsculas, minúsculas, números y algún símbolo.";
  }

  if (isAuthSessionError(error)) {
    return "Tu sesión ha caducado. Cierra sesión, vuelve a entrar y cambia la contraseña de nuevo.";
  }

  return raw || "No se pudo cambiar la contraseña. Prueba con una contraseña más segura: mínimo 8 caracteres, mayúsculas, minúsculas, números y símbolo.";
};

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function ChangePasswordDialog({ open, onClose, userId }: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRemindLater = async () => {
    try {
      // Marcar como que ya se mostró el diálogo para no volver a mostrarlo
      await supabase
        .from("profiles")
        .update({ password_changed: true })
        .eq("id", userId);
      
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      onClose();
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !sessionData.session) {
        toast({
          title: "Sesión caducada",
          description: "Cierra sesión, vuelve a entrar y cambia la contraseña de nuevo.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update password
      let { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError && isAuthSessionError(passwordError)) {
        const { data: retrySession } = await supabase.auth.refreshSession();
        if (retrySession.session) {
          const retryResult = await supabase.auth.updateUser({
            password: newPassword,
          });
          passwordError = retryResult.error;
        }
      }

      if (passwordError) throw passwordError;

      // Mark password as changed
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ password_changed: true })
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "¡Contraseña actualizada!",
        description: "Tu contraseña ha sido cambiada exitosamente",
      });

      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: getPasswordErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-amber-500/10 p-3 rounded-full">
              <Lock className="h-6 w-6 text-amber-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg sm:text-xl">
            Recomendación de seguridad
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Te recomendamos cambiar tu contraseña temporal por una más segura para proteger tu cuenta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm">Nueva contraseña</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm">Confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleRemindLater}
              variant="outline"
              className="flex-1 text-sm"
              disabled={loading}
            >
              Recordar más tarde
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={loading || !newPassword || !confirmPassword}
              className="flex-1 text-sm"
            >
              {loading ? "Cambiando..." : "Cambiar ahora"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
