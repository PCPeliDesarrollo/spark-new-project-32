import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Ban, CheckCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  blocked: boolean;
  role: string;
  paidMonths: Set<number>; // months (1-12) paid in the selected year
}

// Grace period: users must pay between day 1 and day 5 of the month
const GRACE_DAY = 5;

const ManagePayments = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingCell, setTogglingCell] = useState<string | null>(null);
  const [togglingBlock, setTogglingBlock] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      loadPaymentData();
    }
  }, [isAdmin, roleLoading, navigate, year]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, blocked")
        .order("full_name");
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;

      const { data: payments, error: paymentsError } = await supabase
        .from("monthly_payments" as any)
        .select("user_id, month, paid")
        .eq("year", year);
      if (paymentsError) throw paymentsError;

      const paidMap = new Map<string, Set<number>>();
      ((payments as any[]) || []).forEach((p) => {
        if (!p.paid) return;
        if (!paidMap.has(p.user_id)) paidMap.set(p.user_id, new Set());
        paidMap.get(p.user_id)!.add(p.month);
      });

      const usersData: UserRow[] = (profiles || []).map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name || "Sin nombre",
          email: profile.email || "Sin email",
          blocked: profile.blocked,
          role: userRole?.role || "basica",
          paidMonths: paidMap.get(profile.id) || new Set(),
        };
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

  const togglePaid = async (userId: string, month: number, currentlyPaid: boolean) => {
    const cellKey = `${userId}-${month}`;
    try {
      setTogglingCell(cellKey);
      if (currentlyPaid) {
        const { error } = await supabase
          .from("monthly_payments" as any)
          .delete()
          .eq("user_id", userId)
          .eq("year", year)
          .eq("month", month);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("monthly_payments" as any)
          .upsert(
            { user_id: userId, year, month, paid: true, paid_at: new Date().toISOString() },
            { onConflict: "user_id,year,month" }
          );
        if (error) throw error;
      }

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          const next = new Set(u.paidMonths);
          if (currentlyPaid) next.delete(month);
          else next.add(month);
          return { ...u, paidMonths: next };
        })
      );
    } catch (error) {
      console.error("Error toggling payment:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el pago",
        variant: "destructive",
      });
    } finally {
      setTogglingCell(null);
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

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, blocked: newBlockedStatus } : u)));
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

  // Determine the current "due" month for the selected year.
  // If viewing current year: due month is the current calendar month once we pass day 5.
  // Before day 5, users are still within grace period, so the "pending" month is the previous month only if unpaid.
  const getPendingUsersCount = () => {
    const today = new Date();
    if (year !== today.getFullYear()) return 0;
    const currentMonth = today.getMonth() + 1; // 1-12
    const day = today.getDate();
    // The month we require paid: current month if past grace day, otherwise no new requirement yet
    const requiredMonth = day > GRACE_DAY ? currentMonth : null;
    if (!requiredMonth) return 0;
    return users.filter((u) => !u.paidMonths.has(requiredMonth) && !u.blocked).length;
  };

  const getUserStatus = (user: UserRow): "blocked" | "pending" | "ok" => {
    if (user.blocked) return "blocked";
    const today = new Date();
    if (year !== today.getFullYear()) return "ok";
    const currentMonth = today.getMonth() + 1;
    const day = today.getDate();
    if (day > GRACE_DAY && !user.paidMonths.has(currentMonth)) return "pending";
    return "ok";
  };

  const getStatusBadge = (user: UserRow) => {
    const s = getUserStatus(user);
    if (s === "blocked") return <Badge variant="destructive">Bloqueado</Badge>;
    if (s === "pending")
      return <Badge variant="destructive">Pendiente de pago</Badge>;
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
        Al día
      </Badge>
    );
  };

  const filteredUsers = users.filter((user) => {
    const s = searchTerm.toLowerCase();
    return user.full_name.toLowerCase().includes(s) || user.email.toLowerCase().includes(s);
  });

  const currentMonthIdx = new Date().getMonth(); // 0-11
  const isCurrentYear = year === new Date().getFullYear();

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = getPendingUsersCount();
  const blockedCount = users.filter((u) => u.blocked).length;
  const okCount = users.filter((u) => getUserStatus(u) === "ok").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gestión de Pagos</h1>
        <p className="text-muted-foreground mt-2">
          Marca con un check los meses que cada usuario ha pagado. La fecha límite es del día 1 al 5 de cada mes.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[80px] text-center font-semibold text-lg">{year}</div>
          <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">Pendiente de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bloqueados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{blockedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Al día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{okCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meses pagados - {year}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 sticky left-0 bg-card z-10 min-w-[180px]">Usuario</th>
                  {MONTHS.map((m, i) => (
                    <th
                      key={m}
                      className={`text-center p-2 font-medium ${
                        isCurrentYear && i === currentMonthIdx ? "text-primary" : ""
                      }`}
                    >
                      {m}
                    </th>
                  ))}
                  <th className="text-center p-2">Estado</th>
                  <th className="text-center p-2">Acceso</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="text-center text-muted-foreground py-8">
                      {searchTerm ? "No se encontraron usuarios" : "No hay usuarios registrados"}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 sticky left-0 bg-card z-10">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {user.email}
                        </div>
                      </td>
                      {MONTHS.map((_, i) => {
                        const month = i + 1;
                        const paid = user.paidMonths.has(month);
                        const cellKey = `${user.id}-${month}`;
                        const isCurrent = isCurrentYear && i === currentMonthIdx;
                        return (
                          <td key={month} className="p-1 text-center">
                            <button
                              onClick={() => togglePaid(user.id, month, paid)}
                              disabled={togglingCell === cellKey}
                              className={`w-9 h-9 rounded-md border-2 flex items-center justify-center mx-auto transition-colors ${
                                paid
                                  ? "bg-green-500 border-green-600 text-white hover:bg-green-600"
                                  : isCurrent
                                  ? "bg-yellow-100 border-yellow-400 hover:bg-yellow-200"
                                  : "bg-transparent border-muted-foreground/30 hover:bg-muted"
                              }`}
                              title={paid ? "Marcado como pagado" : "Marcar como pagado"}
                            >
                              {togglingCell === cellKey ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : paid ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : null}
                            </button>
                          </td>
                        );
                      })}
                      <td className="p-2 text-center">{getStatusBadge(user)}</td>
                      <td className="p-2 text-center">
                        <Button
                          size="sm"
                          variant={user.blocked ? "default" : "destructive"}
                          onClick={() => handleBlockToggle(user.id, user.blocked)}
                          disabled={togglingBlock === user.id}
                          className="gap-1"
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagePayments;

// Legacy code below removed
const _unused = () => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "blocked":
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return null;
    }
  };
  return null;
};

// eslint-disable-next-line
const _legacyJsx = () => (
    <div>
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gestión de Pagos</h1>
      </div>
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
