import { Badge } from "@/components/ui/badge";
import { StatusVida } from "@/types/employee";

interface StatusBadgeProps {
  status: StatusVida | string; // Aceita string para compatibilidade com valores antigos
  className?: string;
}

// Mapeamento de valores antigos para novos (compatibilidade com dados existentes)
const statusMigrationMap: Record<string, StatusVida> = {
  "Vivo": "Vivo(a)",
  "Morto": "Morto(a)",
  "Preso": "Preso(a)",
  "Enfermo": "Enfermo(a)",
  "Devolvido": "Devolvido(a)",
};

const statusConfig: Record<StatusVida, { label: string; className: string }> = {
  "Vivo(a)": {
    label: "Vivo(a)",
    className: "bg-green-600 text-white hover:bg-green-700",
  },
  "Morto(a)": {
    label: "Morto(a)",
    className: "bg-gray-800 text-white hover:bg-gray-900",
  },
  "Preso(a)": {
    label: "Preso(a)",
    className: "bg-red-600 text-white hover:bg-red-700",
  },
  "Enfermo(a)": {
    label: "Enfermo(a)",
    className: "bg-yellow-600 text-white hover:bg-yellow-700",
  },
  "Licença Maternidade": {
    label: "Licença Maternidade",
    className: "bg-pink-600 text-white hover:bg-pink-700",
  },
  "Devolvido(a)": {
    label: "Devolvido(a)",
    className: "bg-orange-600 text-white hover:bg-orange-700",
  },
  "Concludente": {
    label: "Concludente",
    className: "bg-blue-600 text-white hover:bg-blue-700",
  },
  "Aguardando Sentença": {
    label: "Aguardando Sentença",
    className: "bg-purple-600 text-white hover:bg-purple-700",
  },
  "Arquivado(a)": {
    label: "Arquivado(a)",
    className: "bg-slate-600 text-white hover:bg-slate-700",
  },
  "Possível Concludente": {
    label: "Possível Concludente",
    className: "bg-cyan-600 text-white hover:bg-cyan-700",
  },
  "Extinto(a)": {
    label: "Extinto(a)",
    className: "bg-gray-600 text-white hover:bg-gray-700",
  },
};

// Função para normalizar o status (converte valores antigos para novos)
function normalizeStatus(status: string): StatusVida {
  // Se já está no formato novo, retorna como está
  if (statusConfig[status as StatusVida]) {
    return status as StatusVida;
  }
  
  // Tenta migrar valores antigos
  const migrated = statusMigrationMap[status];
  if (migrated) {
    return migrated;
  }
  
  // Fallback: retorna o primeiro valor válido se não encontrar
  console.warn(`Status desconhecido: "${status}". Usando fallback.`);
  return "Vivo(a)";
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Normaliza o status para garantir compatibilidade
  const normalizedStatus = normalizeStatus(status);
  const config = statusConfig[normalizedStatus];

  // Verificação de segurança adicional
  if (!config) {
    console.error(`Configuração não encontrada para status: ${normalizedStatus}`);
    return (
      <Badge className={`bg-gray-500 text-white ${className || ""}`}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge className={`${config.className} ${className || ""}`}>
      {config.label}
    </Badge>
  );
}
