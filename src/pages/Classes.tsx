import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Classes() {
  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-8 text-primary">Clases</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            Estamos preparando el sistema de clases para ti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Spinning</Badge>
            <Badge variant="secondary">Yoga</Badge>
            <Badge variant="secondary">Pilates</Badge>
            <Badge variant="secondary">Zumba</Badge>
            <Badge variant="secondary">CrossFit</Badge>
            <Badge variant="secondary">Boxing</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
