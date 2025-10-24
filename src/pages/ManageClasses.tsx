import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ClassType {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

export default function ManageClasses() {
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassType | null>(null);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

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
      loadClasses();
    }
  }, [isAdmin]);

  const loadClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las clases",
        variant: "destructive",
      });
    } else {
      setClasses(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (classToEdit?: ClassType) => {
    if (classToEdit) {
      setEditingClass(classToEdit);
      setName(classToEdit.name);
      setDescription(classToEdit.description || "");
      setImageUrl(classToEdit.image_url || "");
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSaveClass = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (editingClass) {
      // Update existing class
      const { error } = await supabase
        .from("classes")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
        })
        .eq("id", editingClass.id);

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la clase",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Clase actualizada",
          description: "La clase se ha actualizado correctamente",
        });
        setDialogOpen(false);
        resetForm();
        loadClasses();
      }
    } else {
      // Create new class
      const { error } = await supabase
        .from("classes")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
        });

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear la clase",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Clase creada",
          description: "La clase se ha creado correctamente. Ahora puedes crear horarios para esta clase.",
        });
        setDialogOpen(false);
        resetForm();
        loadClasses();
      }
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", classId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la clase. Asegúrate de eliminar primero todos los horarios asociados.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Clase eliminada",
        description: "La clase se ha eliminado correctamente",
      });
      loadClasses();
    }
  };

  const resetForm = () => {
    setEditingClass(null);
    setName("");
    setDescription("");
    setImageUrl("");
  };

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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Gestión de Clases</CardTitle>
            <CardDescription>Crea y gestiona los tipos de clases disponibles</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Clase
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{editingClass ? "Editar Clase" : "Crear Nueva Clase"}</DialogTitle>
                <DialogDescription>
                  {editingClass ? "Modifica los datos de la clase" : "Añade un nuevo tipo de clase"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: CrossFit, Yoga, Spinning..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe la clase..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL de la imagen</Label>
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {imageUrl && (
                    <div className="mt-2">
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveClass}>
                  {editingClass ? "Actualizar" : "Crear Clase"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay clases creadas todavía
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <Card key={cls.id} className="overflow-hidden">
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={cls.image_url || "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400"}
                      alt={cls.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{cls.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {cls.description || "Sin descripción"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenDialog(cls)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex-1">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará la clase y no se puede deshacer. Asegúrate de eliminar primero todos los horarios asociados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteClass(cls.id)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
