import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { RegisterUserDialog } from "@/components/RegisterUserDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface UserWithRole {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string;
  blocked: boolean;
}

export default function Users() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

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
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        avatar_url,
        created_at,
        blocked
      `)
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const usersWithRoles = profilesData?.map((profile) => {
      const roleRecord = rolesData?.find((r) => r.user_id === profile.id);
      return {
        ...profile,
        role: roleRecord?.role || "basica",
      };
    }) || [];

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const handleUserCreated = () => {
    fetchUsers();
  };

  // Filter users by search query
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group users by month
  const groupedByMonth = filteredUsers.reduce((acc, user) => {
    const date = new Date(user.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        users: []
      };
    }
    acc[monthKey].users.push(user);
    return acc;
  }, {} as Record<string, { name: string; users: UserWithRole[] }>);

  const sortedMonths = Object.entries(groupedByMonth).sort(([a], [b]) => b.localeCompare(a));

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
          <CardTitle className="text-xl sm:text-2xl">Usuarios Registrados</CardTitle>
          <RegisterUserDialog onUserCreated={handleUserCreated} />
        </CardHeader>
        <CardContent>
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-4">
            {sortedMonths.map(([monthKey, { name, users: monthUsers }]) => (
              <Collapsible key={monthKey} defaultOpen={true}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{name}</h3>
                    <Badge variant="outline">{monthUsers.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto mt-2">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Usuario</th>
                          <th className="text-left py-3 px-4">Rol</th>
                          <th className="text-left py-3 px-4">Fecha de registro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthUsers.map((user) => (
                          <tr
                            key={user.id}
                            onClick={() => navigate(`/users/${user.id}`)}
                            className={`border-b cursor-pointer transition-colors ${
                              user.blocked 
                                ? "bg-destructive/10 hover:bg-destructive/20 border-destructive/30" 
                                : "hover:bg-accent/50"
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {user.full_name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.full_name || "Sin nombre"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Badge
                                  variant={user.role === "admin" ? "default" : "secondary"}
                                  className={
                                    user.role === "full" 
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30" 
                                      : user.role === "basica_clases"
                                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/30"
                                      : user.role === "basica"
                                      ? "bg-muted/50 text-muted-foreground border-muted"
                                      : ""
                                  }
                                >
                                  {user.role === "admin" 
                                    ? "Administrador" 
                                    : user.role === "full"
                                    ? "Full"
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
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3 mt-2">
                    {monthUsers.map((user) => (
                      <Card
                        key={user.id}
                        onClick={() => navigate(`/users/${user.id}`)}
                        className={`cursor-pointer transition-colors ${
                          user.blocked 
                            ? "bg-destructive/10 hover:bg-destructive/20 border-destructive/30" 
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>
                                {user.full_name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{user.full_name || "Sin nombre"}</h4>
                              <p className="text-xs text-muted-foreground">
                                {new Date(user.created_at).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant={user.role === "admin" ? "default" : "secondary"}
                              className={
                                user.role === "full" 
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-xs" 
                                  : user.role === "basica_clases"
                                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs"
                                  : user.role === "basica"
                                  ? "bg-muted/50 text-muted-foreground border-muted text-xs"
                                  : "text-xs"
                              }
                            >
                              {user.role === "admin" 
                                ? "Administrador" 
                                : user.role === "full"
                                ? "Full"
                                : user.role === "basica_clases"
                                ? "Básica Clases"
                                : "Básica"}
                            </Badge>
                            {user.blocked && (
                              <Badge variant="destructive" className="text-xs">
                                Bloqueado
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron usuarios
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
