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
import { ArrowLeft, Loader2, Calendar, Weight, Ruler, Cake, UserCog } from "lucide-react";

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
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [updatingRole, setUpdatingRole] = useState(false);

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
      <Button
        variant="ghost"
        onClick={() => navigate("/users")}
        className="mb-4 sm:mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a usuarios
      </Button>

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
            <CardDescription>
              <Badge
                variant={user.role === "admin" ? "default" : user.role === "vip" ? "secondary" : "outline"}
                className="mt-2"
              >
                {user.role}
              </Badge>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Detailed Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Información del Usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {/* Role Selector - Only for non-admin users */}
            {user.role !== "admin" && (
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
            )}
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
