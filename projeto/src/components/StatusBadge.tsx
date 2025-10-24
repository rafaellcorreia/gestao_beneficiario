import { Badge } from "@/components/ui/badge";
import { StatusVida } from "@/types/employee";

interface StatusBadgeProps {
  status: StatusVida;
  className?: string;
}

const statusConfig: Record<StatusVida, { label: string; className: string }> = {
  Vivo: {
    label: "Vivo",
    className: "bg-green-600 text-white hover:bg-green-700",
  },
  Morto: {
    label: "Morto",
    className: "bg-gray-800 text-white hover:bg-gray-900",
  },
  Preso: {
    label: "Preso",
    className: "bg-red-600 text-white hover:bg-red-700",
  },
  Enfermo: {
    label: "Enfermo",
    className: "bg-yellow-600 text-white hover:bg-yellow-700",
  },
  "Licença Maternidade": {
    label: "Licença Maternidade",
    className: "bg-pink-600 text-white hover:bg-pink-700",
  },
  Devolvido: {
    label: "Devolvido",
    className: "bg-orange-600 text-white hover:bg-orange-700",
  },
  Concludente: {
    label: "Concludente",
    className: "bg-blue-600 text-white hover:bg-blue-700",
  },
  "Aguardando Sentença": {
    label: "Aguardando Sentença",
    className: "bg-purple-600 text-white hover:bg-purple-700",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge className={`${config.className} ${className || ""}`}>
      {config.label}
    </Badge>
  );
}
