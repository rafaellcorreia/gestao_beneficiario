# Script PowerShell para fazer build e deploy no Netlify
Write-Host "🚀 Iniciando processo de build e deploy..." -ForegroundColor Green

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: package.json não encontrado. Execute este script na raiz do projeto." -ForegroundColor Red
    exit 1
}

# Instalar dependências
Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
npm install

# Fazer build do projeto
Write-Host "🔨 Fazendo build do projeto..." -ForegroundColor Yellow
npm run build

# Verificar se o build foi bem-sucedido
if (-not (Test-Path "dist")) {
    Write-Host "❌ Erro: Build falhou. Diretório 'dist' não foi criado." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
Write-Host "📁 Arquivos gerados em: dist/" -ForegroundColor Cyan

# Verificar se o Netlify CLI está instalado
try {
    netlify --version | Out-Null
    Write-Host "✅ Netlify CLI já está instalado" -ForegroundColor Green
} catch {
    Write-Host "📥 Instalando Netlify CLI..." -ForegroundColor Yellow
    npm install -g netlify-cli
}

# Fazer deploy
Write-Host "🌐 Fazendo deploy no Netlify..." -ForegroundColor Yellow
netlify deploy --prod --dir=dist

Write-Host "🎉 Deploy concluído!" -ForegroundColor Green
Write-Host "🔗 Seu site está disponível no Netlify" -ForegroundColor Cyan

