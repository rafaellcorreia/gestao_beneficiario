import { useState, useMemo } from "react";
import { Plus, Search, Filter, LogOut, FileText, Edit3, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmployeeForm } from "@/components/EmployeeForm";
import { StatusBadge } from "@/components/StatusBadge";
import { HorasBadge } from "@/components/HorasBadge";
import { FilterDialog } from "@/components/FilterDialog";
import { EditHoursDialog } from "@/components/EditHoursDialog";
import { PDFManager } from "@/components/PDFManager";
import { ObservationsManager } from "@/components/ObservationsManager";
import { ArquivoDigitalFixed } from "@/components/ArquivoDigitalFixed";
import { Beneficiario, FiltrosAplicados } from "@/types/employee";
import { useBeneficiarios } from "@/hooks/useBeneficiarios";

const Index = () => {
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { beneficiarios, loading, fetchBeneficiarios, createBeneficiario, deleteBeneficiario } = useBeneficiarios();
  const [busca, setBusca] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Beneficiario | null>(null);
  const [isEditHoursOpen, setIsEditHoursOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [beneficiarioToDelete, setBeneficiarioToDelete] = useState<Beneficiario | null>(null);
  const [filters, setFilters] = useState<FiltrosAplicados>({
    status: null,
    horasMin: null,
    dataInicio: null,
    dataFim: null,
  });

  const handleCreateEmployee = async (data: Parameters<typeof createBeneficiario>[0]) => {
    const result = await createBeneficiario(data);
    if (result.success) {
      setIsFormOpen(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      // O redirecionamento será feito automaticamente pelo ProtectedRoute
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteClick = (beneficiario: Beneficiario, event: React.MouseEvent) => {
    event.stopPropagation(); // Previne que o clique abra o dialog de detalhes
    setBeneficiarioToDelete(beneficiario);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!beneficiarioToDelete) return;
    
    const result = await deleteBeneficiario(beneficiarioToDelete.id);
    if (result.success) {
      setIsDeleteDialogOpen(false);
      setBeneficiarioToDelete(null);
    }
  };

  const beneficiariosFiltrados = useMemo(() => {
    return beneficiarios.filter((b) => {
      const termoBusca = busca.toLowerCase().trim();
      
      // Busca principal por nome (prioritária)
      const matchNome = !termoBusca || b.nome.toLowerCase().includes(termoBusca);
      
      // Busca secundária por processo e local (se não encontrar por nome)
      const matchSecundario = !termoBusca || 
        b.numeroProcesso.toLowerCase().includes(termoBusca) ||
        b.localLotacao.toLowerCase().includes(termoBusca);

      const matchBusca = matchNome || matchSecundario;

      // Filtros adicionais
      const matchStatus = !filters.status || b.statusVida === filters.status;
      const matchHoras = !filters.horasMin || b.horasRestantes >= filters.horasMin;
      
      let matchData = true;
      if (filters.dataInicio || filters.dataFim) {
        const dataRec = new Date(b.dataRecebimento);
        if (filters.dataInicio) {
          matchData = matchData && dataRec >= new Date(filters.dataInicio);
        }
        if (filters.dataFim) {
          matchData = matchData && dataRec <= new Date(filters.dataFim);
        }
      }

      return matchBusca && matchStatus && matchHoras && matchData;
    }).sort((a, b) => {
      // Se há busca ativa, priorizar resultados que começam com o termo
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        const aStartsWith = a.nome.toLowerCase().startsWith(termo);
        const bStartsWith = b.nome.toLowerCase().startsWith(termo);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
      }
      
      // Ordenação alfabética padrão
      return a.nome.localeCompare(b.nome);
    });
  }, [beneficiarios, busca, filters]);


  const baseUrl = import.meta.env.BASE_URL || '/';
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="header-gradient border-b shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-6">
              <img 
                src={`${baseUrl}logo_semed_red.PNG`} 
                alt="Logo NGPRC" 
                className="flex-shrink-0 object-contain rounded-lg"
                style={{ 
                  backgroundColor: '#3A4F66',
                  width: '200px',
                  height: '200px',
                  padding: '1px'
                }}
              />
              <div className="text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  Sistema de Controle de Beneficiários
                </h1>
                <p className="text-sm md:text-lg text-white/90 mt-2">
                  Gestão diária de registros e frequências - Prefeitura Municipal de Nossa Senhora do Socorro
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <ArquivoDigitalFixed />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Saindo..." : "Sair"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Barra de Busca e Ações */}
        <Card className="card-elevated p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="🔍 Pesquisar por nome do beneficiário..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 border-subtle focus:ring-primary"
                aria-label="Buscar beneficiários por nome"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsFilterOpen(true)}
                className="border-subtle hover:bg-muted/50"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
              <Button 
                onClick={() => setIsFormOpen(true)} 
                className="button-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Registro
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabela de Beneficiários */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Registros de Beneficiários</h2>
          <p className="text-muted text-sm">Gerencie os registros dos beneficiários do programa</p>
        </div>
        <Card className="card-elevated">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-4">Foto</th>
                  <th className="text-left p-4">Nome</th>
                  <th className="text-left p-4">Nº Processo</th>
                  <th className="text-left p-4">Local de Lotação</th>
                  <th className="text-left p-4">Data Recebimento</th>
                  <th className="text-left p-4">Horas Cumpridas</th>
                  <th className="text-left p-4">Horas Restantes</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : beneficiariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-muted-foreground">
                      {busca || filters.status || filters.horasMin ? "Nenhum resultado encontrado" : "Nenhum registro cadastrado"}
                    </td>
                  </tr>
                ) : (
                  beneficiariosFiltrados.map((beneficiario) => (
                    <tr
                      key={beneficiario.id}
                      className="table-row cursor-pointer"
                      onClick={() => setSelectedEmployee(beneficiario)}
                    >
                      <td className="p-4">
                        <img
                          src={beneficiario.fotoUrl}
                          alt={`Foto de ${beneficiario.nome}`}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(beneficiario.nome);
                          }}
                        />
                      </td>
                      <td className="p-4 font-medium text-foreground">{beneficiario.nome}</td>
                      <td className="p-4 text-muted-foreground">{beneficiario.numeroProcesso}</td>
                      <td className="p-4 text-muted-foreground">{beneficiario.localLotacao}</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(beneficiario.dataRecebimento).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        <span className="font-medium">{beneficiario.horasCumpridas}h</span>
                      </td>
                      <td className="p-4">
                        <HorasBadge horas={beneficiario.horasRestantes} />
                      </td>
                      <td className="p-4">
                        <StatusBadge status={beneficiario.statusVida} />
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            Ver detalhes
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => handleDeleteClick(beneficiario, e)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Excluir beneficiário"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Total de Registros */}
        <div className="flex justify-end mt-6">
          <Card className="stats-card">
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">{beneficiarios.length}</div>
              <div className="text-base text-muted">Total de Registros</div>
            </div>
          </Card>
        </div>

      </main>

      {/* Dialog Formulário */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Novo Registro de Beneficiário</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            onSubmit={handleCreateEmployee}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Beneficiário</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <img
                  src={selectedEmployee.fotoUrl}
                  alt={selectedEmployee.nome}
                  className="w-24 h-24 rounded-lg object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(selectedEmployee.nome);
                  }}
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{selectedEmployee.nome}</h3>
                  <p className="text-muted-foreground">
                    Processo: {selectedEmployee.numeroProcesso}
                  </p>
                  <p className="text-muted-foreground">
                    Local de Lotação: {selectedEmployee.localLotacao}
                  </p>
                  <p className="text-muted-foreground">
                    Data de Recebimento: {new Date(selectedEmployee.dataRecebimento).toLocaleDateString("pt-BR")}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <StatusBadge status={selectedEmployee.statusVida} />
                    <HorasBadge horas={selectedEmployee.horasRestantes} />
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Horas Cumpridas: <span className="font-medium text-foreground">{selectedEmployee.horasCumpridas}h</span>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditHoursOpen(true)}
                        className="h-6 px-2 text-xs"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Horas Restantes: <span className="font-medium text-foreground">{selectedEmployee.horasRestantes}h</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Documentos PDF */}
              <div className="pt-4 border-t">
                <PDFManager
                  beneficiarioId={selectedEmployee.id}
                  documentos={selectedEmployee.documentosPDF}
                  onUpdate={fetchBeneficiarios}
                />
              </div>
              
              {/* Observações */}
              <div className="pt-4 border-t">
                <ObservationsManager
                  beneficiarioId={selectedEmployee.id}
                  observacoes={selectedEmployee.observacoes}
                  onUpdate={fetchBeneficiarios}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Filtros */}
      <FilterDialog
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        onApplyFilters={setFilters}
      />

      {/* Dialog Editar Horas */}
      <EditHoursDialog
        open={isEditHoursOpen}
        onOpenChange={setIsEditHoursOpen}
        beneficiario={selectedEmployee}
        onUpdate={fetchBeneficiarios}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Tem certeza que deseja excluir o beneficiário <strong>{beneficiarioToDelete?.nome}</strong>?
            </p>
            <p className="text-sm text-red-600 mt-2">
              Esta ação não pode ser desfeita. Todos os dados relacionados (observações, frequências, documentos) também serão excluídos.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Index;
