import { useState } from "react";
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const fileExt = uploadingFile.name.split('.').pop();
      const fileName = `${user.id}-${uploadType}-${Date.now()}.${fileExt}`;
      
      // Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('beneficiarios-documentos')
        .upload(fileName, uploadingFile);
      
      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('beneficiarios-documentos')
        .getPublicUrl(fileName);

      // Salvar referência no banco
      const { error: dbError } = await supabase
        .from('documentos_pdf')
        .insert({
          beneficiario_id: beneficiarioId,
          nome: uploadingFile.name,
          url: publicUrl,
          tipo: uploadType,
          usuario: user.email || 'Usuário',
        });

      if (dbError) {
        throw dbError;
      }

      toast.success("PDF enviado com sucesso!");
      setIsUploadOpen(false);
      setUploadingFile(null);
      onUpdate();
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload: " + error.message);
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
      onUpdate();
    } catch (error: any) {
      console.error("Erro ao excluir documento:", error);
      toast.error("Erro ao excluir documento: " + error.message);
    }
  };

  // Ordenar documentos por data de anexação (mais recente primeiro)
  const documentosOrdenados = [...documentos].sort((a, b) => 
    new Date(b.dataAnexacao).getTime() - new Date(a.dataAnexacao).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Documentos PDF ({documentos.length})</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsUploadOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar PDF
        </Button>
      </div>

      {documentosOrdenados.length > 0 ? (
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
