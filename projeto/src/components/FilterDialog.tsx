import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusVida } from "@/types/employee";

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: any) => void;
}

export function FilterDialog({ open, onOpenChange, onApplyFilters }: FilterDialogProps) {
  const [status, setStatus] = useState<StatusVida | "todos">("todos");
  const [lapsoMin, setLapsoMin] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const handleApply = () => {
    onApplyFilters({
      status: status === "todos" ? null : status,
      lapsoMin: lapsoMin ? parseInt(lapsoMin) : null,
      dataInicio: dataInicio || null,
      dataFim: dataFim || null,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setStatus("todos");
    setLapsoMin("");
    setDataInicio("");
    setDataFim("");
    onApplyFilters({
      status: null,
      lapsoMin: null,
      dataInicio: null,
      dataFim: null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filtros Avançados</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status de Vida</Label>
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Vivo">Vivo</SelectItem>
                <SelectItem value="Morto">Morto</SelectItem>
                <SelectItem value="Preso">Preso</SelectItem>
                <SelectItem value="Enfermo">Enfermo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lapso">Lapso mínimo (dias)</Label>
            <Input
              id="lapso"
              type="number"
              placeholder="Ex: 30"
              value={lapsoMin}
              onChange={(e) => setLapsoMin(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataInicio">Data Início</Label>
            <Input
              id="dataInicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataFim">Data Fim</Label>
            <Input
              id="dataFim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClear} className="flex-1">
              Limpar
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
