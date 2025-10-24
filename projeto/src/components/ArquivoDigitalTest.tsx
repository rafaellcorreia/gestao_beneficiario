import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ArquivoDigitalTest() {
  return (
    <Button variant="outline" size="sm">
      <FileText className="mr-2 h-4 w-4" />
      Arquivo Digital
    </Button>
  );
}

