import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Lock, Download, AlertCircle } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBlockedStatus } from "@/hooks/useBlockedStatus";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    apellidos: "",
    fecha_nacimiento: "",
    peso: "",
    estatura: "",
    avatar_url: "",
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [userId, setUserId] = useState<string>("");
  const { isBlocked, loading: blockLoading } = useBlockedStatus();
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      loadProfile();
    };
    checkAuth();
  }, [navigate]);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

      if (error) throw error;

      if (data) {
        const profileData = data as any;
        setProfile({
          full_name: profileData.full_name || "",
          apellidos: profileData.apellidos || "",
          fecha_nacimiento: profileData.fecha_nacimiento || "",
          peso: profileData.peso?.toString() || "",
          estatura: profileData.estatura?.toString() || "",
          avatar_url: profileData.avatar_url || "",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById("user-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-acceso-${profile.full_name || "usuario"}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          apellidos: profile.apellidos,
          fecha_nacimiento: profile.fecha_nacimiento || null,
          peso: profile.peso ? parseFloat(profile.peso) : null,
          estatura: profile.estatura ? parseFloat(profile.estatura) : null,
          avatar_url: profile.avatar_url,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Tus datos se han guardado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Add timestamp to force browser to reload the image
      const avatarUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      setProfile({ ...profile, avatar_url: avatarUrlWithTimestamp });

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrlWithTimestamp })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Avatar actualizado",
        description: "Tu foto de perfil se ha guardado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir la imagen",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordSchema = z
      .object({
        newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
        confirmPassword: z.string(),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
      });

    try {
      passwordSchema.parse(passwordData);
      setChangingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña se ha cambiado correctamente",
      });

      setPasswordData({ newPassword: "", confirmPassword: "" });
      setShowPasswordChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo cambiar la contraseña",
          variant: "destructive",
        });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-4 md:py-8 px-4">
      {/* Card para el QR de acceso - PRIMERO */}
      <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
        <CardHeader className="text-center">
          <CardTitle className="font-bebas text-3xl md:text-4xl tracking-wider bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">
            MI CÓDIGO QR
          </CardTitle>
          <CardDescription className="text-base">Tu código de acceso al gimnasio</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {isBlocked ? (
            <Alert variant="destructive" className="w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tu cuenta está bloqueada. No puedes acceder al gimnasio ni usar el código QR hasta que un administrador la desbloquee.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg">
                <QRCodeSVG id="user-qr-code" value={userId} size={180} level="H" includeMargin={true} />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-md px-4">
                Presenta este código QR al entrar al gimnasio para registrar tu acceso
              </p>
              <Button onClick={downloadQR} variant="outline" className="w-full md:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Descargar QR
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card de perfil */}
      <Card className="mt-6 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
        <CardHeader className="text-center">
          <CardTitle className="font-bebas text-4xl md:text-5xl tracking-wider bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">
            MI PERFIL
          </CardTitle>
          <CardDescription className="text-base">Tus datos personales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center">
            <UserAvatar avatarUrl={profile.avatar_url} fullName={profile.full_name} size="lg" />
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-4"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Cambiar foto
                </>
              )}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input
                  id="apellidos"
                  value={profile.apellidos}
                  onChange={(e) => setProfile({ ...profile, apellidos: e.target.value })}
                  placeholder="Tus apellidos"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
              <Input
                id="fecha_nacimiento"
                type="date"
                value={profile.fecha_nacimiento}
                onChange={(e) => setProfile({ ...profile, fecha_nacimiento: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="peso">Peso (kg)</Label>
                <Input
                  id="peso"
                  type="number"
                  step="0.1"
                  value={profile.peso}
                  onChange={(e) => setProfile({ ...profile, peso: e.target.value })}
                  placeholder="70.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estatura">Estatura (cm)</Label>
                <Input
                  id="estatura"
                  type="number"
                  step="0.1"
                  value={profile.estatura}
                  onChange={(e) => setProfile({ ...profile, estatura: e.target.value })}
                  placeholder="175"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </form>

          {/* Botón para mostrar cambio de contraseña */}
          <div className="pt-4 border-t">
            {!showPasswordChange ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowPasswordChange(true)}
              >
                <Lock className="mr-2 h-4 w-4" />
                Cambiar contraseña
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Cambiar contraseña</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordData({ newPassword: "", confirmPassword: "" });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva contraseña</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="••••••••"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      minLength={6}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                    disabled={changingPassword}
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cambiando...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Confirmar cambio
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
