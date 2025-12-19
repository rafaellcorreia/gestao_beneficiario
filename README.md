# Sistema de Gestão de Beneficiários

Sistema de gestão de beneficiários desenvolvido para a Prefeitura Municipal de Nossa Senhora do Socorro.

## Tecnologias

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **shadcn-ui** (Radix UI) - Componentes UI
- **Tailwind CSS** - Estilização
- **Supabase** - Backend (auth, database, storage)
- **React Router DOM** - Roteamento
- **TanStack Query** - Gerenciamento de estado
- **React Hook Form + Zod** - Formulários e validação
- **Sonner** - Notificações toast
- **Lucide React** - Ícones

## Instalação

### Pré-requisitos

- Node.js instalado (recomendado usar nvm: https://github.com/nvm-sh/nvm)
- npm ou yarn

### Passos

1. Clone o repositório:
```bash
git clone <URL_DO_REPOSITORIO>
cd gestao_beneficiario-main
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` na raiz do projeto
   - Copie o conteúdo de `env.production.example` e ajuste conforme necessário:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:8080`

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter

## Estrutura do Projeto

```
src/
├── components/     # Componentes React
├── hooks/          # Custom hooks
├── integrations/   # Integrações (Supabase)
├── lib/            # Utilitários e validações
├── pages/          # Páginas da aplicação
└── types/          # Definições de tipos TypeScript
```

## Funcionalidades

- Autenticação de usuários (login/cadastro)
- Gestão de beneficiários (CRUD completo)
- Controle de horas cumpridas e restantes
- Upload e gerenciamento de documentos PDF
- Sistema de observações
- Filtros avançados e busca em tempo real
- Dashboard com tabela de beneficiários

## Deploy

O projeto pode ser deployado em qualquer plataforma que suporte aplicações React/Vite, como:
- Vercel
- Netlify
- GitHub Pages
- Servidor próprio

Certifique-se de configurar as variáveis de ambiente no ambiente de produção.
