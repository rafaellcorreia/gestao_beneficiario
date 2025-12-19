import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Beneficiario, StatusVida } from "@/types/employee";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PhotoCapture } from "@/components/PhotoCapture";

const editSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  numeroProcesso: z.string().min(1, "Número do processo é obrigatório"),
  dataRecebimento: z.string().min(1, "Data de recebimento é obrigatória"),
  statusVida: z.enum(["Vivo(a)", "Morto(a)", "Preso(a)", "Enfermo(a)", "Licença Maternidade", "Devolvido(a)", "Concludente", "Aguardando Sentença", "Arquivado(a)", "Possível Concludente", "Extinto(a)"]),
  localLotacao: z.string().min(1, "Local de lotação é obrigatório"),
  telefonePrincipal: z.string().optional(),
  telefoneSecundario: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

interface EditBeneficiarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiario: Beneficiario | null;
  onUpdate: () => void;
}

export function EditBeneficiarioDialog({ 
  open, 
  onOpenChange, 
  beneficiario, 
  onUpdate 
}: EditBeneficiarioDialogProps) {
  const [loading, setLoading] = useState(false);
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

  // Resetar formulário quando o beneficiário muda ou o diálogo abre
  useEffect(() => {
    if (beneficiario && open) {
      // Normalizar status para compatibilidade com valores antigos
      const statusMigrationMap: Record<string, StatusVida> = {
        "Vivo": "Vivo(a)",
        "Morto": "Morto(a)",
        "Preso": "Preso(a)",
        "Enfermo": "Enfermo(a)",
        "Devolvido": "Devolvido(a)",
      };
      
      const statusVidaNormalizado: StatusVida = 
        statusMigrationMap[beneficiario.statusVida] || 
        beneficiario.statusVida || 
        "Vivo(a)";

      reset({
        nome: beneficiario.nome,
        numeroProcesso: beneficiario.numeroProcesso,
        dataRecebimento: format(new Date(beneficiario.dataRecebimento), "yyyy-MM-dd"),
        statusVida: statusVidaNormalizado,
        localLotacao: beneficiario.localLotacao,
        telefonePrincipal: beneficiario.telefonePrincipal || "",
        telefoneSecundario: beneficiario.telefoneSecundario || "",
      });
      setNovaFoto(null);
      setFotoPreview(null);
    }
  }, [beneficiario, open, reset]);

  const handlePhotoCapture = (file: File, preview: string) => {
    setNovaFoto(file);
    setFotoPreview(preview);
  };

  const onSubmit = async (data: EditFormData) => {
    if (!beneficiario) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      let fotoUrl = beneficiario.fotoUrl;

      // Se há uma nova foto, fazer upload
      if (novaFoto) {
        try {
          const fileExt = novaFoto.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('beneficiarios-fotos')
            .upload(fileName, novaFoto, {
              upsert: false
            });
          
          if (uploadError) {
            console.warn('Erro no upload da foto:', uploadError);
            toast.warning('Erro no upload da foto, mantendo a foto anterior');
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('beneficiarios-fotos')
              .getPublicUrl(fileName);
            
            fotoUrl = publicUrl;
            console.log('Foto atualizada com sucesso:', fotoUrl);
          }
        } catch (error) {
          console.warn('Erro no upload da foto:', error);
          toast.warning('Erro no upload da foto, mantendo a foto anterior');
        }
      }

      const updateData: Record<string, any> = {
        nome: data.nome,
        numero_processo: data.numeroProcesso,
        data_recebimento: new Date(data.dataRecebimento).toISOString(),
        status_vida: data.statusVida,
        local_lotacao: data.localLotacao,
        telefone_principal: data.telefonePrincipal || null,
        telefone_secundario: data.telefoneSecundario || null,
        foto_url: fotoUrl,
        atualizado_em: new Date().toISOString(),
        atualizado_por: user.email || "Sistema",
      };

      const { error } = await supabase
        .from("beneficiarios")
        .update(updateData)
        .eq("id", beneficiario.id);

      if (error) {
        console.error("Erro ao atualizar beneficiário:", error);
        toast.error("Erro ao atualizar beneficiário: " + error.message);
        return;
      }

      toast.success("Beneficiário atualizado com sucesso!");
      onUpdate();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Erro ao atualizar beneficiário:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao atualizar beneficiário: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!beneficiario) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Beneficiário - {beneficiario.nome}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Seção de Foto */}
          <div className="space-y-2">
            <PhotoCapture
              onPhotoCapture={handlePhotoCapture}
              currentPhoto={fotoPreview || beneficiario.fotoUrl}
              label="Alterar Foto do Beneficiário"
              required={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                {...register("nome")}
                placeholder="Nome completo"
                disabled={loading}
              />
              {errors.nome && (
                <p className="text-sm text-red-500">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroProcesso">Número do Processo *</Label>
              <Input
                id="numeroProcesso"
                {...register("numeroProcesso")}
                placeholder="Número do processo"
                disabled={loading}
              />
              {errors.numeroProcesso && (
                <p className="text-sm text-red-500">{errors.numeroProcesso.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataRecebimento">Data de Recebimento *</Label>
              <Input
                id="dataRecebimento"
                type="date"
                {...register("dataRecebimento")}
                disabled={loading}
              />
              {errors.dataRecebimento && (
                <p className="text-sm text-red-500">{errors.dataRecebimento.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusVida">Situação Atual *</Label>
              <Select
                value={watch("statusVida")}
                onValueChange={(value) => setValue("statusVida", value as StatusVida)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vivo(a)">Vivo(a)</SelectItem>
                  <SelectItem value="Morto(a)">Morto(a)</SelectItem>
                  <SelectItem value="Preso(a)">Preso(a)</SelectItem>
                  <SelectItem value="Enfermo(a)">Enfermo(a)</SelectItem>
                  <SelectItem value="Licença Maternidade">Licença Maternidade</SelectItem>
                  <SelectItem value="Devolvido(a)">Devolvido(a)</SelectItem>
                  <SelectItem value="Concludente">Concludente</SelectItem>
                  <SelectItem value="Aguardando Sentença">Aguardando Sentença</SelectItem>
                  <SelectItem value="Arquivado(a)">Arquivado(a)</SelectItem>
                  <SelectItem value="Possível Concludente">Possível Concludente</SelectItem>
                  <SelectItem value="Extinto(a)">Extinto(a)</SelectItem>
                </SelectContent>
              </Select>
              {errors.statusVida && (
                <p className="text-sm text-red-500">{errors.statusVida.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="localLotacao">Local de Lotação *</Label>
              <Input
                id="localLotacao"
                {...register("localLotacao")}
                placeholder="Local de lotação"
                disabled={loading}
              />
              {errors.localLotacao && (
                <p className="text-sm text-red-500">{errors.localLotacao.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefonePrincipal">Telefone Principal</Label>
              <Input
                id="telefonePrincipal"
                {...register("telefonePrincipal")}
                placeholder="(00) 00000-0000"
                disabled={loading}
              />
              {errors.telefonePrincipal && (
                <p className="text-sm text-red-500">{errors.telefonePrincipal.message}</p>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="telefoneSecundario">Telefone Secundário</Label>
              <Input
                id="telefoneSecundario"
                {...register("telefoneSecundario")}
                placeholder="(00) 00000-0000"
                disabled={loading}
              />
              {errors.telefoneSecundario && (
                <p className="text-sm text-red-500">{errors.telefoneSecundario.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

