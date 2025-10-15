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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/classes/${id}`)}>
      <div className="aspect-video w-full overflow-hidden">
        <img 
          src={imageUrl || "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=500"} 
          alt={name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" variant="default">
          <Calendar className="mr-2 h-4 w-4" />
          Ver horarios
        </Button>
      </CardContent>
    </Card>
  );
}
