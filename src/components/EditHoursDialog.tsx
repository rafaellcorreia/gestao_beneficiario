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
      const cumpridas = beneficiario.horasCumpridas || 0;
      const restantes = beneficiario.horasRestantes || 0;
      
      // Calcular total de horas: total = cumpridas + restantes (do banco)
      const total = cumpridas + restantes;
      
      console.log('📊 EditHoursDialog - Carregando horas do beneficiário:');
      console.log('  - Horas Cumpridas (banco):', cumpridas);
      console.log('  - Horas Restantes (banco):', restantes);
      console.log('  - Total de Horas (calculado):', total);
      
      setHorasCumpridas(cumpridas);
      setHorasRestantes(restantes);
      setHorasIniciais(total > 0 ? total : 0);
    }
  }, [beneficiario]);

  const handleHorasCumpridasChange = (value: string) => {
    const novasHorasCumpridas = parseInt(value) || 0;
    setHorasCumpridas(novasHorasCumpridas);
    
    // SEMPRE recalcular horas restantes: restantes = total - cumpridas
    if (horasIniciais > 0) {
      const novasHorasRestantes = Math.max(0, horasIniciais - novasHorasCumpridas);
      console.log('🔄 EditHoursDialog - Recalculando horas:');
      console.log('  - Total:', horasIniciais);
      console.log('  - Novas Cumpridas:', novasHorasCumpridas);
      console.log('  - Novas Restantes (calculadas):', novasHorasRestantes);
      setHorasRestantes(novasHorasRestantes);
    } else {
      // Se não temos total inicial (não deveria acontecer), tentar calcular
      const restantesAtuais = beneficiario?.horasRestantes || 0;
      const cumpridasAtuais = beneficiario?.horasCumpridas || 0;
      const totalCalculado = cumpridasAtuais + restantesAtuais;
      
      if (totalCalculado > 0) {
        setHorasIniciais(totalCalculado);
        const novasHorasRestantes = Math.max(0, totalCalculado - novasHorasCumpridas);
        setHorasRestantes(novasHorasRestantes);
        console.log('⚠️ EditHoursDialog - Total não estava definido, calculado agora:', totalCalculado);
      }
    }
  };

  const handleSave = async () => {
    if (!beneficiario) return;

    // Validar que horas cumpridas não excedam o total
    if (horasIniciais > 0 && horasCumpridas > horasIniciais) {
      toast.error(`Horas cumpridas (${horasCumpridas}h) não podem ser maiores que o total (${horasIniciais}h)`);
      return;
    }

    // SEMPRE recalcular horas restantes: restantes = total - cumpridas
    // Isso garante que o cálculo esteja sempre correto, mesmo se o usuário tentar alterar manualmente
    const horasRestantesCalculadas = horasIniciais > 0 
      ? Math.max(0, horasIniciais - horasCumpridas)
      : Math.max(0, (beneficiario.horasCumpridas + beneficiario.horasRestantes) - horasCumpridas);

    console.log('💾 EditHoursDialog - Salvando horas atualizadas:');
    console.log('  - Total de Horas (FIXO):', horasIniciais);
    console.log('  - Horas Cumpridas (nova):', horasCumpridas);
    console.log('  - Horas Restantes (calculadas):', horasRestantesCalculadas);
    console.log('  - Verificação: Total = Cumpridas + Restantes?', horasIniciais, '=', horasCumpridas, '+', horasRestantesCalculadas, '→', (horasCumpridas + horasRestantesCalculadas === horasIniciais ? '✅ CORRETO' : '❌ ERRO'));

    setLoading(true);
    try {
      const { error } = await supabase
        .from("beneficiarios")
        .update({
          horas_cumpridas: horasCumpridas,
          horas_restantes: horasRestantesCalculadas,
          atualizado_em: new Date().toISOString(),
          atualizado_por: "Sistema"
        })
        .eq("id", beneficiario.id);

      if (error) {
        console.error('Erro ao atualizar horas:', error);
        throw error;
      }

      console.log('Horas atualizadas com sucesso no banco');
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

