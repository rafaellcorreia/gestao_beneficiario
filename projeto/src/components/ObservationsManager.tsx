import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit3, Trash2, Save, X } from "lucide-react";
import { Observacao } from "@/types/employee";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ObservationsManagerProps {
  beneficiarioId: string;
  observacoes: Observacao[];
  onUpdate: () => void;
}

export function ObservationsManager({ beneficiarioId, observacoes, onUpdate }: ObservationsManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newObservacao, setNewObservacao] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddObservacao = async () => {
    if (!newObservacao.trim()) return;

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { error } = await supabase
        .from('observacoes')
        .insert({
          beneficiario_id: beneficiarioId,
          autor: user.email || 'Usuário',
          texto: newObservacao.trim(),
        });

      if (error) {
        throw error;
      }

      toast.success("Observação adicionada com sucesso!");
      setNewObservacao("");
      setIsAddOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error("Erro ao adicionar observação:", error);
      toast.error("Erro ao adicionar observação: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditObservacao = async (observacaoId: string) => {
    if (!editingText.trim()) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('observacoes')
        .update({ texto: editingText.trim() })
        .eq('id', observacaoId);

      if (error) {
        throw error;
      }

      toast.success("Observação atualizada com sucesso!");
      setEditingId(null);
      setEditingText("");
      onUpdate();
    } catch (error: any) {
      console.error("Erro ao editar observação:", error);
      toast.error("Erro ao editar observação: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteObservacao = async (observacaoId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta observação?")) return;

    try {
      const { error } = await supabase
        .from('observacoes')
        .delete()
        .eq('id', observacaoId);

      if (error) {
        throw error;
      }

      toast.success("Observação excluída com sucesso!");
      onUpdate();
    } catch (error: any) {
      console.error("Erro ao excluir observação:", error);
      toast.error("Erro ao excluir observação: " + error.message);
    }
  };

  const startEditing = (observacao: Observacao) => {
    setEditingId(observacao.id);
    setEditingText(observacao.texto);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText("");
  };

  // Ordenar observações por data (mais recente primeiro)
  const observacoesOrdenadas = [...observacoes].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Observações ({observacoes.length})</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Observação
        </Button>
      </div>

      {observacoesOrdenadas.length > 0 ? (
        <div className="space-y-3">
          {observacoesOrdenadas.map((obs) => (
            <div key={obs.id} className="border-l-2 border-primary pl-3">
              {editingId === obs.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="min-h-[80px]"
                    placeholder="Digite a observação..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEditObservacao(obs.id)}
                      disabled={isSubmitting || !editingText.trim()}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-foreground">{obs.texto}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-muted-foreground text-xs">
                      {obs.autor} - {new Date(obs.timestamp).toLocaleString("pt-BR")}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(obs)}
                        className="h-6 px-2 text-xs"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteObservacao(obs.id)}
                        className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma observação registrada</p>
      )}

      {/* Dialog Adicionar Observação */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Observação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={newObservacao}
                onChange={(e) => setNewObservacao(e.target.value)}
                placeholder="Digite a observação..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddObservacao} 
              disabled={!newObservacao.trim() || isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
