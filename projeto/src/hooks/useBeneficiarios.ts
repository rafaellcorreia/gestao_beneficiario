import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Beneficiario, DocumentoPDF, Observacao } from "@/types/employee";
import { calcularHorasRestantes } from "@/lib/validations";
import { toast } from "sonner";

export function useBeneficiarios() {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBeneficiarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("beneficiarios")
        .select("*")
        .order("nome", { ascending: true }); // Ordenar alfabeticamente

      if (error) throw error;

      // Buscar documentos PDF para cada beneficiário
      const beneficiariosComDocumentos = await Promise.all(
        (data || []).map(async (b) => {
          // Buscar documentos PDF
          const { data: documentosData } = await supabase
            .from("documentos_pdf")
            .select("*")
            .eq("beneficiario_id", b.id)
            .order("data_anexacao", { ascending: false });

          const documentosPDF: DocumentoPDF[] = (documentosData || []).map((doc) => ({
            id: doc.id,
            nome: doc.nome,
            url: doc.url,
            tipo: doc.tipo,
            dataAnexacao: new Date(doc.data_anexacao),
            usuario: doc.usuario,
          }));

          // Buscar observações
          const { data: observacoesData } = await supabase
            .from("observacoes")
            .select("*")
            .eq("beneficiario_id", b.id)
            .order("timestamp", { ascending: false });

          const observacoes: Observacao[] = (observacoesData || []).map((obs) => ({
            id: obs.id,
            autor: obs.autor,
            texto: obs.texto,
            timestamp: new Date(obs.timestamp),
            anexoUrl: obs.anexo_url,
            editavel: true,
          }));

          return {
            id: b.id,
            nome: b.nome,
            fotoUrl: b.foto_url,
            numeroProcesso: b.numero_processo,
            dataRecebimento: new Date(b.data_recebimento),
            horasCumpridas: b.horas_cumpridas || 0,
            horasRestantes: b.horas_restantes || 0,
            frequencias: [], // Array vazio por enquanto
            statusVida: b.status_vida as any,
            observacoes,
            localLotacao: b.local_lotacao || 'Não informado',
            frequenciaPDFUrl: b.frequencia_pdf_url,
            documentacaoPDFUrl: b.documentacao_pdf_url,
            documentosPDF,
            atributos: b.atributos ? JSON.parse(JSON.stringify(b.atributos)) : undefined,
            criadoEm: new Date(b.criado_em),
            atualizadoEm: new Date(b.atualizado_em),
            criadoPor: b.criado_por,
            atualizadoPor: b.atualizado_por,
          };
        })
      );

      setBeneficiarios(beneficiariosComDocumentos);
    } catch (error: any) {
      console.error("Erro ao buscar beneficiários:", error);
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiarios();
  }, []);

  const createBeneficiario = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return { success: false, error: "User not authenticated" };
      }

      console.log('Iniciando criação de beneficiário:', { nome: data.nome, temFoto: !!data.foto, temFrequenciaPDF: !!data.frequenciaPDF, temDocumentacaoPDF: !!data.documentacaoPDF });

      // Upload da foto se existir
      let fotoUrl = data.fotoPreview;
      if (data.foto && data.foto instanceof File) {
        try {
          const fileExt = data.foto.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}.${fileExt}`;
          console.log('Fazendo upload da foto:', fileName);
          
          const { error: uploadError } = await supabase.storage
            .from('beneficiarios-fotos')
            .upload(fileName, data.foto);
          
          if (uploadError) {
            console.warn('Erro no upload da foto, usando preview:', uploadError);
            toast.warning('Erro no upload da foto, usando preview local');
            // Usar a URL de preview como fallback
            fotoUrl = data.fotoPreview;
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('beneficiarios-fotos')
              .getPublicUrl(fileName);
            
            fotoUrl = publicUrl;
            console.log('Foto enviada com sucesso:', fotoUrl);
          }
        } catch (error) {
          console.warn('Erro no upload da foto, usando preview:', error);
          toast.warning('Erro no upload da foto, usando preview local');
          fotoUrl = data.fotoPreview;
        }
      }

      // Upload dos PDFs se existirem
      let frequenciaPdfUrl = null;
      let documentacaoPdfUrl = null;

      if (data.frequenciaPDF && data.frequenciaPDF instanceof File) {
        try {
          const fileExt = data.frequenciaPDF.name.split('.').pop();
          const fileName = `${user.id}-frequencia-${Date.now()}.${fileExt}`;
          console.log('Fazendo upload do PDF de frequência:', fileName);
          
          const { error: uploadError } = await supabase.storage
            .from('beneficiarios-documentos')
            .upload(fileName, data.frequenciaPDF);
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('beneficiarios-documentos')
              .getPublicUrl(fileName);
            frequenciaPdfUrl = publicUrl;
            console.log('PDF de frequência enviado com sucesso:', frequenciaPdfUrl);
          } else {
            console.warn('Erro no upload do PDF de frequência:', uploadError);
            toast.warning('Erro no upload do PDF de frequência. Registro será salvo sem o documento.');
          }
        } catch (error) {
          console.warn('Erro no upload do PDF de frequência:', error);
          toast.warning('Erro no upload do PDF de frequência. Registro será salvo sem o documento.');
        }
      }

      if (data.documentacaoPDF && data.documentacaoPDF instanceof File) {
        try {
          const fileExt = data.documentacaoPDF.name.split('.').pop();
          const fileName = `${user.id}-documentacao-${Date.now()}.${fileExt}`;
          console.log('Fazendo upload do PDF de documentação:', fileName);
          
          const { error: uploadError } = await supabase.storage
            .from('beneficiarios-documentos')
            .upload(fileName, data.documentacaoPDF);
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('beneficiarios-documentos')
              .getPublicUrl(fileName);
            documentacaoPdfUrl = publicUrl;
            console.log('PDF de documentação enviado com sucesso:', documentacaoPdfUrl);
          } else {
            console.warn('Erro no upload do PDF de documentação:', uploadError);
            toast.warning('Erro no upload do PDF de documentação. Registro será salvo sem o documento.');
          }
        } catch (error) {
          console.warn('Erro no upload do PDF de documentação:', error);
          toast.warning('Erro no upload do PDF de documentação. Registro será salvo sem o documento.');
        }
      }

      console.log('Inserindo beneficiário no banco de dados...');
      
      const { data: newBenef, error } = await supabase.from("beneficiarios").insert({
        user_id: user.id,
        nome: data.nome,
        foto_url: fotoUrl,
        numero_processo: data.numeroProcesso,
        data_recebimento: data.dataRecebimento,
        status_vida: data.statusVida,
        local_lotacao: data.localLotacao,
        horas_cumpridas: data.horasCumpridas,
        horas_restantes: data.horasRestantes,
        frequencia_pdf_url: frequenciaPdfUrl,
        documentacao_pdf_url: documentacaoPdfUrl,
        criado_por: "Sistema",
        atualizado_por: "Sistema",
      }).select("id").single();

      if (error) {
        console.error('Erro ao inserir beneficiário:', error);
        throw error;
      }

      console.log('Beneficiário inserido com sucesso:', newBenef?.id);

      if (data.observacaoInicial && newBenef) {
        try {
          console.log('Inserindo observação inicial...');
          await supabase.from("observacoes").insert({
            beneficiario_id: newBenef.id,
            autor: "Sistema",
            texto: data.observacaoInicial,
          });
          console.log('Observação inserida com sucesso');
        } catch (obsError) {
          console.warn('Erro ao inserir observação (não crítico):', obsError);
        }
      }

      await fetchBeneficiarios();
      toast.success("Registro salvo com sucesso!");
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao criar beneficiário:", error);
      
      // Tratamento específico de erros
      let errorMessage = "Erro desconhecido ao salvar";
      
      if (error.message?.includes("bucket")) {
        errorMessage = "Erro de configuração de armazenamento. Verifique as configurações.";
      } else if (error.message?.includes("policy")) {
        errorMessage = "Erro de permissão. Verifique as configurações de acesso.";
      } else if (error.message?.includes("relation")) {
        errorMessage = "Erro de banco de dados. Tabela não encontrada.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error("Erro ao salvar: " + errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteBeneficiario = async (id: string) => {
    try {
      const { error } = await supabase
        .from("beneficiarios")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchBeneficiarios();
      toast.success("Beneficiário excluído com sucesso!");
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao excluir beneficiário:", error);
      toast.error("Erro ao excluir beneficiário: " + error.message);
      return { success: false, error: error.message };
    }
  };

  return {
    beneficiarios,
    loading,
    fetchBeneficiarios,
    createBeneficiario,
    deleteBeneficiario,
  };
}
