import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Upload, Trash2, Plus } from "lucide-react";
import { DocumentoPDF } from "@/types/employee";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PDFManagerProps {
  beneficiarioId: string;
  documentos: DocumentoPDF[];
  onUpdate: () => void;
}

export function PDFManager({ beneficiarioId, documentos, onUpdate }: PDFManagerProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'frequencia' | 'documentacao'>('frequencia');
  const [isUploading, setIsUploading] = useState(false);
  const [documentosList, setDocumentosList] = useState<DocumentoPDF[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar documentos do banco (sempre busca diretamente, ignora prop)
  // Usando useCallback para memoizar e evitar recriações desnecessárias
  const fetchDocumentos = useCallback(async () => {
    if (!beneficiarioId) {
      console.log('⚠️ fetchDocumentos: beneficiarioId não fornecido');
      setDocumentosList([]);
      setError(null);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 === BUSCANDO DOCUMENTOS PDF DO BANCO ===');
      console.log('📋 Beneficiário ID:', beneficiarioId);
      
      // Verificar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Erro de autenticação:', authError);
        setError('Usuário não autenticado');
        setDocumentosList([]);
        return;
      }
      console.log('✅ Usuário autenticado:', user.email);
      
      // Buscar documentos do banco
      // Buscar todos os campos e ordenar pela data mais recente (data_anexacao ou criado_em)
      const { data: documentosData, error: queryError } = await supabase
        .from('documentos_pdf')
        .select('*')
        .eq('beneficiario_id', beneficiarioId)
        .order('data_anexacao', { ascending: false });

      if (queryError) {
        console.error('❌ === ERRO AO BUSCAR DOCUMENTOS ===');
        console.error('Código do erro:', queryError.code);
        console.error('Mensagem do erro:', queryError.message);
        console.error('Detalhes do erro:', queryError.details);
        console.error('Hint do erro:', queryError.hint);
        setError(`Erro ao buscar documentos: ${queryError.message}`);
        setDocumentosList([]);
        return;
      }

      console.log('✅ Documentos encontrados no banco:', documentosData?.length || 0);
      if (documentosData && documentosData.length > 0) {
        console.log('📄 Dados dos documentos:', JSON.stringify(documentosData, null, 2));
      } else {
        console.log('⚠️ Nenhum documento encontrado para este beneficiário');
      }

      const documentosPDF: DocumentoPDF[] = (documentosData || []).map((doc) => {
        // Usar data_anexacao se existir, senão usar criado_em, senão usar data atual
        const dataAnexacao = doc.data_anexacao 
          ? new Date(doc.data_anexacao) 
          : (doc.criado_em ? new Date(doc.criado_em) : new Date());
        
        console.log('🔄 Mapeando documento:', {
          id: doc.id,
          nome: doc.nome,
          tipo: doc.tipo,
          url: doc.url?.substring(0, 50) + '...',
          dataAnexacao: dataAnexacao.toISOString(),
          usuario: doc.usuario
        });
        
        return {
          id: doc.id,
          nome: doc.nome,
          url: doc.url,
          tipo: doc.tipo,
          dataAnexacao: dataAnexacao,
          usuario: doc.usuario || 'Usuário desconhecido',
        };
      });

      console.log('✅ Documentos mapeados com sucesso:', documentosPDF.length);
      setDocumentosList(documentosPDF);
      setError(null);
    } catch (error) {
      console.error('❌ === ERRO COMPLETO AO BUSCAR DOCUMENTOS ===');
      console.error('Erro:', error);
      setError(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setDocumentosList([]);
    } finally {
      setLoading(false);
    }
  }, [beneficiarioId]);

  // Buscar documentos quando o componente é montado ou beneficiarioId muda
  // SEMPRE busca do banco, ignora a prop 'documentos' que pode estar desatualizada
  useEffect(() => {
    if (beneficiarioId) {
      console.log('🔄 PDFManager: Beneficiário ID mudou, buscando documentos...', beneficiarioId);
      fetchDocumentos();
    } else {
      setDocumentosList([]);
      setError(null);
    }
  }, [beneficiarioId, fetchDocumentos]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadingFile(file);
    } else {
      toast.error("Por favor, selecione apenas arquivos PDF");
    }
  };

  const handleUpload = async () => {
    if (!uploadingFile) return;

    try {
      setIsUploading(true);
      console.log('=== INICIANDO UPLOAD DE PDF ===');
      console.log('Beneficiário ID:', beneficiarioId);
      console.log('Tipo:', uploadType);
      console.log('Arquivo:', uploadingFile.name, 'Tamanho:', uploadingFile.size);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Erro de autenticação:', authError);
        toast.error("Usuário não autenticado");
        return;
      }

      console.log('Usuário autenticado:', user.email);

      const fileExt = uploadingFile.name.split('.').pop();
      const fileName = `${user.id}-${uploadType}-${Date.now()}.${fileExt}`;
      console.log('Nome do arquivo no storage:', fileName);
      
      // Upload do arquivo
      console.log('Fazendo upload para o storage...');
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('beneficiarios-documentos')
        .upload(fileName, uploadingFile);
      
      if (uploadError) {
        console.error('Erro no upload do storage:', uploadError);
        throw uploadError;
      }

      console.log('Upload do storage concluído:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('beneficiarios-documentos')
        .getPublicUrl(fileName);

      console.log('URL pública gerada:', publicUrl);

      // Salvar referência no banco
      console.log('💾 Salvando referência no banco de dados...');
      const agora = new Date().toISOString();
      const documentoData = {
        beneficiario_id: beneficiarioId,
        nome: uploadingFile.name,
        url: publicUrl,
        tipo: uploadType,
        usuario: user.email || user.id || 'Usuário desconhecido',
        data_anexacao: agora,
        criado_em: agora,
        atualizado_em: agora,
      };
      
      console.log('📋 Dados do documento a inserir:', JSON.stringify(documentoData, null, 2));
      
      const { data: insertedData, error: dbError } = await supabase
        .from('documentos_pdf')
        .insert(documentoData)
        .select()
        .single();

      if (dbError) {
        console.error('=== ERRO AO SALVAR NO BANCO ===');
        console.error('Código do erro:', dbError.code);
        console.error('Mensagem do erro:', dbError.message);
        console.error('Detalhes do erro:', dbError.details);
        console.error('Hint do erro:', dbError.hint);
        throw dbError;
      }

      console.log('Documento salvo no banco com sucesso:', insertedData);

      // Atualizar atalho no registro do beneficiário (opcional)
      const colunaAtalho = uploadType === 'frequencia' ? 'frequencia_pdf_url' : 'documentacao_pdf_url';
      const { error: updErr } = await supabase
        .from('beneficiarios')
        .update({ [colunaAtalho]: publicUrl })
        .eq('id', beneficiarioId);
      if (updErr) {
        console.warn('Aviso: Falha ao atualizar atalho de PDF no beneficiário (não crítico):', updErr);
      } else {
        console.log('Atalho de PDF atualizado no beneficiário');
      }

      toast.success("PDF enviado com sucesso!");
      setIsUploadOpen(false);
      setUploadingFile(null);
      
      // Atualizar lista de documentos IMEDIATAMENTE
      console.log('🔄 Atualizando lista de documentos após upload...');
      await fetchDocumentos();
      console.log('✅ Lista de documentos atualizada');
      
      // Atualizar lista de beneficiários
      console.log('🔄 Atualizando lista de beneficiários...');
      await onUpdate();
      
      // Buscar documentos novamente após atualizar beneficiários para garantir sincronização
      console.log('🔄 Re-buscando documentos após atualizar beneficiários...');
      await fetchDocumentos();
      console.log('✅ === UPLOAD CONCLUÍDO COM SUCESSO ===');
    } catch (error: unknown) {
      console.error("=== ERRO COMPLETO AO FAZER UPLOAD ===");
      console.error("Erro:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao fazer upload: " + errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentoId: string, fileName: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    try {
      // Extrair o nome do arquivo da URL para deletar do storage
      const urlParts = fileName.split('/');
      const storageFileName = urlParts[urlParts.length - 1];

      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('beneficiarios-documentos')
        .remove([storageFileName]);

      if (storageError) {
        console.warn("Erro ao deletar do storage:", storageError);
      }

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('documentos_pdf')
        .delete()
        .eq('id', documentoId);

      if (dbError) {
        throw dbError;
      }

      toast.success("Documento excluído com sucesso!");
      
      // Atualizar lista de documentos IMEDIATAMENTE
      console.log('🔄 Atualizando lista de documentos após exclusão...');
      await fetchDocumentos();
      console.log('✅ Lista de documentos atualizada');
      
      // Atualizar lista de beneficiários
      console.log('🔄 Atualizando lista de beneficiários...');
      await onUpdate();
      
      // Buscar documentos novamente após atualizar beneficiários para garantir sincronização
      console.log('🔄 Re-buscando documentos após atualizar beneficiários...');
      await fetchDocumentos();
      console.log('✅ === EXCLUSÃO CONCLUÍDA COM SUCESSO ===');
    } catch (error: unknown) {
      console.error("Erro ao excluir documento:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao excluir documento: " + errorMessage);
    }
  };

  // Ordenar documentos por data de anexação (mais recente primeiro)
  // Já vem ordenado do banco, mas garantimos aqui também
  const documentosOrdenados = [...documentosList].sort((a, b) => {
    const dataA = a.dataAnexacao?.getTime() || 0;
    const dataB = b.dataAnexacao?.getTime() || 0;
    return dataB - dataA;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">Documentos PDF ({documentosList.length})</h4>
          {loading && (
            <span className="text-xs text-muted-foreground">Carregando...</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('🔄 Botão atualizar clicado, buscando documentos...');
              fetchDocumentos();
            }}
            disabled={loading}
            title="Atualizar lista de documentos"
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? 'Carregando...' : 'Atualizar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocumentos}
            className="mt-2"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {loading && documentosList.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Carregando documentos...</p>
        </div>
      ) : documentosOrdenados.length > 0 ? (
        <div className="space-y-2">
          {documentosOrdenados.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className={`h-5 w-5 shrink-0 ${doc.tipo === 'frequencia' ? 'text-blue-600' : 'text-green-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={doc.nome}>{doc.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {doc.tipo === 'frequencia' ? '📋 Frequência' : '📄 Documentação'}
                    </span>
                    {' • '}
                    <span>{new Date(doc.dataAnexacao).toLocaleDateString("pt-BR", { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                    {' • '}
                    <span>{doc.usuario}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(doc.url, '_blank')}
                  title="Visualizar PDF"
                >
                  Visualizar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id, doc.url)}
                  className="text-red-600 hover:text-red-700"
                  title="Excluir documento"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground font-medium">Nenhum documento anexado</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Adicionar PDF" para anexar um documento</p>
        </div>
      ) : null}

      {/* Dialog de Upload */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo PDF</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tipo">Tipo de Documento</Label>
              <select
                id="tipo"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as 'frequencia' | 'documentacao')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="frequencia">Frequência</option>
                <option value="documentacao">Documentação</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arquivo">Arquivo PDF</Label>
              <Input
                id="arquivo"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
              />
              {uploadingFile && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {uploadingFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!uploadingFile || isUploading}
            >
              {isUploading ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
