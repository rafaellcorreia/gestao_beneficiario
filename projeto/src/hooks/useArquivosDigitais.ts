import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ArquivoDigital {
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
  atualizado_em: string;
}

export function useArquivosDigitais(ano?: number, categoria?: string) {
  const [arquivos, setArquivos] = useState<ArquivoDigital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArquivos = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('arquivos_digitais')
        .select('*')
        .order('criado_em', { ascending: false });

      if (ano) {
        query = query.eq('ano', ano);
      }

      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setArquivos(data || []);
    } catch (err) {
      console.error('Erro ao buscar arquivos digitais:', err);
      setError('Erro ao carregar arquivos');
      toast.error('Erro ao carregar arquivos digitais');
    } finally {
      setLoading(false);
    }
  };

  const uploadArquivo = async (file: File, metadata: {
    nome: string;
    descricao?: string;
    categoria?: string;
    tags?: string[];
    ano: number;
    mes?: number;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      // Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('arquivos-digitais')
        .upload(fileName, file);
      
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
          nome: metadata.nome,
          descricao: metadata.descricao,
          arquivo_url: publicUrl,
          tipo_arquivo: file.type || 'application/octet-stream',
          tamanho: file.size,
          ano: metadata.ano,
          mes: metadata.mes,
          categoria: metadata.categoria,
          tags: metadata.tags || [],
          usuario_upload: user.email || 'Usuário',
        });

      if (dbError) {
        throw dbError;
      }

      toast.success('Arquivo enviado com sucesso!');
      await fetchArquivos();
      return { success: true };
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar arquivo');
      return { success: false, error };
    }
  };

  const deleteArquivo = async (id: string, arquivoUrl: string) => {
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

      toast.success('Arquivo excluído com sucesso!');
      await fetchArquivos();
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error);
      toast.error('Erro ao excluir arquivo');
      return { success: false, error };
    }
  };

  const buscarArquivos = async (termo: string) => {
    try {
      const { data, error } = await supabase
        .from('arquivos_digitais')
        .select('*')
        .or(`nome.ilike.%${termo}%,descricao.ilike.%${termo}%`)
        .order('criado_em', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro na busca:', error);
      toast.error('Erro ao buscar arquivos');
      return [];
    }
  };

  const getEstatisticasPorAno = async () => {
    try {
      const { data, error } = await supabase
        .from('estatisticas_arquivos_por_ano')
        .select('*')
        .order('ano', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchArquivos();
  }, [ano, categoria]);

  return {
    arquivos,
    loading,
    error,
    fetchArquivos,
    uploadArquivo,
    deleteArquivo,
    buscarArquivos,
    getEstatisticasPorAno,
  };
}

