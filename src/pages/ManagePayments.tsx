import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, CreditCard } from "lucide-react";
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
        <CardContent>
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
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagePayments;
