import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Calendar, Weight, Ruler, Cake, UserCog, Trash2, Ban, CheckCircle, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  full_name: string | null;
  apellidos: string | null;
  avatar_url: string | null;
  fecha_nacimiento: string | null;
  peso: number | null;
  estatura: number | null;
  created_at: string;
  role: string;
  blocked: boolean;
  email: string | null;
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [updatingRole, setUpdatingRole] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para ver esta página",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate, toast]);

  useEffect(() => {
    const fetchUserDetail = async () => {
      if (!isAdmin || !id) return;

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (profileError) {
        toast({
          title: "Error",
          description: "No se pudo cargar la información del usuario",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", id)
        .single();

      setUser({
        ...profileData,
        role: roleData?.role || "standard",
      });
      setNewEmail(profileData.email || "");
      setLoading(false);
    };

    if (isAdmin) {
      fetchUserDetail();
    }
  }, [isAdmin, id, toast]);

  const handleRoleChange = async (newRole: string) => {
    if (!id || !user) return;

    setUpdatingRole(true);
    
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as "admin" | "vip" | "standard" })
      .eq("user_id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol del usuario",
        variant: "destructive",
      });
    } else {
      setUser({ ...user, role: newRole });
      toast({
        title: "Rol actualizado",
        description: `El usuario ahora es ${newRole}`,
      });
    }

    setUpdatingRole(false);
  };

  const handleBlockToggle = async () => {
    if (!id || !user) return;

    setUpdatingStatus(true);
    const newBlockedStatus = !user.blocked;

    const { error } = await supabase
      .from("profiles")
      .update({ blocked: newBlockedStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del usuario",
        variant: "destructive",
      });
    } else {
      setUser({ ...user, blocked: newBlockedStatus });
      toast({
        title: newBlockedStatus ? "Usuario bloqueado" : "Usuario desbloqueado",
        description: newBlockedStatus 
          ? "El usuario no podrá acceder a ninguna funcionalidad" 
          : "El usuario puede acceder nuevamente",
      });
    }

    setUpdatingStatus(false);
  };

  const handleDeleteUser = async () => {
    if (!id) return;

    setDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ userId: id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al eliminar usuario");
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente",
      });

      navigate("/users");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!id || !user || !newEmail) return;

    setEditingEmail(false);

    // Update email in profiles table for reference
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ email: newEmail })
      .eq("id", id);

    if (profileError) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el email",
        variant: "destructive",
      });
      return;
    }

    setUser({ ...user, email: newEmail });
    toast({
      title: "Email actualizado",
      description: "El email se ha actualizado en el perfil. Nota: El usuario deberá usar su email anterior para iniciar sesión hasta que actualice su email de autenticación.",
    });
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin || !user) {
    return null;
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/users")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a usuarios
        </Button>
        
        {user && (
          <div className="flex gap-2">
            <Button
              variant={user.blocked ? "default" : "destructive"}
              onClick={handleBlockToggle}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : user.blocked ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Desbloquear
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Bloquear
                </>
              )}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario
                    y todos sus datos asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteUser}>
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Avatar and Basic Info */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 mx-auto mb-4">
              {user.avatar_url && <AvatarImage src={user.avatar_url} />}
              <AvatarFallback className="text-2xl sm:text-4xl">
                {user.full_name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl sm:text-2xl">
              {user.full_name || "Sin nombre"} {user.apellidos || ""}
            </CardTitle>
            <CardDescription className="space-y-2">
              <div className="flex gap-2 items-center justify-center mt-2">
                <Badge
                  variant={user.role === "admin" ? "default" : user.role === "vip" ? "secondary" : "outline"}
                >
                  {user.role}
                </Badge>
                {user.blocked && (
                  <Badge variant="destructive">
                    Bloqueado
                  </Badge>
                )}
              </div>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Detailed Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Información del Usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {/* Email */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
              <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">Email</p>
                {editingEmail ? (
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleEmailUpdate}>
                      Guardar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setEditingEmail(false);
                        setNewEmail(user.email || "");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm sm:text-base break-all">{user.email || "Sin email"}</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditingEmail(true)}
                    >
                      Editar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Role Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg bg-accent/50">
                <UserCog className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 w-full">
                  <p className="text-sm text-muted-foreground mb-2">Tipo de Cliente</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      value={user.role}
                      onValueChange={handleRoleChange}
                      disabled={updatingRole}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Estándar (sin acceso a clases)</SelectItem>
                        <SelectItem value="vip">VIP (12 clases/mes)</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
              <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                <p className="font-medium text-sm sm:text-base break-words">
                  {new Date(user.created_at).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            {user.fecha_nacimiento && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <Cake className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
                  <p className="font-medium text-sm sm:text-base">
                    {new Date(user.fecha_nacimiento).toLocaleDateString("es-ES")}
                  </p>
                </div>
              </div>
            )}

            {user.peso && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <Weight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Peso</p>
                  <p className="font-medium text-sm sm:text-base">{user.peso} kg</p>
                </div>
              </div>
            )}

            {user.estatura && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <Ruler className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Estatura</p>
                  <p className="font-medium text-sm sm:text-base">{user.estatura} cm</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
