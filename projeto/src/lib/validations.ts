/**
 * Validações de dados do sistema
 */

/**
 * Valida CPF brasileiro usando algoritmo dos dígitos verificadores
 */
export function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpfLimpo.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digito1 = resto === 10 || resto === 11 ? 0 : resto;
  
  if (digito1 !== parseInt(cpfLimpo.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digito2 = resto === 10 || resto === 11 ? 0 : resto;
  
  if (digito2 !== parseInt(cpfLimpo.charAt(10))) return false;
  
  return true;
}

/**
 * Formata CPF para exibição: 000.000.000-00
 */
export function formatarCPF(cpf: string): string {
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Mascara CPF para exibição segura: ***.***.***-12
 */
export function mascaraCPF(cpf: string): string {
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return cpf;
  return `***.***.${ cpfLimpo.substring(6, 9)}-${cpfLimpo.substring(9)}`;
}

/**
 * Valida telefone brasileiro (10 ou 11 dígitos)
 */
export function validarTelefone(telefone: string): boolean {
  const telefoneLimpo = telefone.replace(/\D/g, '');
  return telefoneLimpo.length === 10 || telefoneLimpo.length === 11;
}

/**
 * Formata telefone para exibição: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatarTelefone(telefone: string): string {
  const telefoneLimpo = telefone.replace(/\D/g, '');
  if (telefoneLimpo.length === 11) {
    return telefoneLimpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (telefoneLimpo.length === 10) {
    return telefoneLimpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return telefone;
}

/**
 * Calcula lapso temporal em dias entre duas datas
 */
export function calcularLapso(dataRecebimento: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataRec = new Date(dataRecebimento);
  dataRec.setHours(0, 0, 0, 0);
  const diff = hoje.getTime() - dataRec.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calcula as horas restantes (diferença em horas) entre a data de recebimento e hoje
 * @param dataRecebimento - Data de recebimento do processo
 * @returns Número de horas decorridas
 */
export function calcularHorasRestantes(dataRecebimento: Date): number {
  const hoje = new Date();
  const diff = hoje.getTime() - dataRecebimento.getTime();
  return Math.floor(diff / (1000 * 60 * 60));
}

/**
 * Retorna cor do badge de lapso baseado nos dias
 */
export function getCorLapso(dias: number): 'normal' | 'warning' | 'danger' | 'critical' {
  if (dias < 30) return 'normal';
  if (dias < 60) return 'warning';
  if (dias < 90) return 'danger';
  return 'critical';
}

/**
 * Define cor do badge baseado nas horas restantes
 * @param horas - Número de horas decorridas
 * @returns Categoria de cor
 */
export function getCorHoras(horas: number): 'normal' | 'warning' | 'danger' | 'critical' {
  if (horas < 24) return 'critical'; // Menos de 24 horas - crítico
  if (horas < 168) return 'danger'; // Menos de 1 semana - perigo
  if (horas < 720) return 'warning'; // Menos de 30 dias - atenção
  return 'normal';
}

/**
 * Valida arquivo de foto (tamanho e formato)
 */
export function validarFoto(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Formato inválido. Use JPG, PNG ou WEBP.' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'Arquivo muito grande. Máximo 5MB.' };
  }
  
  return { valid: true };
}

/**
 * Valida data (não pode ser futura)
 */
export function validarDataRecebimento(data: Date): boolean {
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  return data <= hoje;
}
