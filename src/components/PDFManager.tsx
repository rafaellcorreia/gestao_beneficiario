import { useState, useEffect } from "react";
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
  const [documentosList, setDocumentosList] = useState<DocumentoPDF[]>(documentos);
  const [loading, setLoading] = useState(false);

  // Função para buscar documentos do banco
  const fetchDocumentos = async () => {
    if (!beneficiarioId) {
      console.log('fetchDocumentos: beneficiarioId não fornecido');
      setDocumentosList([]);
      return;
    }
    
    try {
      setLoading(true);
      console.log('=== BUSCANDO DOCUMENTOS PDF ===');
      console.log('Beneficiário ID:', beneficiarioId);
      
      const { data: documentosData, error } = await supabase
        .from('documentos_pdf')
        .select('*')
        .eq('beneficiario_id', beneficiarioId)
        .order('data_anexacao', { ascending: false });

      if (error) {
        console.error('=== ERRO AO BUSCAR DOCUMENTOS ===');
        console.error('Código do erro:', error.code);
        console.error('Mensagem do erro:', error.message);
        console.error('Detalhes do erro:', error.details);
        setDocumentosList([]);
        return;
      }

      console.log('Documentos encontrados:', documentosData?.length || 0);
      console.log('Dados dos documentos:', documentosData);

      const documentosPDF: DocumentoPDF[] = (documentosData || []).map((doc) => {
        console.log('Mapeando documento:', doc);
        return {
          id: doc.id,
          nome: doc.nome,
          url: doc.url,
          tipo: doc.tipo,
          dataAnexacao: new Date(doc.data_anexacao),
          usuario: doc.usuario,
        };
      });

      console.log('Documentos mapeados:', documentosPDF.length);
      setDocumentosList(documentosPDF);
    } catch (error) {
      console.error('=== ERRO COMPLETO AO BUSCAR DOCUMENTOS ===');
      console.error('Erro:', error);
      setDocumentosList([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar documentos quando o componente é montado ou beneficiarioId muda
  useEffect(() => {
    fetchDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beneficiarioId]);

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
      console.log('Salvando referência no banco de dados...');
      const documentoData = {
        beneficiario_id: beneficiarioId,
        nome: uploadingFile.name,
        url: publicUrl,
        tipo: uploadType,
        usuario: user.email || 'Usuário',
        data_anexacao: new Date().toISOString(),
      };
      
      console.log('Dados do documento a inserir:', documentoData);
      
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
      
      // Atualizar lista de documentos
      console.log('Atualizando lista de documentos...');
      await fetchDocumentos();
      console.log('Lista de documentos atualizada');
      
      // Chamar callback para atualizar dados do beneficiário
      onUpdate();
      console.log('=== UPLOAD CONCLUÍDO COM SUCESSO ===');
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
      // Atualizar lista de documentos
      await fetchDocumentos();
      // Chamar callback para atualizar dados do beneficiário
      onUpdate();
    } catch (error: unknown) {
      console.error("Erro ao excluir documento:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao excluir documento: " + errorMessage);
    }
  };

  // Ordenar documentos por data de anexação (mais recente primeiro)
  const documentosOrdenados = [...documentosList].sort((a, b) => 
    new Date(b.dataAnexacao).getTime() - new Date(a.dataAnexacao).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Documentos PDF ({documentosList.length})</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsUploadOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar PDF
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Carregando documentos...</p>
        </div>
      ) : documentosOrdenados.length > 0 ? (
        <div className="space-y-2">
          {documentosOrdenados.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className={`h-5 w-5 ${doc.tipo === 'frequencia' ? 'text-blue-600' : 'text-green-600'}`} />
                <div>
                  <p className="text-sm font-medium">{doc.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.tipo === 'frequencia' ? 'Frequência' : 'Documentação'} • 
                    {new Date(doc.dataAnexacao).toLocaleDateString("pt-BR")} • 
                    {doc.usuario}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(doc.url, '_blank')}
                >
                  Visualizar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id, doc.url)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum documento anexado</p>
      )}

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
