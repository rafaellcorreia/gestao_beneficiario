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
    if (beneficiario && open) {
      const cumpridas = Number(beneficiario.horasCumpridas) || 0;
      const restantes = Number(beneficiario.horasRestantes) || 0;
      
      // Calcular total de horas: total = cumpridas + restantes (do banco)
      // Se o total for 0, usar as horas cumpridas e restantes como estão
      const total = cumpridas + restantes;
      
      console.log('📊 EditHoursDialog - Carregando horas do beneficiário:');
      console.log('  - Horas Cumpridas (banco):', cumpridas);
      console.log('  - Horas Restantes (banco):', restantes);
      console.log('  - Total de Horas (calculado):', total);
      
      setHorasCumpridas(cumpridas);
      setHorasRestantes(restantes);
      // Sempre definir o total, mesmo se for 0 (para permitir adicionar horas pela primeira vez)
      setHorasIniciais(total);
    }
  }, [beneficiario, open]);

  const handleHorasCumpridasChange = (value: string) => {
    const novasHorasCumpridas = parseFloat(value) || 0;
    
    // Garantir que não seja negativo
    const horasCumpridasValidas = Math.max(0, novasHorasCumpridas);
    setHorasCumpridas(horasCumpridasValidas);
    
    // Recalcular horas restantes baseado no total atual
    // Se temos um total definido, usar ele; senão, calcular do banco
    let totalParaCalculo = horasIniciais;
    
    // Se não temos total ainda, tentar calcular a partir dos valores do banco
    if (totalParaCalculo === 0 && beneficiario) {
      const cumpridasAtuais = Number(beneficiario.horasCumpridas) || 0;
      const restantesAtuais = Number(beneficiario.horasRestantes) || 0;
      totalParaCalculo = cumpridasAtuais + restantesAtuais;
      
      // Se encontramos um total válido, atualizar o estado
      if (totalParaCalculo > 0) {
        setHorasIniciais(totalParaCalculo);
      }
    }
    
    // Se temos um total válido, recalcular as horas restantes
    if (totalParaCalculo > 0) {
      const novasHorasRestantes = Math.max(0, totalParaCalculo - horasCumpridasValidas);
      console.log('🔄 EditHoursDialog - Recalculando horas:');
      console.log('  - Total:', totalParaCalculo);
      console.log('  - Novas Cumpridas:', horasCumpridasValidas);
      console.log('  - Novas Restantes (calculadas):', novasHorasRestantes);
      setHorasRestantes(novasHorasRestantes);
    } else {
      // Se não há total definido, manter as horas restantes como estão (do banco)
      // Não podemos calcular sem um total válido
      console.log('⚠️ EditHoursDialog - Sem total definido, mantendo horas restantes do banco');
    }
  };

  const handleSave = async () => {
    if (!beneficiario) return;

    // Calcular o total atual (pode ser o total inicial ou o total do banco)
    const totalAtual = horasIniciais > 0 
      ? horasIniciais 
      : (Number(beneficiario.horasCumpridas) || 0) + (Number(beneficiario.horasRestantes) || 0);

    // Validar que horas cumpridas não excedam o total (se houver total definido)
    if (totalAtual > 0 && horasCumpridas > totalAtual) {
      toast.error(`Horas cumpridas (${horasCumpridas}h) não podem ser maiores que o total (${totalAtual}h)`);
      return;
    }

    // SEMPRE recalcular horas restantes: restantes = total - cumpridas
    // Isso garante que o cálculo esteja sempre correto
    const horasCumpridasValidas = Math.max(0, Number(horasCumpridas) || 0);
    const horasRestantesCalculadas = totalAtual > 0 
      ? Math.max(0, totalAtual - horasCumpridasValidas)
      : Math.max(0, horasRestantes); // Se não há total, manter o valor atual

    // Garantir que as horas restantes sejam sempre calculadas corretamente
    // Se houver total, recalcular para garantir precisão
    let horasRestantesFinais = horasRestantesCalculadas;
    if (totalAtual > 0) {
      horasRestantesFinais = Math.max(0, totalAtual - horasCumpridasValidas);
      const soma = horasCumpridasValidas + horasRestantesFinais;
      if (Math.abs(soma - totalAtual) > 0.01) {
        console.warn('⚠️ Diferença no cálculo de horas detectada. Ajustando...');
        console.log('  - Soma calculada:', soma, '| Total esperado:', totalAtual);
        // Garantir que a soma seja exatamente o total
        horasRestantesFinais = Math.max(0, totalAtual - horasCumpridasValidas);
      }
    }

    console.log('💾 EditHoursDialog - Salvando horas atualizadas:');
    console.log('  - Total de Horas:', totalAtual);
    console.log('  - Horas Cumpridas:', horasCumpridasValidas);
    console.log('  - Horas Restantes (calculadas):', horasRestantesFinais);
    console.log('  - Verificação: Total = Cumpridas + Restantes?', totalAtual, '=', horasCumpridasValidas, '+', horasRestantesFinais, '→', (totalAtual > 0 && Math.abs((horasCumpridasValidas + horasRestantesFinais) - totalAtual) < 0.01 ? '✅ CORRETO' : (totalAtual === 0 ? '⚠️ SEM TOTAL' : '❌ ERRO')));

    setLoading(true);
    try {
      const { error } = await supabase
        .from("beneficiarios")
        .update({
          horas_cumpridas: horasCumpridasValidas,
          horas_restantes: horasRestantesFinais,
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
                max={horasIniciais > 0 ? horasIniciais : undefined}
                step="0.5"
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
                className="mt-1 bg-muted cursor-not-allowed"
                placeholder="Calculado automaticamente"
                step="0.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {horasIniciais > 0 
                  ? `Calculado automaticamente: ${horasIniciais}h - ${horasCumpridas}h = ${horasRestantes.toFixed(1)}h`
                  : 'Informe as horas cumpridas para calcular as restantes'}
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
              disabled={loading || (Math.abs(horasCumpridas - (beneficiario.horasCumpridas || 0)) < 0.01 && Math.abs(horasRestantes - (beneficiario.horasRestantes || 0)) < 0.01)}
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

