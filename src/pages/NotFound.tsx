import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="text-center max-w-md">
        <h1 className="mb-4 text-8xl font-bold text-primary">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-foreground">
          Página não encontrada
        </h2>
        <p className="mb-2 text-muted-foreground">
          A página que você está procurando não existe.
        </p>
        {location.pathname && (
          <p className="mb-6 text-sm text-muted-foreground font-mono bg-muted/50 px-3 py-2 rounded-md inline-block">
            {location.pathname}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={() => navigate("/")} className="gap-2">
            <Home className="h-4 w-4" />
            Ir para Página Inicial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
