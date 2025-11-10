import { useState, useEffect } from "react";
import { FileText, Upload, Download, Trash2, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ArquivoDigital {
  id: string;
  nome: string;
  descricao?: string;
  arquivo_url: string;
  tipo_arquivo: string;
  tamanho?: number;
  ano: number;
  mes?: number;
  categoria?: string;
  tags?: string[];
  usuario_upload: string;
  criado_em: string;
}

export function ArquivoDigitalFixed() {
  const [arquivos, setArquivos] = useState<ArquivoDigital[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [filtroAno, setFiltroAno] = useState<number>(new Date().getFullYear());
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");

  // Estados do formulário de upload
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    categoria: "nao-selecionado",
    tags: "",
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
  });

  const categorias = [
    "Relatórios",
    "Documentos",
    "Imagens",
    "Planilhas",
    "Apresentações",
    "Outros"
  ];

  const anos = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchArquivos();
  }, [filtroAno, filtroCategoria]);

  const fetchArquivos = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('arquivos_digitais')
        .select('*')
        .eq('ano', filtroAno)
        .order('criado_em', { ascending: false });

      if (filtroCategoria && filtroCategoria !== 'todas') {
        query = query.eq('categoria', filtroCategoria);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Erro ao buscar arquivos (tabela pode não existir ainda):', error);
        setArquivos([]);
        return;
      }

      setArquivos(data || []);
    } catch (error: unknown) {
      console.error('Erro ao buscar arquivos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao buscar arquivos: ' + errorMessage);
      setArquivos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingFile(file);
      setFormData(prev => ({
        ...prev,
        nome: file.name.split('.')[0] || file.name
      }));
    }
  };

  const handleUpload = async () => {
    if (!uploadingFile) {
      toast.error("Selecione um arquivo");
      return;
    }

    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const fileExt = uploadingFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      // Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('arquivos-digitais')
        .upload(fileName, uploadingFile);
      
      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('arquivos-digitais')
        .getPublicUrl(fileName);

      // Salvar referência no banco
      const { error: dbError } = await supabase
        .from('arquivos_digitais')
        .insert({
          nome: formData.nome,
          descricao: formData.descricao,
          arquivo_url: publicUrl,
          tipo_arquivo: uploadingFile.type || 'application/octet-stream',
          tamanho: uploadingFile.size,
          ano: formData.ano,
          mes: formData.mes,
          categoria: formData.categoria === "nao-selecionado" ? null : formData.categoria,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
          usuario_upload: user.email || 'Usuário',
        });

      if (dbError) {
        throw dbError;
      }

      toast.success("Arquivo enviado com sucesso!");
      setIsUploadOpen(false);
      setUploadingFile(null);
      setFormData({
        nome: "",
        descricao: "",
        categoria: "nao-selecionado",
        tags: "",
        ano: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
      });
      fetchArquivos();
    } catch (error: unknown) {
      console.error('Erro no upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error("Erro ao enviar arquivo: " + errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, arquivoUrl: string) => {
    if (!confirm("Tem certeza que deseja excluir este arquivo?")) {
      return;
    }

    try {
      // Extrair nome do arquivo da URL
      const fileName = arquivoUrl.split('/').pop();
      
      // Deletar do storage
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('arquivos-digitais')
          .remove([fileName]);

        if (storageError) {
          console.warn('Erro ao deletar do storage:', storageError);
        }
      }

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('arquivos_digitais')
        .delete()
        .eq('id', id);

      if (dbError) {
        throw dbError;
      }

      toast.success("Arquivo excluído com sucesso!");
      fetchArquivos();
    } catch (error: unknown) {
      console.error('Erro ao excluir arquivo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error("Erro ao excluir arquivo: " + errorMessage);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const arquivosFiltrados = arquivos.filter(arquivo => {
    const matchBusca = !busca || 
      arquivo.nome.toLowerCase().includes(busca.toLowerCase()) ||
      arquivo.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      arquivo.tags?.some(tag => tag.toLowerCase().includes(busca.toLowerCase()));
    
    return matchBusca;
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          Arquivo Digital
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Arquivo Digital
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filtro-ano">Ano</Label>
                <Select value={(filtroAno || new Date().getFullYear()).toString()} onValueChange={(value) => setFiltroAno(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map(ano => (
                      <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filtro-categoria">Categoria</Label>
                <Select value={filtroCategoria || "todas"} onValueChange={setFiltroCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as categorias</SelectItem>
                    {categorias.map(categoria => (
                      <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="busca">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="busca"
                    placeholder="Buscar arquivos..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Novo Arquivo
              </Button>
            </div>
          </Card>

          {/* Lista de Arquivos */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Arquivos ({arquivosFiltrados.length})
              </h3>
              <Badge variant="outline">
                {filtroAno}
              </Badge>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando arquivos...</p>
              </div>
            ) : arquivosFiltrados.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {busca || (filtroCategoria && filtroCategoria !== 'todas') ? "Nenhum arquivo encontrado" : "Nenhum arquivo cadastrado para este ano"}
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {arquivosFiltrados.map((arquivo) => (
                  <Card key={arquivo.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{arquivo.nome}</h4>
                          {arquivo.categoria && (
                            <Badge variant="secondary">{arquivo.categoria}</Badge>
                          )}
                        </div>
                        
                        {arquivo.descricao && (
                          <p className="text-sm text-muted-foreground mb-2">{arquivo.descricao}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>Tamanho: {formatFileSize(arquivo.tamanho)}</span>
                          <span>Ano: {arquivo.ano}</span>
                          {arquivo.mes && <span>Mês: {arquivo.mes}</span>}
                          <span>Enviado por: {arquivo.usuario_upload}</span>
                          <span>
                            {new Date(arquivo.criado_em).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        {arquivo.tags && arquivo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {arquivo.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(arquivo.arquivo_url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = arquivo.arquivo_url;
                            link.download = arquivo.nome;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(arquivo.id, arquivo.arquivo_url)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal de Upload */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enviar Novo Arquivo</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="arquivo">Arquivo</Label>
                <Input
                  id="arquivo"
                  type="file"
                  onChange={handleFileSelect}
                  accept="*/*"
                />
                {uploadingFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Arquivo selecionado: {uploadingFile.name} ({formatFileSize(uploadingFile.size)})
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="nome">Nome do Arquivo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do arquivo"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição do arquivo (opcional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select value={formData.categoria || "nao-selecionado"} onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao-selecionado">Selecione uma categoria</SelectItem>
                      {categorias.map(categoria => (
                        <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ano">Ano</Label>
                  <Select value={(formData.ano || new Date().getFullYear()).toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, ano: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {anos.map(ano => (
                        <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mes">Mês (opcional)</Label>
                  <Select value={formData.mes === 0 ? "nao-especificar" : (formData.mes || 1).toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, mes: value === "nao-especificar" ? 0 : parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao-especificar">Não especificar</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                        <SelectItem key={mes} value={mes.toString()}>
                          {new Date(2024, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="ex: importante, relatorio, mensal"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={!uploadingFile || !formData.nome.trim() || isUploading}
                >
                  {isUploading ? "Enviando..." : "Enviar Arquivo"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

