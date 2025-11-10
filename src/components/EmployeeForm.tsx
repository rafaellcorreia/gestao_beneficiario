import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoCapture } from "./PhotoCapture";
import { validarDataRecebimento } from "@/lib/validations";
import { StatusVida } from "@/types/employee";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";
import { format } from "date-fns";

const employeeSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  numeroProcesso: z.string().min(1, "Número do processo é obrigatório"),
  dataRecebimento: z.date().refine(validarDataRecebimento, "Data não pode ser futura"),
  statusVida: z.enum(["Vivo", "Morto", "Preso", "Enfermo", "Licença Maternidade", "Devolvido", "Concludente", "Aguardando Sentença"]),
  localLotacao: z.string().min(1, "Local de lotação é obrigatório"),
  telefonePrincipal: z.string().optional(),
  telefoneSecundario: z.string().optional(),
  horasCumpridas: z.number().min(0, "Horas cumpridas não podem ser negativas"),
  horasRestantes: z.number().min(0, "Horas restantes não podem ser negativas"),
  observacaoInicial: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  onSubmit: (data: EmployeeFormData & { 
    foto: File; 
    fotoPreview: string;
    frequenciaPDF?: File;
    documentacaoPDF?: File;
  }) => void;
  onCancel: () => void;
  initialData?: Partial<EmployeeFormData>;
}

export function EmployeeForm({ onSubmit, onCancel, initialData }: EmployeeFormProps) {
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [frequenciaPDF, setFrequenciaPDF] = useState<File | null>(null);
  const [documentacaoPDF, setDocumentacaoPDF] = useState<File | null>(null);
  const [horasIniciais, setHorasIniciais] = useState<number>(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initialData,
  });

  const dataRecebimento = watch("dataRecebimento");
  const horasCumpridasWatch = watch('horasCumpridas');
  const horasRestantesWatch = watch('horasRestantes');
  const telPrincipalDDD = watch('telefonePrincipalDDD' as any);
  const telPrincipalNumero = watch('telefonePrincipalNumero' as any);
  const telSecundarioDDD = watch('telefoneSecundarioDDD' as any);
  const telSecundarioNumero = watch('telefoneSecundarioNumero' as any);

  // Lógica de cálculo de horas:
  // 1. Usuário informa horas cumpridas e horas restantes (ex: 20 e 80)
  // 2. Total = cumpridas + restantes (ex: 100) - calculado quando ambos são informados
  // 3. Total fica FIXO
  // 4. Quando horas cumpridas mudam, horas restantes = total - cumpridas (SEMPRE)
  // 5. Exemplo: se total=100 e cumpridas mudam de 20 para 30, restantes = 100-30 = 70
  
  // Efeito para calcular total quando ambos os valores são informados pela primeira vez
  useEffect(() => {
    const cumpridas = Number(horasCumpridasWatch) || 0;
    const restantes = Number(horasRestantesWatch) || 0;
    
    // Se ainda não temos total definido E ambos os valores são informados, calcular total
    if (horasIniciais === 0) {
      // Permitir definir total apenas quando ambos são > 0 OU quando um deles muda e o outro já existe
      if ((cumpridas > 0 && restantes > 0) || (cumpridas > 0 && restantes >= 0) || (cumpridas >= 0 && restantes > 0)) {
        const total = cumpridas + restantes;
        if (total > 0) {
          setHorasIniciais(total);
          console.log('✅ Total de horas definido:', total, '| Cumpridas:', cumpridas, '| Restantes:', restantes);
        }
      }
    }
  }, [horasCumpridasWatch, horasRestantesWatch, horasIniciais]);

  // Efeito para recalcular horas restantes quando horas cumpridas mudam (APÓS total estar definido)
  useEffect(() => {
    if (horasIniciais > 0) {
      const cumpridas = Number(horasCumpridasWatch) || 0;
      const restantesAtuais = Number(horasRestantesWatch) || 0;
      
      // SEMPRE recalcular restantes = total - cumpridas
      const novasRestantes = Math.max(0, horasIniciais - cumpridas);
      
      // Atualizar apenas se o valor mudou significativamente
      if (Math.abs(novasRestantes - restantesAtuais) > 0.01) {
        console.log('🔄 Recalculando horas restantes:', novasRestantes, '| Total:', horasIniciais, '| Cumpridas:', cumpridas);
        setValue('horasRestantes', novasRestantes, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [horasCumpridasWatch, horasIniciais, setValue]); // Removido horasRestantesWatch para evitar loop
  
  // Horas restantes NUNCA podem ser editadas manualmente após o total ser definido
  // O usuário só pode editar horas cumpridas, e as restantes são calculadas automaticamente
  const podeEditarRestantes = horasIniciais === 0;

  // Monta campos de telefone (DDD + número -> telefonePrincipal/telefoneSecundario)
  useEffect(() => {
    const onlyDigits = (s?: string) => (s || '').replace(/\D/g, '');
    const ddd = onlyDigits(telPrincipalDDD).slice(0, 2);
    const num = onlyDigits(telPrincipalNumero).slice(0, 9);
    const formatted = ddd && num ? `(${ddd}) ${num.length > 5 ? `${num.slice(0, num.length-4)}-${num.slice(-4)}` : num}` : '';
    setValue('telefonePrincipal' as any, formatted || undefined, { shouldDirty: true });
  }, [telPrincipalDDD, telPrincipalNumero, setValue]);

  useEffect(() => {
    const onlyDigits = (s?: string) => (s || '').replace(/\D/g, '');
    const ddd = onlyDigits(telSecundarioDDD).slice(0, 2);
    const num = onlyDigits(telSecundarioNumero).slice(0, 9);
    const formatted = ddd && num ? `(${ddd}) ${num.length > 5 ? `${num.slice(0, num.length-4)}-${num.slice(-4)}` : num}` : '';
    setValue('telefoneSecundario' as any, formatted || undefined, { shouldDirty: true });
  }, [telSecundarioDDD, telSecundarioNumero, setValue]);

  const handleFormSubmit = (data: EmployeeFormData) => {
    if (!foto) {
      toast.error("Por favor, capture ou faça upload de uma foto");
      return;
    }

    // Fecha o diálogo de confirmação somente após validação bem sucedida
    setConfirmOpen(false);

    onSubmit({ 
      ...data, 
      foto, 
      fotoPreview: fotoPreview!,
      frequenciaPDF: frequenciaPDF || undefined,
      documentacaoPDF: documentacaoPDF || undefined
    });
  };

  const handleReviewClick = () => {
    // Valida o formulário antes de mostrar o dialog de confirmação
    handleSubmit(
      () => {
        // Se válido, abre o dialog de confirmação
        if (foto) {
          setConfirmOpen(true);
        } else {
          toast.error("Por favor, capture ou faça upload de uma foto");
        }
      },
      () => {
        // Se inválido, o react-hook-form já mostra os erros
      }
    )();
  };

  const handlePhotoCapture = (file: File, preview: string) => {
    setFoto(file);
    setFotoPreview(preview);
  };

  const handleFileUpload = (file: File, type: 'frequencia' | 'documentacao') => {
    if (type === 'frequencia') {
      setFrequenciaPDF(file);
    } else {
      setDocumentacaoPDF(file);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dados Pessoais */}
        <div className="space-y-4 md:col-span-2">
          <h3 className="text-lg font-semibold text-foreground">Dados Pessoais</h3>
          
          <div>
            <Label htmlFor="nome">
              Nome Completo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome"
              {...register("nome")}
              className="mt-1.5"
              aria-invalid={!!errors.nome}
              aria-describedby={errors.nome ? "nome-error" : undefined}
            />
            {errors.nome && (
              <p id="nome-error" className="text-sm text-destructive mt-1">
                {errors.nome.message}
              </p>
            )}
          </div>
        </div>

        {/* Foto */}
        <div className="md:col-span-2">
          <PhotoCapture onPhotoCapture={handlePhotoCapture} />
        </div>

        {/* Dados do Processo */}
        <div className="space-y-4 md:col-span-2">
          <h3 className="text-lg font-semibold text-foreground">Dados do Processo</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numeroProcesso">
                Nº do Processo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="numeroProcesso"
                {...register("numeroProcesso")}
                className="mt-1.5"
                aria-invalid={!!errors.numeroProcesso}
                aria-describedby={errors.numeroProcesso ? "processo-error" : undefined}
              />
              {errors.numeroProcesso && (
                <p id="processo-error" className="text-sm text-destructive mt-1">
                  {errors.numeroProcesso.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="dataRecebimento">
                Data de Recebimento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dataRecebimento"
                type="date"
                value={dataRecebimento ? format(dataRecebimento, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    const parsed = new Date(value + 'T00:00:00');
                    if (!isNaN(parsed.getTime())) {
                      setValue('dataRecebimento', parsed, { shouldValidate: true, shouldDirty: true });
                    }
                  } else {
                    setValue('dataRecebimento', undefined as unknown as Date, { shouldValidate: true, shouldDirty: true });
                  }
                }}
                className="mt-1.5"
                max={format(new Date(), 'yyyy-MM-dd')}
                aria-invalid={!!errors.dataRecebimento}
                aria-describedby={errors.dataRecebimento ? 'data-recebimento-error' : undefined}
              />
              {errors.dataRecebimento && (
                <p id="data-recebimento-error" className="text-sm text-destructive mt-1">
                  {errors.dataRecebimento.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="localLotacao">
              Local de Lotação <span className="text-destructive">*</span>
            </Label>
            <Input
              id="localLotacao"
              {...register("localLotacao")}
              className="mt-1.5"
              placeholder="Ex: Núcleo Regional, Setor, etc."
              aria-invalid={!!errors.localLotacao}
              aria-describedby={errors.localLotacao ? "lotacao-error" : undefined}
            />
            {errors.localLotacao && (
              <p id="lotacao-error" className="text-sm text-destructive mt-1">
                {errors.localLotacao.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Telefone Principal</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                <Input
                  id="telefonePrincipalDDD"
                  placeholder="DDD"
                  inputMode="numeric"
                  maxLength={2}
                  {...register('telefonePrincipalDDD' as any)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setValue('telefonePrincipalDDD' as any, digits, { shouldDirty: true });
                  }}
                />
                <Input
                  id="telefonePrincipalNumero"
                  className="col-span-2"
                  placeholder="Número"
                  inputMode="numeric"
                  maxLength={9}
                  {...register('telefonePrincipalNumero' as any)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setValue('telefonePrincipalNumero' as any, digits, { shouldDirty: true });
                  }}
                />
              </div>
            </div>
            <div>
              <Label>Telefone Secundário</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                <Input
                  id="telefoneSecundarioDDD"
                  placeholder="DDD"
                  inputMode="numeric"
                  maxLength={2}
                  {...register('telefoneSecundarioDDD' as any)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setValue('telefoneSecundarioDDD' as any, digits, { shouldDirty: true });
                  }}
                />
                <Input
                  id="telefoneSecundarioNumero"
                  className="col-span-2"
                  placeholder="Número"
                  inputMode="numeric"
                  maxLength={9}
                  {...register('telefoneSecundarioNumero' as any)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setValue('telefoneSecundarioNumero' as any, digits, { shouldDirty: true });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="horasCumpridas">
                Horas Cumpridas <span className="text-destructive">*</span>
              </Label>
              <Input
                id="horasCumpridas"
                type="number"
                {...register("horasCumpridas", { 
                  valueAsNumber: true,
                  min: { value: 0, message: "Horas cumpridas não podem ser negativas" },
                })}
                className="mt-1.5"
                placeholder="0"
                min="0"
                step="0.5"
                onChange={(e) => {
                  const valor = parseFloat(e.target.value) || 0;
                  setValue('horasCumpridas', valor, { shouldValidate: true, shouldDirty: true });
                  
                  // Se temos total definido, recalcular restantes imediatamente
                  if (horasIniciais > 0) {
                    const novasRestantes = Math.max(0, horasIniciais - valor);
                    setValue('horasRestantes', novasRestantes, { shouldValidate: true, shouldDirty: true });
                    console.log('⚡ Cálculo imediato: Total=', horasIniciais, '- Cumpridas=', valor, '= Restantes=', novasRestantes);
                  }
                }}
                aria-invalid={!!errors.horasCumpridas}
                aria-describedby={errors.horasCumpridas ? "horas-cumpridas-error" : undefined}
              />
              {errors.horasCumpridas && (
                <p id="horas-cumpridas-error" className="text-sm text-destructive mt-1">
                  {errors.horasCumpridas.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {horasIniciais > 0 
                  ? `📊 Total: ${horasIniciais}h | As horas restantes serão calculadas automaticamente`
                  : 'ℹ️ Informe as horas cumpridas e restantes para definir o total'}
              </p>
            </div>

            <div>
              <Label htmlFor="horasRestantes">
                Horas Restantes <span className="text-destructive">*</span>
                {horasIniciais > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">(calculado automaticamente)</span>
                )}
              </Label>
              <Input
                id="horasRestantes"
                type="number"
                {...register("horasRestantes", { 
                  valueAsNumber: true,
                  min: { value: 0, message: "Horas restantes não podem ser negativas" },
                })}
                className={podeEditarRestantes ? "mt-1.5" : "mt-1.5 bg-muted cursor-not-allowed"}
                placeholder="0"
                min="0"
                step="0.5"
                readOnly={!podeEditarRestantes}
                aria-invalid={!!errors.horasRestantes}
                aria-describedby={errors.horasRestantes ? "horas-restantes-error" : undefined}
              />
              {errors.horasRestantes && (
                <p id="horas-restantes-error" className="text-sm text-destructive mt-1">
                  {errors.horasRestantes.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {horasIniciais > 0 
                  ? `🧮 Cálculo: ${horasIniciais}h (total) - ${horasCumpridasWatch || 0}h (cumpridas) = ${horasRestantesWatch || 0}h (restantes)` 
                  : 'ℹ️ Informe as horas restantes inicialmente'}
              </p>
              {horasIniciais > 0 && horasCumpridasWatch > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                  ✅ As horas restantes são recalculadas automaticamente quando você altera as horas cumpridas
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="statusVida">
              Status de Vida <span className="text-destructive">*</span>
            </Label>
            <Select
              onValueChange={(value) => setValue("statusVida", value as StatusVida)}
              {...(initialData?.statusVida && { defaultValue: initialData.statusVida })}
            >
              <SelectTrigger className="mt-1.5" id="statusVida">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="Vivo">Vivo</SelectItem>
                <SelectItem value="Morto">Morto</SelectItem>
                <SelectItem value="Preso">Preso</SelectItem>
                <SelectItem value="Enfermo">Enfermo</SelectItem>
                <SelectItem value="Licença Maternidade">Licença Maternidade</SelectItem>
                <SelectItem value="Devolvido">Devolvido</SelectItem>
                <SelectItem value="Concludente">Concludente</SelectItem>
                <SelectItem value="Aguardando Sentença">Aguardando Sentença</SelectItem>
              </SelectContent>
            </Select>
            {errors.statusVida && (
              <p className="text-sm text-destructive mt-1">
                {errors.statusVida.message}
              </p>
            )}
          </div>
        </div>

        {/* Documentos */}
        <div className="space-y-4 md:col-span-2">
          <h3 className="text-lg font-semibold text-foreground">Documentos</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequenciaPDF">Frequência em PDF</Label>
              <div className="mt-1.5">
                <input
                  id="frequenciaPDF"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'frequencia');
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('frequenciaPDF')?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {frequenciaPDF ? frequenciaPDF.name : 'Selecionar PDF'}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="documentacaoPDF">Documentação em PDF</Label>
              <div className="mt-1.5">
                <input
                  id="documentacaoPDF"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'documentacao');
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('documentacaoPDF')?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {documentacaoPDF ? documentacaoPDF.name : 'Selecionar PDF'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-4 md:col-span-2">
          <div>
            <Label htmlFor="observacaoInicial">Observação Inicial</Label>
            <Textarea
              id="observacaoInicial"
              {...register("observacaoInicial")}
              rows={4}
              className="mt-1.5"
              placeholder="Adicione informações relevantes sobre o beneficiário ou processo..."
            />
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" className="bg-primary hover:bg-primary-hover" onClick={handleReviewClick}>
          Revisar e Confirmar
        </Button>
      </div>

      {/* Diálogo de confirmação */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cadastro do beneficiário</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p><strong>Nome:</strong> {watch('nome') || '-'} </p>
            <p><strong>Nº Processo:</strong> {watch('numeroProcesso') || '-'}</p>
            <p><strong>Data de recebimento:</strong> {dataRecebimento ? format(dataRecebimento, 'dd/MM/yyyy') : '-'}</p>
            <p><strong>Local de lotação:</strong> {watch('localLotacao') || '-'}</p>
            <p><strong>Telefone principal:</strong> {watch('telefonePrincipal') || '-'}</p>
            <p><strong>Telefone secundário:</strong> {watch('telefoneSecundario') || '-'}</p>
            <p><strong>Status:</strong> {watch('statusVida') || '-'}</p>
            <p><strong>Horas cumpridas:</strong> {watch('horasCumpridas') ?? 0}</p>
            <p><strong>Horas restantes:</strong> {watch('horasRestantes') ?? 0}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Voltar</Button>
            <Button type="button" onClick={handleSubmit(handleFormSubmit)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
