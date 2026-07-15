import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const GRACE_DAY = 5;

const MyPayments = () => {
  const [loading, setLoading] = useState(true);
  const [paidMonths, setPaidMonths] = useState<Map<number, string>>(new Map());
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    load();
  }, [year]);

  const load = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: payments }, { data: profile }] = await Promise.all([
        supabase
          .from("monthly_payments" as any)
          .select("month, paid, paid_at")
          .eq("user_id", user.id)
          .eq("year", year),
        supabase.from("profiles").select("blocked").eq("id", user.id).maybeSingle(),
      ]);

      const map = new Map<number, string>();
      ((payments as any[]) || []).forEach((p) => {
        if (p.paid) map.set(p.month, p.paid_at);
      });
      setPaidMonths(map);
      setBlocked(!!profile?.blocked);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const day = today.getDate();

  const getMonthStatus = (m: number): "paid" | "pending" | "upcoming" | "past-unpaid" => {
    if (paidMonths.has(m)) return "paid";
    if (!isCurrentYear) {
      return year < today.getFullYear() ? "past-unpaid" : "upcoming";
    }
    if (m < currentMonth) return "past-unpaid";
    if (m === currentMonth) return day > GRACE_DAY ? "pending" : "upcoming";
    return "upcoming";
  };

  const currentStatus = isCurrentYear ? getMonthStatus(currentMonth) : null;
  const paidCount = paidMonths.size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mis Cuotas</h1>
        <p className="text-muted-foreground mt-2">
          Consulta el estado de tus cuotas mensuales. La fecha de pago es del día 1 al 5 de cada mes.
        </p>
      </div>

      {blocked && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-destructive">Tu acceso está bloqueado</div>
              <div className="text-sm text-muted-foreground">
                Ponte en contacto con el centro para regularizar tu situación.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isCurrentYear && currentStatus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cuota de {MONTHS[currentMonth - 1]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentStatus === "paid" ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                <span className="text-xl font-bold">Pagada</span>
              </div>
            ) : currentStatus === "pending" ? (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-6 w-6" />
                <span className="text-xl font-bold">Pendiente de pago</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-6 w-6" />
                <span className="text-xl font-bold">Dentro del plazo (hasta día {GRACE_DAY})</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Meses pagados en {year}: <span className="font-semibold text-foreground">{paidCount} / 12</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[70px] text-center font-semibold">{year}</div>
          <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {MONTHS.map((name, i) => {
            const m = i + 1;
            const status = getMonthStatus(m);
            const paidAt = paidMonths.get(m);
            const isCurrent = isCurrentYear && m === currentMonth;
            return (
              <Card
                key={m}
                className={`${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{name}</div>
                    {status === "paid" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : status === "pending" ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : null}
                  </div>
                  {status === "paid" ? (
                    <>
                      <Badge className="bg-green-500/10 text-green-700 border-green-500/20" variant="outline">
                        Pagada
                      </Badge>
                      {paidAt && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(paidAt).toLocaleDateString("es-ES")}
                        </div>
                      )}
                    </>
                  ) : status === "pending" ? (
                    <Badge variant="destructive">Pendiente</Badge>
                  ) : status === "past-unpaid" ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      Sin registrar
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Próximo
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyPayments;
