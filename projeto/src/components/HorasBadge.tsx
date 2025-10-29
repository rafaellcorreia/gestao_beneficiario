import { Badge } from "@/components/ui/badge";
import { getCorHoras } from "@/lib/validations";

interface HorasBadgeProps {
  horas: number;
  className?: string;
}

export function HorasBadge({ horas, className }: HorasBadgeProps) {
  const cor = getCorHoras(horas);
  
  const variants = {
    normal: "bg-lapso-normal text-white hover:bg-lapso-normal/90",
    warning: "bg-lapso-warning text-white hover:bg-lapso-warning/90",
    danger: "bg-lapso-danger text-white hover:bg-lapso-danger/90",
    critical: "bg-lapso-critical text-white hover:bg-lapso-critical/90 animate-pulse",
  };

  const formatarHoras = (h: number): string => {
    if (h < 24) return `${h}h`;
    const dias = Math.floor(h / 24);
    const horasRestantes = h % 24;
    return `${dias}d ${horasRestantes}h`;
  };

  return (
    <Badge className={`${variants[cor]} ${className || ""}`}>
      {formatarHoras(horas)}
    </Badge>
  );
}
