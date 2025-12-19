import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            
            <h2 className="text-xl font-bold text-foreground mb-2">
              Oops! Algo deu errado
            </h2>
            
            <p className="text-muted-foreground mb-4">
              Ocorreu um erro inesperado. Isso pode ter sido causado por um problema temporário.
            </p>
            
            {this.state.error && (
              <details className="text-left mb-4 p-3 bg-muted rounded text-sm">
                <summary className="cursor-pointer font-medium mb-2">
                  Detalhes do erro
                </summary>
                <code className="text-xs text-destructive">
                  {this.state.error.message}
                </code>
              </details>
            )}
            
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
              <Button onClick={this.handleReload}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar Página
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              Se o problema persistir, verifique o console do navegador (F12) para mais detalhes.
            </p>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

