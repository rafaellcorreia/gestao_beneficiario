/**
 * Tipos de dados do sistema de controle de beneficiários
 */

export type StatusVida = 'Vivo' | 'Morto' | 'Preso' | 'Enfermo' | 'Licença Maternidade' | 'Devolvido' | 'Concludente' | 'Aguardando Sentença';

export type UserRole = 'admin' | 'gestor' | 'operador' | 'leitor';

export interface Frequencia {
  id: string;
  fotoUrl: string;
  timestamp: Date;
  usuario: string;
  observacao?: string;
  anexos?: Array<{url: string; nome: string}>;
}

export interface Observacao {
  id: string;
  autor: string;
  texto: string;
  timestamp: Date;
  anexoUrl?: string;
  editavel?: boolean;
}

export interface DocumentoPDF {
  id: string;
  nome: string;
  url: string;
  tipo: 'frequencia' | 'documentacao';
  dataAnexacao: Date;
  usuario: string;
}

export interface Beneficiario {
  id: string;
  nome: string;
  fotoUrl: string;
  numeroProcesso: string;
  dataRecebimento: Date;
  telefonePrincipal?: string;
  telefoneSecundario?: string;
  horasCumpridas: number;
  horasRestantes: number;
  frequencias: Frequencia[];
  statusVida: StatusVida;
  observacoes: Observacao[];
  localLotacao: string;
  frequenciaPDFUrl?: string;
  documentacaoPDFUrl?: string;
  documentosPDF: DocumentoPDF[];
  atributos?: Record<string, any>;
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string;
  atualizadoPor: string;
}

export interface LocalServico {
  id: string;
  nome: string;
  endereco?: string;
  observacoes?: string;
}

export interface Armamento {
  id: string;
  beneficiarioId: string;
  tipo: string;
  quantidade: number;
  storagePath?: string;
  url?: string;
  observacoes?: string;
}

export interface FiltrosBeneficiario {
  busca?: string;
  status?: StatusVida[];
  horasMin?: number;
  dataInicio?: Date;
  dataFim?: Date;
  semFoto?: boolean;
  semFrequenciaHoje?: boolean;
  localServico?: string;
}

export interface FiltrosAplicados {
  status: StatusVida | null;
  horasMin: number | null;
  dataInicio: string | null;
  dataFim: string | null;
}

export interface CreateBeneficiarioDTO {
  nome: string;
  foto: File;
  numeroProcesso: string;
  dataRecebimento: Date;
  statusVida: StatusVida;
  localLotacao: string;
  telefonePrincipal?: string;
  telefoneSecundario?: string;
  horasCumpridas: number;
  horasRestantes: number;
  observacaoInicial?: string;
  frequenciaPDF?: File;
  documentacaoPDF?: File;
}
