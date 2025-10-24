# 🚀 Instruções de Deploy - Sistema de Gestão

## ✅ Correções Implementadas

### Problema do Logout Corrigido:
- ✅ Melhorado o hook `useAuth` com tratamento de erro
- ✅ Adicionado feedback visual no botão de logout
- ✅ Melhorado o redirecionamento automático
- ✅ Adicionado estado de loading durante logout

## 📋 Como Fazer Deploy

### Opção 1: Script Automático (Recomendado)

#### Para Windows (PowerShell):
```powershell
# Execute no PowerShell como administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy.ps1
```

#### Para Linux/Mac (Bash):
```bash
chmod +x deploy.sh
./deploy.sh
```

### Opção 2: Deploy Manual

1. **Instalar dependências:**
```bash
npm install
```

2. **Fazer build:**
```bash
npm run build
```

3. **Instalar Netlify CLI (se não tiver):**
```bash
npm install -g netlify-cli
```

4. **Fazer deploy:**
```bash
netlify deploy --prod --dir=dist
```

### Opção 3: Deploy via Netlify Dashboard

1. Acesse [netlify.com](https://netlify.com)
2. Faça login na sua conta
3. Clique em "New site from Git"
4. Conecte seu repositório
5. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`: https://fbcwaxjwverpiqqwvvdn.supabase.co
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiY3dheGp3dmVycGlxcXd2dmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTkxMjAsImV4cCI6MjA3NTU5NTEyMH0.uIBsTX3uI5xHr4JJahGdmgRAXzEUtYmv-Ov5cNQ7nkY
6. Deploy automático será feito

## 🔧 Configurações do Netlify

### Build Settings:
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18.x

### Environment Variables:
```
VITE_SUPABASE_URL=https://fbcwaxjwverpiqqwvvdn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiY3dheGp3dmVycGlxcXd2dmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTkxMjAsImV4cCI6MjA3NTU5NTEyMH0.uIBsTX3uI5xHr4JJahGdmgRAXzEUtYmv-Ov5cNQ7nkY
VITE_SUPABASE_PROJECT_ID=fbcwaxjwverpiqqwvvdn
```

## 🐛 Problemas Comuns e Soluções

### 1. Erro de Build:
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 2. Erro de Deploy:
```bash
# Verificar se está logado no Netlify
netlify login

# Tentar deploy novamente
netlify deploy --prod --dir=dist
```

### 3. Logout não funciona:
- ✅ **CORRIGIDO**: O problema foi resolvido nas correções implementadas
- O botão agora tem feedback visual
- O redirecionamento é automático

## 📱 Testando o Deploy

Após o deploy, teste:

1. ✅ **Login** - Deve funcionar normalmente
2. ✅ **Logout** - Deve redirecionar para /auth
3. ✅ **Navegação** - Deve funcionar entre páginas
4. ✅ **Responsividade** - Deve funcionar em mobile

## 🔄 Atualizações Futuras

Para atualizar o site:

1. Faça as alterações no código
2. Execute o script de deploy novamente
3. Ou configure deploy automático via Git

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do Netlify
2. Teste localmente com `npm run dev`
3. Verifique as variáveis de ambiente
4. Confirme se o Supabase está configurado corretamente

