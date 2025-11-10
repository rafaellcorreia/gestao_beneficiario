import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Beneficiario, DocumentoPDF, Observacao, StatusVida } from "@/types/employee";
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
          console.log(`🔍 Buscando documentos PDF para beneficiário ${b.id} (${b.nome})...`);
          const { data: documentosData, error: documentosError } = await supabase
            .from("documentos_pdf")
            .select("*")
            .eq("beneficiario_id", b.id)
            .order("data_anexacao", { ascending: false });

          if (documentosError) {
            console.error(`❌ Erro ao buscar documentos para beneficiário ${b.id}:`, documentosError);
            console.error('Código do erro:', documentosError.code);
            console.error('Mensagem do erro:', documentosError.message);
          } else {
            console.log(`✅ Documentos encontrados para beneficiário ${b.id}:`, documentosData?.length || 0);
            if (documentosData && documentosData.length > 0) {
              console.log('📄 Detalhes dos documentos:', documentosData.map(d => ({
                id: d.id,
                nome: d.nome,
                tipo: d.tipo,
                beneficiario_id: d.beneficiario_id
              })));
            }
          }

          const documentosPDF: DocumentoPDF[] = (documentosData || []).map((doc) => {
            // Garantir que dataAnexacao seja uma data válida
            const dataAnexacao = doc.data_anexacao 
              ? new Date(doc.data_anexacao) 
              : (doc.criado_em ? new Date(doc.criado_em) : new Date());
            
            return {
              id: doc.id,
              nome: doc.nome,
              url: doc.url,
              tipo: doc.tipo,
              dataAnexacao: dataAnexacao,
              usuario: doc.usuario || 'Usuário desconhecido',
            };
          });
          
          console.log(`✅ Documentos mapeados para beneficiário ${b.id}:`, documentosPDF.length);

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
            telefonePrincipal: b.telefone_principal || undefined,
            telefoneSecundario: b.telefone_secundario || undefined,
            horasCumpridas: b.horas_cumpridas || 0,
            horasRestantes: b.horas_restantes || 0,
            frequencias: [], // Array vazio por enquanto
            statusVida: b.status_vida as StatusVida,
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
    } catch (error: unknown) {
      console.error("Erro ao buscar beneficiários:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao carregar dados: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiarios();
  }, []);

  const createBeneficiario = async (data: {
    nome: string;
    numeroProcesso: string;
    dataRecebimento: Date;
    statusVida: StatusVida;
    localLotacao: string;
    telefonePrincipal?: string;
    telefoneSecundario?: string;
    horasCumpridas: number;
    horasRestantes: number;
    observacaoInicial?: string;
    foto: File;
    fotoPreview: string;
    frequenciaPDF?: File;
    documentacaoPDF?: File;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return { success: false, error: "User not authenticated" };
      }

      console.log('Iniciando criação de beneficiário:', { nome: data.nome, temFoto: !!data.foto, temFrequenciaPDF: !!data.frequenciaPDF, temDocumentacaoPDF: !!data.documentacaoPDF });

      // Checagem de duplicidade (mesmo número de processo ou mesmo nome do usuário atual)
      const { data: existentes, error: dupErr } = await supabase
        .from('beneficiarios')
        .select('id, nome, numero_processo')
        .eq('user_id', user.id)
        .or(`numero_processo.eq.${data.numeroProcesso},nome.ilike.%${data.nome}%`)
        .limit(1);
      if (dupErr) {
        console.warn('Erro ao checar duplicidade:', dupErr);
      }
      if (existentes && existentes.length > 0) {
        toast.error('Já existe um beneficiário com os mesmos dados. Revise antes de confirmar.');
        return { success: false, error: 'duplicado' };
      }

      // Upload da foto se existir
      let fotoUrl = data.fotoPreview || '';
      
      // Validar se há uma foto válida
      if (!fotoUrl && (!data.foto || !(data.foto instanceof File))) {
        toast.error("Por favor, capture ou faça upload de uma foto");
        return { success: false, error: "Foto é obrigatória" };
      }

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
            fotoUrl = data.fotoPreview || '';
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('beneficiarios-fotos')
              .getPublicUrl(fileName);
            
            fotoUrl = publicUrl || data.fotoPreview || '';
            console.log('Foto enviada com sucesso:', fotoUrl);
          }
        } catch (error) {
          console.warn('Erro no upload da foto, usando preview:', error);
          toast.warning('Erro no upload da foto, usando preview local');
          fotoUrl = data.fotoPreview || '';
        }
      }

      // Garantir que fotoUrl nunca esteja vazio
      if (!fotoUrl || fotoUrl.trim() === '') {
        // Usar uma imagem placeholder se não houver foto
        fotoUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.nome)}`;
        console.warn('Usando imagem placeholder para foto');
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
      
      const isoDate = new Date(data.dataRecebimento);
      const dataSql = isNaN(isoDate.getTime()) ? null : isoDate.toISOString().slice(0, 10);

      // Validações finais antes de inserir
      if (!dataSql) {
        toast.error("Data de recebimento inválida");
        return { success: false, error: "Data de recebimento inválida" };
      }

      if (!fotoUrl || fotoUrl.trim() === '') {
        toast.error("Foto é obrigatória");
        return { success: false, error: "Foto é obrigatória" };
      }

      // Preparar dados do beneficiário
      // CÁLCULO CORRETO DE HORAS:
      // 1. Total = cumpridas + restantes (informadas pelo usuário)
      // 2. Horas restantes finais = total - cumpridas (garantir que está correto)
      const horasCumpridas = Number(data.horasCumpridas) || 0;
      const horasRestantesInformadas = Number(data.horasRestantes) || 0;
      
      // Calcular total de horas
      const totalHoras = horasCumpridas + horasRestantesInformadas;
      
      // RECALCULAR horas restantes: sempre = total - cumpridas
      // Isso garante que mesmo se o usuário alterar manualmente, o cálculo estará correto
      const horasRestantes = Math.max(0, totalHoras - horasCumpridas);
      
      console.log('💾 Salvando horas no banco:');
      console.log('  - Horas Cumpridas (informadas):', horasCumpridas);
      console.log('  - Horas Restantes (informadas):', horasRestantesInformadas);
      console.log('  - Total de Horas (calculado):', totalHoras);
      console.log('  - Horas Restantes (recalculadas):', horasRestantes);
      console.log('  - Verificação: Total = Cumpridas + Restantes?', totalHoras, '=', horasCumpridas, '+', horasRestantes, '→', (horasCumpridas + horasRestantes === totalHoras ? '✅ CORRETO' : '❌ ERRO'));

      const beneficiarioDataComTelefones: Record<string, unknown> = {
        user_id: user.id,
        nome: data.nome.trim(),
        foto_url: fotoUrl,
        numero_processo: data.numeroProcesso.trim(),
        data_recebimento: dataSql,
        status_vida: data.statusVida,
        local_lotacao: (data.localLotacao || 'Não informado').trim(),
        horas_cumpridas: horasCumpridas,
        horas_restantes: horasRestantes,
        frequencia_pdf_url: frequenciaPdfUrl || null,
        documentacao_pdf_url: documentacaoPdfUrl || null,
        criado_por: "Sistema",
        atualizado_por: "Sistema",
      };

      // Adicionar telefones se tiverem valor
      if (data.telefonePrincipal?.trim()) {
        beneficiarioDataComTelefones.telefone_principal = data.telefonePrincipal.trim();
      }
      if (data.telefoneSecundario?.trim()) {
        beneficiarioDataComTelefones.telefone_secundario = data.telefoneSecundario.trim();
      }

      console.log('Dados do beneficiário a serem inseridos:', beneficiarioDataComTelefones);
      console.log('User ID:', user.id);
      console.log('User Email:', user.email);

      // Tentar inserir com telefones primeiro
      let { data: newBenef, error } = await supabase.from("beneficiarios").insert(beneficiarioDataComTelefones).select("id").single();

      // Se o erro for relacionado a colunas de telefone não encontradas, tentar sem elas
      if (error && error.message && error.message.includes("could not find") && error.message.includes("telefone")) {
        console.warn('Colunas de telefone não encontradas. Tentando inserir sem esses campos...');
        
        // Criar objeto sem os campos de telefone
        // Recalcular horas também quando inserindo sem telefones (mesma lógica)
        const horasCumpridas = Number(data.horasCumpridas) || 0;
        const horasRestantesInformadas = Number(data.horasRestantes) || 0;
        const totalHoras = horasCumpridas + horasRestantesInformadas;
        // Recalcular horas restantes: sempre = total - cumpridas
        const horasRestantes = Math.max(0, totalHoras - horasCumpridas);
        
        console.log('💾 Salvando horas (sem telefones): Total=', totalHoras, 'Cumpridas=', horasCumpridas, 'Restantes=', horasRestantes);

        const beneficiarioDataSemTelefones: Record<string, unknown> = {
          user_id: user.id,
          nome: data.nome.trim(),
          foto_url: fotoUrl,
          numero_processo: data.numeroProcesso.trim(),
          data_recebimento: dataSql,
          status_vida: data.statusVida,
          local_lotacao: (data.localLotacao || 'Não informado').trim(),
          horas_cumpridas: horasCumpridas,
          horas_restantes: horasRestantes,
          frequencia_pdf_url: frequenciaPdfUrl || null,
          documentacao_pdf_url: documentacaoPdfUrl || null,
          criado_por: "Sistema",
          atualizado_por: "Sistema",
        };

        // Tentar inserir sem os campos de telefone
        const result = await supabase.from("beneficiarios").insert(beneficiarioDataSemTelefones).select("id").single();
        newBenef = result.data;
        error = result.error;

        if (!error) {
          console.log('Beneficiário inserido com sucesso (sem campos de telefone). Aplique a migração para adicionar essas colunas.');
          toast.warning("Beneficiário cadastrado, mas campos de telefone não foram salvos. Execute a migração no Supabase para habilitar esses campos.");
        }
      }

      if (error) {
        console.error('Erro ao inserir beneficiário - Detalhes completos:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          beneficiarioData: beneficiarioDataComTelefones
        });
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
    } catch (error: unknown) {
      console.error("Erro ao criar beneficiário:", error);
      
      // Tratamento específico de erros
      let errorMessage = "Erro desconhecido ao salvar";
      let errorDetails = "";
      
      // Verificar se é um erro do Supabase (tem propriedades code, message, details)
      // O erro do Supabase pode ser um objeto PostgrestError ou um Error padrão
      let supabaseError: { code?: string; message?: string; details?: string; hint?: string } | null = null;
      
      if (error && typeof error === 'object') {
        // Tentar acessar as propriedades do erro do Supabase
        supabaseError = error as { code?: string; message?: string; details?: string; hint?: string };
        
        // Log completo do erro para debug
        console.error("Erro capturado (objeto):", {
          error,
          type: typeof error,
          constructor: error?.constructor?.name,
          keys: Object.keys(error || {}),
          code: supabaseError?.code,
          message: supabaseError?.message,
          details: supabaseError?.details,
          hint: supabaseError?.hint,
          stringified: JSON.stringify(error, null, 2)
        });
      } else if (error instanceof Error) {
        errorMessage = error.message;
        console.error("Erro padrão (Error instance):", error);
        console.error("Stack trace:", error.stack);
      } else {
        console.error("Erro desconhecido:", error);
        console.error("Tipo do erro:", typeof error);
        console.error("Stringified:", JSON.stringify(error, null, 2));
      }

      // Processar erro do Supabase se disponível
      if (supabaseError) {
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
          errorDetails = supabaseError.details || "";
          
          // Mensagens mais amigáveis para erros comuns do PostgreSQL/Supabase
          if (supabaseError.code === '23505') {
            errorMessage = "Já existe um beneficiário com este número de processo ou nome.";
          } else if (supabaseError.code === '23503') {
            errorMessage = "Erro de referência: Verifique se o usuário está corretamente autenticado.";
          } else if (supabaseError.code === '23502') {
            errorMessage = "Campo obrigatório faltando: " + (supabaseError.details || "Verifique todos os campos obrigatórios.");
          } else if (supabaseError.code === '42501') {
            errorMessage = "Erro de permissão: Você não tem permissão para realizar esta ação. Verifique as políticas RLS.";
          } else if (supabaseError.code === 'PGRST116') {
            errorMessage = "Nenhum resultado retornado. Verifique se o registro foi inserido corretamente.";
          } else if (supabaseError.message) {
            const msg = supabaseError.message.toLowerCase();
            if (msg.includes("bucket")) {
              errorMessage = "Erro de configuração de armazenamento. Verifique as configurações.";
            } else if (msg.includes("policy") || msg.includes("permission")) {
              errorMessage = "Erro de permissão. Verifique as configurações de acesso e políticas RLS.";
            } else if (msg.includes("relation") || msg.includes("does not exist")) {
              errorMessage = "Erro de banco de dados. Tabela não encontrada. Verifique as migrações do banco.";
            } else if (msg.includes("violates not-null constraint")) {
              errorMessage = "Campo obrigatório não preenchido: " + (supabaseError.details || "Verifique todos os campos.");
            } else if (msg.includes("violates check constraint")) {
              errorMessage = "Valor inválido: " + (supabaseError.details || "Verifique os dados informados.");
            } else if (msg.includes("new row violates row-level security policy")) {
              errorMessage = "Erro de segurança: Você não tem permissão para criar este registro. Verifique as políticas RLS.";
            } else if (msg.includes("could not find") && msg.includes("column") && msg.includes("schema cache")) {
              errorMessage = "Erro de estrutura do banco: A coluna não existe na tabela. Execute a migração para adicionar as colunas de telefone.";
              errorDetails = "Execute a migração 20251029120001_fix_add_telefones_columns.sql no Supabase";
            }
          }
        }
      }
      
      // Mostrar mensagem de erro completa no toast
      const finalMessage = errorDetails ? `${errorMessage} (${errorDetails})` : errorMessage;
      toast.error("Erro ao salvar: " + finalMessage);
      
      return { success: false, error: errorMessage };
    }
  };

  const deleteBeneficiario = async (id: string) => {
    try {
      console.log('=== INICIANDO EXCLUSÃO DE BENEFICIÁRIO ===');
      console.log('ID do beneficiário:', id);
      
      // Verificar se o usuário está autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Erro de autenticação:', authError);
        throw new Error('Usuário não autenticado');
      }
      console.log('Usuário autenticado:', user.email);
      
      // Tentar excluir o beneficiário
      const { error, data } = await supabase
        .from("beneficiarios")
        .delete()
        .eq("id", id)
        .select();

      if (error) {
        console.error('=== ERRO AO EXCLUIR DO BANCO ===');
        console.error('Código do erro:', error.code);
        console.error('Mensagem do erro:', error.message);
        console.error('Detalhes do erro:', error.details);
        console.error('Hint do erro:', error.hint);
        
        // Verificar se é erro de RLS (Row Level Security)
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          throw new Error('Você não tem permissão para excluir este beneficiário. Verifique as políticas de segurança no Supabase.');
        }
        
        throw error;
      }

      console.log('=== BENEFICIÁRIO EXCLUÍDO COM SUCESSO ===');
      console.log('Dados excluídos:', data);
      
      // Remover da lista local imediatamente
      setBeneficiarios(prev => {
        const novaLista = prev.filter(b => b.id !== id);
        console.log('Lista local atualizada. Beneficiários restantes:', novaLista.length);
        return novaLista;
      });
      
      // Atualizar lista completa do servidor
      console.log('Atualizando lista do servidor...');
      await fetchBeneficiarios();
      console.log('Lista atualizada com sucesso');
      
      toast.success("Beneficiário excluído com sucesso!");
      return { success: true };
    } catch (error: unknown) {
      console.error("=== ERRO COMPLETO AO EXCLUIR BENEFICIÁRIO ===");
      console.error("Erro:", error);
      
      let errorMessage = "Erro desconhecido ao excluir";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      console.error("Mensagem de erro final:", errorMessage);
      toast.error("Erro ao excluir beneficiário: " + errorMessage);
      
      // Tentar atualizar lista mesmo em caso de erro para manter sincronizado
      try {
        await fetchBeneficiarios();
      } catch (fetchError) {
        console.error("Erro ao atualizar lista após falha na exclusão:", fetchError);
      }
      
      return { success: false, error: errorMessage };
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
