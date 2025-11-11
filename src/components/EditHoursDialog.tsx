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
  const [ultimoCampoEditado, setUltimoCampoEditado] = useState<'cumpridas' | 'restantes' | null>(null);

  useEffect(() => {
    if (beneficiario && open) {
      const cumpridas = Number(beneficiario.horasCumpridas) || 0;
      const restantes = Number(beneficiario.horasRestantes) || 0;
      
      // Calcular total de horas: total = cumpridas + restantes (do banco)
      const total = cumpridas + restantes;
      
      console.log('📊 EditHoursDialog - Carregando horas do beneficiário:');
      console.log('  - Horas Cumpridas (banco):', cumpridas);
      console.log('  - Horas Restantes (banco):', restantes);
      console.log('  - Total de Horas (calculado):', total);
      
      setHorasCumpridas(cumpridas);
      setHorasRestantes(restantes);
      setHorasIniciais(total);
      setUltimoCampoEditado(null); // Reset ao abrir o diálogo
    }
  }, [beneficiario, open]);

  const handleHorasCumpridasChange = (value: string) => {
    const novasHorasCumpridas = parseFloat(value) || 0;
    const horasCumpridasValidas = Math.max(0, novasHorasCumpridas);
    setHorasCumpridas(horasCumpridasValidas);
    setUltimoCampoEditado('cumpridas');
    
    // Se temos total definido, recalcular horas restantes automaticamente
    if (horasIniciais > 0) {
      const novasHorasRestantes = Math.max(0, horasIniciais - horasCumpridasValidas);
      console.log('🔄 EditHoursDialog - Recalculando horas restantes:');
      console.log('  - Total:', horasIniciais);
      console.log('  - Novas Cumpridas:', horasCumpridasValidas);
      console.log('  - Novas Restantes (calculadas):', novasHorasRestantes);
      setHorasRestantes(novasHorasRestantes);
    } else {
      // Se não há total definido, recalcular o total baseado nos valores atuais
      const restantesAtuais = horasRestantes;
      const novoTotal = horasCumpridasValidas + restantesAtuais;
      if (novoTotal > 0) {
        setHorasIniciais(novoTotal);
        console.log('📊 Total calculado:', novoTotal);
      }
    }
  };

  const handleHorasRestantesChange = (value: string) => {
    const novasHorasRestantes = parseFloat(value) || 0;
    const horasRestantesValidas = Math.max(0, novasHorasRestantes);
    setHorasRestantes(horasRestantesValidas);
    setUltimoCampoEditado('restantes');
    
    // Quando horas restantes são editadas manualmente, recalcular o total
    const cumpridasAtuais = horasCumpridas;
    const novoTotal = cumpridasAtuais + horasRestantesValidas;
    if (novoTotal > 0) {
      setHorasIniciais(novoTotal);
      console.log('🔄 EditHoursDialog - Total recalculado:');
      console.log('  - Cumpridas:', cumpridasAtuais);
      console.log('  - Restantes:', horasRestantesValidas);
      console.log('  - Novo Total:', novoTotal);
    }
  };

  const handleSave = async () => {
    if (!beneficiario) return;

    // Validar valores
    const horasCumpridasValidas = Math.max(0, Number(horasCumpridas) || 0);
    const horasRestantesValidas = Math.max(0, Number(horasRestantes) || 0);
    
    // Calcular total atual
    const totalAtual = horasCumpridasValidas + horasRestantesValidas;
    
    // Se o último campo editado foi "cumpridas" e temos um total definido,
    // garantir que as horas restantes estejam corretas
    let horasRestantesFinais = horasRestantesValidas;
    if (ultimoCampoEditado === 'cumpridas' && horasIniciais > 0) {
      // Recalcular restantes baseado no total fixo
      horasRestantesFinais = Math.max(0, horasIniciais - horasCumpridasValidas);
      console.log('🔄 Ajustando horas restantes baseado no total fixo:', horasRestantesFinais);
    }

    // Validar que a soma esteja correta
    const somaFinal = horasCumpridasValidas + horasRestantesFinais;
    if (horasIniciais > 0 && Math.abs(somaFinal - horasIniciais) > 0.01 && ultimoCampoEditado === 'cumpridas') {
      // Se estamos editando cumpridas, forçar o cálculo correto
      horasRestantesFinais = Math.max(0, horasIniciais - horasCumpridasValidas);
    }

    console.log('💾 EditHoursDialog - Salvando horas atualizadas:');
    console.log('  - Total de Horas:', horasIniciais > 0 ? horasIniciais : totalAtual);
    console.log('  - Horas Cumpridas:', horasCumpridasValidas);
    console.log('  - Horas Restantes:', horasRestantesFinais);
    console.log('  - Soma:', horasCumpridasValidas + horasRestantesFinais);
    console.log('  - Último campo editado:', ultimoCampoEditado);

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
              <Label htmlFor="horasRestantes">
                Horas Restantes <span className="text-destructive">*</span>
              </Label>
              <Input
                id="horasRestantes"
                type="number"
                value={horasRestantes}
                onChange={(e) => handleHorasRestantesChange(e.target.value)}
                className="mt-1"
                min="0"
                step="0.5"
                placeholder="Digite as horas restantes"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {horasIniciais > 0 
                  ? ultimoCampoEditado === 'cumpridas'
                    ? `Calculado automaticamente: ${horasIniciais}h - ${horasCumpridas}h = ${horasRestantes.toFixed(1)}h`
                    : `Editável manualmente. Total atual: ${horasIniciais}h`
                  : 'Informe as horas restantes. O total será calculado automaticamente.'}
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

