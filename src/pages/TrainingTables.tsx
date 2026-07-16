import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Link as LinkIcon,
  FileText,
  ExternalLink,
} from "lucide-react";

interface TrainingTable {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  external_url: string | null;
  created_at: string;
}

const BUCKET = "training-tables";

const TrainingTables = () => {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [tables, setTables] = useState<TrainingTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<TrainingTable | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("training_tables")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTables((data as TrainingTable[]) || []);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudieron cargar las tablas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setExternalUrl("");
    setFile(null);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (t: TrainingTable) => {
    setEditing(t);
    setTitle(t.title);
    setDescription(t.description || "");
    setExternalUrl(t.external_url || "");
    setFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Falta el título", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      let fileUrl = editing?.file_url || null;

      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        fileUrl = path;
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        external_url: externalUrl.trim() || null,
        file_url: fileUrl,
      };

      if (editing) {
        const { error } = await supabase
          .from("training_tables")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Tabla actualizada" });
      } else {
        const { error } = await supabase
          .from("training_tables")
          .insert({ ...payload, created_by: user.id });
        if (error) throw error;
        toast({ title: "Tabla creada" });
      }

      setDialogOpen(false);
      resetForm();
      load();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "No se pudo guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: TrainingTable) => {
    try {
      if (t.file_url) {
        await supabase.storage.from(BUCKET).remove([t.file_url]);
      }
      const { error } = await supabase.from("training_tables").delete().eq("id", t.id);
      if (error) throw error;
      toast({ title: "Tabla eliminada" });
      load();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "No se pudo eliminar", variant: "destructive" });
    }
  };

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
    if (error || !data) {
      toast({ title: "Error", description: "No se pudo abrir el archivo", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-bebas text-3xl sm:text-4xl md:text-5xl tracking-wider text-primary drop-shadow-[0_0_25px_hsl(var(--primary)/0.5)]">
            TABLAS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tablas de entrenamiento y recursos compartidos.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" /> Nueva tabla
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar tabla" : "Nueva tabla"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    placeholder="Ej: Tabla piernas semana 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    rows={5}
                    placeholder="Explica ejercicios, series, repeticiones..."
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="file" className="flex items-center gap-1.5">
                      <Upload className="h-4 w-4" /> Subir archivo
                    </Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      accept="image/*,application/pdf"
                    />
                    {editing?.file_url && !file && (
                      <p className="text-xs text-muted-foreground">Ya hay un archivo. Sube otro para reemplazarlo.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url" className="flex items-center gap-1.5">
                      <LinkIcon className="h-4 w-4" /> O pega una URL
                    </Label>
                    <Input
                      id="url"
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://..."
                      maxLength={500}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editing ? "Guardar" : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isAdmin ? "Aún no hay tablas. Crea la primera con el botón de arriba." : "Aún no hay tablas disponibles."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tables.map((t) => (
            <Card key={t.id} className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-bebas tracking-wide text-xl text-primary">
                    {t.title}
                  </CardTitle>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar tabla?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(t)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {t.description && (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                    {t.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {t.file_url && (
                    <Button size="sm" variant="secondary" onClick={() => openFile(t.file_url!)} className="gap-1.5">
                      <FileText className="h-4 w-4" /> Ver archivo
                    </Button>
                  )}
                  {t.external_url && (
                    <Button size="sm" variant="secondary" asChild className="gap-1.5">
                      <a href={t.external_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" /> Abrir enlace
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainingTables;