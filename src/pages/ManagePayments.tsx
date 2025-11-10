import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, CreditCard, Ban, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserPaymentInfo {
  id: string;
  full_name: string;
  email: string;
  blocked: boolean;
  role: string;
  last_payment_date: string | null;
  next_payment_date: string | null;
  days_until_due: number;
  status: "ok" | "upcoming" | "overdue" | "blocked";
}

const ManagePayments = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserPaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [togglingBlock, setTogglingBlock] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
      return;
    }

    if (isAdmin) {
      loadPaymentData();
    }
  }, [isAdmin, roleLoading, navigate]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);

      // Get all users with profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, blocked")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Get user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get renewal data
      const { data: renewals, error: renewalsError } = await supabase
        .from("subscription_renewals")
        .select("user_id, last_payment_date, next_payment_date");

      if (renewalsError) throw renewalsError;

      // Combine data
      const today = new Date();
      const usersData: UserPaymentInfo[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        const renewal = renewals.find((r) => r.user_id === profile.id);

        let status: "ok" | "upcoming" | "overdue" | "blocked" = "ok";
        let daysUntilDue = 0;

        if (profile.blocked) {
          status = "blocked";
        } else if (renewal?.next_payment_date) {
          const nextDate = new Date(renewal.next_payment_date);
          const diffTime = nextDate.getTime() - today.getTime();
          daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (daysUntilDue < 0) {
            status = "overdue";
          } else if (daysUntilDue <= 3) {
            status = "upcoming";
          }
        }

        return {
          id: profile.id,
          full_name: profile.full_name || "Sin nombre",
          email: profile.email || "Sin email",
          blocked: profile.blocked,
          role: userRole?.role || "basica",
          last_payment_date: renewal?.last_payment_date || null,
          next_payment_date: renewal?.next_payment_date || null,
          days_until_due: daysUntilDue,
          status,
        };
      });

      // Sort by status priority (overdue > blocked > upcoming > ok)
      usersData.sort((a, b) => {
        const statusPriority = { overdue: 0, blocked: 1, upcoming: 2, ok: 3 };
        return statusPriority[a.status] - statusPriority[b.status];
      });

      setUsers(usersData);
    } catch (error) {
      console.error("Error loading payment data:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de pagos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (userId: string) => {
    try {
      setProcessingPayment(userId);

      const { data, error } = await supabase.functions.invoke("process-manual-payment", {
        body: { userId },
      });

      if (error) throw error;

      toast({
        title: "Pago registrado",
        description: data.message || "El pago se ha registrado correctamente",
      });

      // Reload data
      await loadPaymentData();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleBlockToggle = async (userId: string, currentBlockedStatus: boolean) => {
    try {
      setTogglingBlock(userId);
      const newBlockedStatus = !currentBlockedStatus;

      const { error } = await supabase
        .from("profiles")
        .update({ blocked: newBlockedStatus })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: newBlockedStatus ? "Usuario bloqueado" : "Usuario desbloqueado",
        description: newBlockedStatus 
          ? "El usuario no podrá acceder a ninguna funcionalidad" 
          : "El usuario puede acceder nuevamente",
      });

      // Reload data
      await loadPaymentData();
    } catch (error) {
      console.error("Error toggling block status:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del usuario",
        variant: "destructive",
      });
    } finally {
      setTogglingBlock(null);
    }
  };

  const getStatusBadge = (status: UserPaymentInfo["status"]) => {
    switch (status) {
      case "blocked":
        return <Badge variant="destructive">Bloqueado</Badge>;
      case "overdue":
        return <Badge variant="destructive">Vencido</Badge>;
      case "upcoming":
        return <Badge variant="default" className="bg-yellow-500">Próximo</Badge>;
      default:
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Al día</Badge>;
    }
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gestión de Pagos</h1>
        <p className="text-muted-foreground mt-2">
          Registra pagos mensuales y gestiona suscripciones
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {users.filter((u) => u.status === "overdue").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Próximos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {users.filter((u) => u.status === "upcoming").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Al día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users.filter((u) => u.status === "ok").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            Usuarios ordenados por prioridad de pago
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Desktop view */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Último Pago</TableHead>
                  <TableHead>Próximo Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {searchTerm ? "No se encontraron usuarios" : "No hay usuarios registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        {user.last_payment_date
                          ? new Date(user.last_payment_date).toLocaleDateString("es-ES")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {user.next_payment_date ? (
                          <div>
                            <div>{new Date(user.next_payment_date).toLocaleDateString("es-ES")}</div>
                            {user.days_until_due < 0 && (
                              <div className="text-xs text-destructive">
                                Vencido hace {Math.abs(user.days_until_due)} días
                              </div>
                            )}
                            {user.days_until_due > 0 && user.days_until_due <= 3 && (
                              <div className="text-xs text-yellow-600">
                                En {user.days_until_due} días
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant={user.blocked ? "default" : "destructive"}
                            onClick={() => handleBlockToggle(user.id, user.blocked)}
                            disabled={togglingBlock === user.id}
                            className="gap-2"
                          >
                            {togglingBlock === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : user.blocked ? (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Desbloquear
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4" />
                                Bloquear
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleProcessPayment(user.id)}
                            disabled={processingPayment === user.id}
                            className="gap-2"
                          >
                            {processingPayment === user.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4" />
                                Registrar Pago
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile view */}
          <div className="md:hidden space-y-4 p-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {searchTerm ? "No se encontraron usuarios" : "No hay usuarios registrados"}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      {getStatusBadge(user.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Último Pago</div>
                        <div className="font-medium">
                          {user.last_payment_date
                            ? new Date(user.last_payment_date).toLocaleDateString("es-ES")
                            : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Próximo Pago</div>
                        <div className="font-medium">
                          {user.next_payment_date ? (
                            <>
                              <div>{new Date(user.next_payment_date).toLocaleDateString("es-ES")}</div>
                              {user.days_until_due < 0 && (
                                <div className="text-xs text-destructive">
                                  Vencido {Math.abs(user.days_until_due)}d
                                </div>
                              )}
                              {user.days_until_due > 0 && user.days_until_due <= 3 && (
                                <div className="text-xs text-yellow-600">
                                  En {user.days_until_due}d
                                </div>
                              )}
                            </>
                          ) : (
                            "-"
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={user.blocked ? "default" : "destructive"}
                        onClick={() => handleBlockToggle(user.id, user.blocked)}
                        disabled={togglingBlock === user.id}
                        className="flex-1 gap-2"
                      >
                        {togglingBlock === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : user.blocked ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Desbloquear
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4" />
                            Bloquear
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleProcessPayment(user.id)}
                        disabled={processingPayment === user.id}
                        className="flex-1 gap-2"
                      >
                        {processingPayment === user.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            Pagar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagePayments;
