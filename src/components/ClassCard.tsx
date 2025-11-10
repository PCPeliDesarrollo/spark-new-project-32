import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ClassCardProps {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export function ClassCard({ id, name, description, imageUrl }: ClassCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="group overflow-hidden hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all duration-500 cursor-pointer bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 hover:border-primary/60 hover:scale-[1.02]" onClick={() => navigate(`/classes/${id}`)}>
      <div className="aspect-video w-full overflow-hidden relative bg-black">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
        <img 
          src={imageUrl || "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=500"} 
          alt={name}
          className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-700"
        />
      </div>
      <CardHeader>
        <CardTitle className="font-bebas text-2xl md:text-3xl tracking-wide text-foreground bg-gradient-to-r from-foreground to-primary bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] [background-clip:text]">{name}</CardTitle>
        <CardDescription className="text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] font-semibold" variant="default">
          <Calendar className="mr-2 h-4 w-4" />
          Ver horarios
        </Button>
      </CardContent>
    </Card>
  );
}
