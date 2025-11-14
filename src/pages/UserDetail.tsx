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
import { ArrowLeft, Loader2, Calendar as CalendarIcon, Weight, Ruler, Cake, UserCog, Trash2, Mail, User, Phone, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { startOfMonth, endOfMonth, isBefore, parseISO, format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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
  telefono: string | null;
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [updatingRole, setUpdatingRole] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingApellidos, setEditingApellidos] = useState(false);
  const [newApellidos, setNewApellidos] = useState("");
  const [editingTelefono, setEditingTelefono] = useState(false);
  const [newTelefono, setNewTelefono] = useState("");
  const [editingCreatedAt, setEditingCreatedAt] = useState(false);
  const [newCreatedAt, setNewCreatedAt] = useState<Date>();
  const [monthlyBookings, setMonthlyBookings] = useState<{used: number, booked: number, available: number}>({ used: 0, booked: 0, available: 0 });

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
        role: roleData?.role || "basica",
      });
      setNewEmail(profileData.email || "");
      setNewName(profileData.full_name || "");
      setNewApellidos(profileData.apellidos || "");
      setNewTelefono(profileData.telefono || "");
      setNewCreatedAt(new Date(profileData.created_at));
      setLoading(false);
    };

    if (isAdmin) {
      fetchUserDetail();
    }
  }, [isAdmin, id, toast]);

  useEffect(() => {
    const loadUserBookings = async () => {
      if (!user || !id) return;
      
      const role = user.role;
      if (role !== "basica_clases" && role !== "full") return;

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const { data: bookingsData } = await supabase
        .from("class_bookings")
        .select(`
          id,
          status,
          class_date,
          schedule_id,
          class_schedules (
            start_time,
            day_of_week
          )
        `)
        .eq("user_id", id)
        .eq("status", "confirmed")
        .gte("class_date", monthStart.toISOString().split('T')[0])
        .lte("class_date", monthEnd.toISOString().split('T')[0]);

      if (bookingsData) {
        let used = 0;
        let booked = 0;

        bookingsData.forEach((booking: any) => {
          const classDateTime = parseISO(`${booking.class_date}T${booking.class_schedules.start_time}`);
          if (isBefore(classDateTime, now)) {
            used++;
          } else {
            booked++;
          }
        });

        const available = 12 - used - booked;
        setMonthlyBookings({ used, booked, available });
      }
    };

    loadUserBookings();
  }, [user, id]);

  const handleRoleChange = async (newRole: string) => {
    if (!id || !user) return;

    setUpdatingRole(true);
    
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as "admin" | "basica" | "basica_clases" | "full" })
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
      description: "El email se ha actualizado en el perfil.",
    });
  };

  const handleNameUpdate = async () => {
    if (!id || !user) return;

    setEditingName(false);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: newName })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el nombre",
        variant: "destructive",
      });
      return;
    }

    setUser({ ...user, full_name: newName });
    toast({
      title: "Nombre actualizado",
      description: "El nombre se ha actualizado correctamente.",
    });
  };

  const handleApellidosUpdate = async () => {
    if (!id || !user) return;

    setEditingApellidos(false);

    const { error } = await supabase
      .from("profiles")
      .update({ apellidos: newApellidos })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los apellidos",
        variant: "destructive",
      });
      return;
    }

    setUser({ ...user, apellidos: newApellidos });
    toast({
      title: "Apellidos actualizados",
      description: "Los apellidos se han actualizado correctamente.",
    });
  };

  const handleTelefonoUpdate = async () => {
    if (!id || !user) return;

    setEditingTelefono(false);

    const { error } = await supabase
      .from("profiles")
      .update({ telefono: newTelefono })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el teléfono",
        variant: "destructive",
      });
      return;
    }

    setUser({ ...user, telefono: newTelefono });
    toast({
      title: "Teléfono actualizado",
      description: "El teléfono se ha actualizado correctamente.",
    });
  };

  const handleCreatedAtUpdate = async () => {
    if (!id || !user || !newCreatedAt) return;

    setEditingCreatedAt(false);

    const { error } = await supabase
      .from("profiles")
      .update({ created_at: newCreatedAt.toISOString() })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha de inscripción",
        variant: "destructive",
      });
      return;
    }

    setUser({ ...user, created_at: newCreatedAt.toISOString() });
    toast({
      title: "Fecha actualizada",
      description: "La fecha de inscripción se ha actualizado correctamente.",
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/users")}
          className="self-start"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="text-sm">Volver a usuarios</span>
        </Button>
        
        {user && (
          <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting} className="w-full xs:w-auto text-sm">
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
              <AlertDialogContent className="w-[95vw] max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg">¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm">
                    Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario
                    y todos sus datos asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto m-0">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteUser} className="w-full sm:w-auto">
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                  variant={
                    user.role === "admin" 
                      ? "default" 
                      : user.role === "full" || user.role === "basica_clases"
                      ? "secondary" 
                      : "outline"
                  }
                >
                  {user.role === "admin" 
                    ? "Administrador" 
                    : user.role === "full"
                    ? "Full (Basica+clases ilimitadas)"
                    : user.role === "basica_clases"
                    ? "Básica Clases"
                    : "Básica"}
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
            {/* Nombre */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
              <User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">Nombre</p>
                {editingName ? (
                  <div className="flex flex-col xs:flex-row gap-2">
                    <Input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleNameUpdate} className="flex-1 xs:flex-none text-xs">
                        Guardar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setEditingName(false);
                          setNewName(user.full_name || "");
                        }}
                        className="flex-1 xs:flex-none text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col xs:flex-row xs:items-center gap-2">
                    <p className="font-medium text-sm sm:text-base break-all flex-1">{user.full_name || "Sin nombre"}</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditingName(true)}
                      className="self-start xs:self-auto text-xs"
                    >
                      Editar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Apellidos */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
              <User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">Apellidos</p>
                {editingApellidos ? (
                  <div className="flex flex-col xs:flex-row gap-2">
                    <Input
                      type="text"
                      value={newApellidos}
                      onChange={(e) => setNewApellidos(e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleApellidosUpdate} className="flex-1 xs:flex-none text-xs">
                        Guardar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setEditingApellidos(false);
                          setNewApellidos(user.apellidos || "");
                        }}
                        className="flex-1 xs:flex-none text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col xs:flex-row xs:items-center gap-2">
                    <p className="font-medium text-sm sm:text-base break-all flex-1">{user.apellidos || "Sin apellidos"}</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditingApellidos(true)}
                      className="self-start xs:self-auto text-xs"
                    >
                      Editar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
              <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">Email</p>
                {editingEmail ? (
                  <div className="flex flex-col xs:flex-row gap-2">
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleEmailUpdate} className="flex-1 xs:flex-none text-xs">
                        Guardar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setEditingEmail(false);
                          setNewEmail(user.email || "");
                        }}
                        className="flex-1 xs:flex-none text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col xs:flex-row xs:items-center gap-2">
                    <p className="font-medium text-sm sm:text-base break-all flex-1">{user.email || "Sin email"}</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditingEmail(true)}
                      className="self-start xs:self-auto text-xs"
                    >
                      Editar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Teléfono */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
              <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">Teléfono</p>
                {editingTelefono ? (
                  <div className="flex flex-col xs:flex-row gap-2">
                    <Input
                      type="tel"
                      value={newTelefono}
                      onChange={(e) => setNewTelefono(e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleTelefonoUpdate} className="flex-1 xs:flex-none text-xs">
                        Guardar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setEditingTelefono(false);
                          setNewTelefono(user.telefono || "");
                        }}
                        className="flex-1 xs:flex-none text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col xs:flex-row xs:items-center gap-2">
                    <p className="font-medium text-sm sm:text-base break-all flex-1">{user.telefono || "Sin teléfono"}</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditingTelefono(true)}
                      className="self-start xs:self-auto text-xs"
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
                        <SelectItem value="basica">Básica (solo máquinas)</SelectItem>
                        <SelectItem value="basica_clases">Básica Clases (12 clases/mes)</SelectItem>
                        <SelectItem value="full">Full (Basica+clases ilimitadas)</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

            {/* Clases mensuales indicator */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
              <GraduationCap className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">Clases mensuales</p>
                {user.role === "basica" ? (
                  <p className="text-sm text-muted-foreground italic">
                    Este usuario no tiene suscripción a clases
                  </p>
                ) : user.role === "admin" ? (
                  <p className="text-sm text-muted-foreground italic">
                    Sin límite (Admin)
                  </p>
                ) : (user.role === "basica_clases" || user.role === "full") ? (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {Array.from({ length: 12 }).map((_, index) => {
                        let colorClass = "bg-green-500";
                        if (index < monthlyBookings.used) {
                          colorClass = "bg-red-500";
                        } else if (index < monthlyBookings.used + monthlyBookings.booked) {
                          colorClass = "bg-yellow-500";
                        }
                        return (
                          <div
                            key={index}
                            className={`h-6 flex-1 rounded ${colorClass}`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-500" />
                        <span>Usadas: {monthlyBookings.used}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-yellow-500" />
                        <span>Reservadas: {monthlyBookings.booked}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500" />
                        <span>Disponibles: {monthlyBookings.available}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
              <CalendarIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-2">Fecha de Inscripción</p>
                {editingCreatedAt ? (
                  <div className="flex flex-col gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newCreatedAt && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newCreatedAt ? format(newCreatedAt, "PPP") : <span>Seleccionar fecha</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newCreatedAt}
                          onSelect={setNewCreatedAt}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreatedAtUpdate} className="flex-1 xs:flex-none text-xs">
                        Guardar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setEditingCreatedAt(false);
                          setNewCreatedAt(new Date(user.created_at));
                        }}
                        className="flex-1 xs:flex-none text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col xs:flex-row xs:items-center gap-2">
                    <p className="font-medium text-sm sm:text-base break-words flex-1">
                      {new Date(user.created_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditingCreatedAt(true)}
                      className="self-start xs:self-auto text-xs"
                    >
                      Editar
                    </Button>
                  </div>
                )}
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
