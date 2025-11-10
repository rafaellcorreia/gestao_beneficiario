import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Beneficiario } from "@/types/employee";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calculator, Save, X } from "lucide-react";

interface EditHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiario: Beneficiario | null;
  onUpdate: () => void;
}

export function EditHoursDialog({ open, onOpenChange, beneficiario, onUpdate }: EditHoursDialogProps) {
  const [horasCumpridas, setHorasCumpridas] = useState<number>(0);
  const [horasRestantes, setHorasRestantes] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [horasIniciais, setHorasIniciais] = useState<number>(0);

  useEffect(() => {
    if (beneficiario) {
      setHorasCumpridas(beneficiario.horasCumpridas);
      setHorasRestantes(beneficiario.horasRestantes);
      // Calcular horas iniciais baseado no que foi cadastrado
      setHorasIniciais(beneficiario.horasCumpridas + beneficiario.horasRestantes);
    }
  }, [beneficiario]);

  const handleHorasCumpridasChange = (value: string) => {
    const novasHorasCumpridas = parseInt(value) || 0;
    setHorasCumpridas(novasHorasCumpridas);
    
    // Calcular horas restantes automaticamente
    const novasHorasRestantes = Math.max(0, horasIniciais - novasHorasCumpridas);
    setHorasRestantes(novasHorasRestantes);
  };

  const handleSave = async () => {
    if (!beneficiario) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("beneficiarios")
        .update({
          horas_cumpridas: horasCumpridas,
          horas_restantes: horasRestantes,
          atualizado_em: new Date().toISOString(),
          atualizado_por: "Sistema"
        })
        .eq("id", beneficiario.id);

      if (error) throw error;

      toast.success("Horas atualizadas com sucesso!");
      onUpdate();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Erro ao atualizar horas:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao atualizar horas: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!beneficiario) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Editar Horas - {beneficiario.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações atuais */}
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Informações Atuais</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Total de Horas:</span>
                <span className="font-medium ml-1">{horasIniciais}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Processo:</span>
                <span className="font-medium ml-1">{beneficiario.numeroProcesso}</span>
              </div>
            </div>
          </div>

          {/* Edição de horas */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="horasCumpridas">
                Horas Cumpridas <span className="text-destructive">*</span>
              </Label>
              <Input
                id="horasCumpridas"
                type="number"
                value={horasCumpridas}
                onChange={(e) => handleHorasCumpridasChange(e.target.value)}
                className="mt-1"
                min="0"
                max={horasIniciais}
                placeholder="Digite as horas cumpridas"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Máximo: {horasIniciais}h (total cadastrado)
              </p>
            </div>

            <div>
              <Label htmlFor="horasRestantes">Horas Restantes</Label>
              <Input
                id="horasRestantes"
                type="number"
                value={horasRestantes}
                readOnly
                className="mt-1 bg-muted"
                placeholder="Calculado automaticamente"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Calculado automaticamente: {horasIniciais} - {horasCumpridas} = {horasRestantes}h
              </p>
            </div>
          </div>

          {/* Resumo da alteração */}
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium text-sm mb-2">Resumo da Alteração</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Horas Cumpridas:</span>
                <span className="font-medium">{beneficiario.horasCumpridas}h → {horasCumpridas}h</span>
              </div>
              <div className="flex justify-between">
                <span>Horas Restantes:</span>
                <span className="font-medium">{beneficiario.horasRestantes}h → {horasRestantes}h</span>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || horasCumpridas === beneficiario.horasCumpridas}
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

