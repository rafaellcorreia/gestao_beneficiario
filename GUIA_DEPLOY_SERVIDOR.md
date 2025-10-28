# 🚀 Guia Completo para Deploy no Servidor

## 📋 Pré-requisitos

### **1. Preparação do Projeto:**
- ✅ Projeto funcionando localmente
- ✅ Banco de dados Supabase configurado
- ✅ Variáveis de ambiente definidas

### **2. Opções de Servidor:**
- 🌐 **Vercel** (Recomendado - Gratuito)
- 🌐 **Netlify** (Gratuito)
- 🌐 **Railway** (Gratuito com limitações)
- 🌐 **Heroku** (Pago)
- 🌐 **Servidor próprio** (VPS/Dedicado)

---

## 🎯 **OPÇÃO 1: VERCEL (Recomendado)**

### **Vantagens:**
- ✅ **Gratuito** para projetos pessoais
- ✅ **Deploy automático** via GitHub
- ✅ **HTTPS** automático
- ✅ **CDN global**
- ✅ **Fácil configuração**

### **Passo a Passo:**

#### **1. Preparar o Projeto:**
```bash
# 1. Fazer build do projeto
npm run build

# 2. Testar localmente
npm run preview
```

#### **2. Criar arquivo de configuração:**
Criar arquivo `vercel.json` na raiz do projeto:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### **3. Deploy via GitHub:**
1. **Criar repositório** no GitHub
2. **Fazer push** do código
3. **Conectar** no Vercel
4. **Configurar** variáveis de ambiente
5. **Deploy automático**

#### **4. Configurar Variáveis de Ambiente no Vercel:**
```
VITE_SUPABASE_URL=https://fbcwaxjwverpiqqwvvdn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiY3dheGp3dmVycGlxcXd2dmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTkxMjAsImV4cCI6MjA3NTU5NTEyMH0.uIBsTX3uI5xHr4JJahGdmgRAXzEUtYmv-Ov5cNQ7nkY
VITE_SUPABASE_PROJECT_ID=fbcwaxjwverpiqqwvvdn
```

---

## 🎯 **OPÇÃO 2: NETLIFY**

### **Vantagens:**
- ✅ **Gratuito** para projetos pessoais
- ✅ **Deploy automático** via GitHub
- ✅ **HTTPS** automático
- ✅ **Formulários** integrados

### **Passo a Passo:**

#### **1. Preparar o Projeto:**
```bash
npm run build
```

#### **2. Criar arquivo de configuração:**
Criar arquivo `netlify.toml` na raiz do projeto:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### **3. Deploy:**
1. **Criar conta** no Netlify
2. **Conectar** repositório GitHub
3. **Configurar** variáveis de ambiente
4. **Deploy automático**

---

## 🎯 **OPÇÃO 3: RAILWAY**

### **Vantagens:**
- ✅ **Gratuito** com limitações
- ✅ **Deploy automático**
- ✅ **Banco de dados** integrado

### **Passo a Passo:**

#### **1. Preparar o Projeto:**
```bash
npm run build
```

#### **2. Criar arquivo de configuração:**
Criar arquivo `railway.json` na raiz do projeto:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run preview",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 🎯 **OPÇÃO 4: SERVIDOR PRÓPRIO (VPS)**

### **Vantagens:**
- ✅ **Controle total**
- ✅ **Performance** dedicada
- ✅ **Customização** completa

### **Passo a Passo:**

#### **1. Preparar o Servidor:**
```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Nginx
sudo apt update
sudo apt install nginx

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2
```

#### **2. Configurar Nginx:**
Criar arquivo `/etc/nginx/sites-available/sistema-gestao`:
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### **3. Deploy no Servidor:**
```bash
# 1. Fazer upload do projeto
scp -r ./sistema-gestao user@seu-servidor:/var/www/

# 2. No servidor, instalar dependências
cd /var/www/sistema-gestao
npm install

# 3. Fazer build
npm run build

# 4. Configurar PM2
pm2 start npm --name "sistema-gestao" -- run preview
pm2 save
pm2 startup
```

---

## 🔧 **Configurações Importantes**

### **1. Variáveis de Ambiente:**
Criar arquivo `.env.production`:
```env
VITE_SUPABASE_URL=https://fbcwaxjwverpiqqwvvdn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiY3dheGp3dmVycGlxcXd2dmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTkxMjAsImV4cCI6MjA3NTU5NTEyMH0.uIBsTX3uI5xHr4JJahGdmgRAXzEUtYmv-Ov5cNQ7nkY
VITE_SUPABASE_PROJECT_ID=fbcwaxjwverpiqqwvvdn
```

### **2. Configurar CORS no Supabase:**
No painel do Supabase, adicionar o domínio do seu site:
```
https://seu-site.vercel.app
https://seu-site.netlify.app
https://seu-dominio.com
```

### **3. Configurar Storage Policies:**
Certificar que as políticas de storage permitem acesso público para imagens e PDFs.

---

## 🧪 **Testes Pós-Deploy**

### **1. Testes Básicos:**
- ✅ **Carregamento** da página inicial
- ✅ **Login** funcionando
- ✅ **Listagem** de beneficiários
- ✅ **Criação** de novos registros
- ✅ **Upload** de fotos e PDFs
- ✅ **Edição** de horas

### **2. Testes de Performance:**
- ✅ **Tempo de carregamento** < 3 segundos
- ✅ **Responsividade** em dispositivos móveis
- ✅ **Funcionamento** em diferentes navegadores

---

## 🚨 **Solução de Problemas**

### **1. Erro de CORS:**
```bash
# Adicionar domínio no Supabase
# Configurar políticas de storage
```

### **2. Erro de Build:**
```bash
# Verificar dependências
npm install

# Limpar cache
npm run build -- --force
```

### **3. Erro de Variáveis de Ambiente:**
```bash
# Verificar se as variáveis estão definidas
# Verificar se começam com VITE_
```

---

## 📊 **Recomendação Final**

### **Para Início:**
- 🥇 **Vercel** - Mais fácil e gratuito
- 🥈 **Netlify** - Alternativa sólida
- 🥉 **Railway** - Para projetos mais complexos

### **Para Produção:**
- 🏆 **Servidor próprio** - Máximo controle
- 🥇 **Vercel Pro** - Para projetos comerciais
- 🥈 **Netlify Pro** - Para projetos empresariais

**Escolha a opção que melhor se adequa ao seu caso!** 🚀
