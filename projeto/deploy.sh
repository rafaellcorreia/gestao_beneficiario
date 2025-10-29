#!/bin/bash

# Script para fazer build e deploy no Netlify
echo "🚀 Iniciando processo de build e deploy..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: package.json não encontrado. Execute este script na raiz do projeto."
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Fazer build do projeto
echo "🔨 Fazendo build do projeto..."
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo "❌ Erro: Build falhou. Diretório 'dist' não foi criado."
    exit 1
fi

echo "✅ Build concluído com sucesso!"
echo "📁 Arquivos gerados em: dist/"

# Verificar se o Netlify CLI está instalado
if ! command -v netlify &> /dev/null; then
    echo "📥 Instalando Netlify CLI..."
    npm install -g netlify-cli
fi

# Fazer deploy
echo "🌐 Fazendo deploy no Netlify..."
netlify deploy --prod --dir=dist

echo "🎉 Deploy concluído!"
echo "🔗 Seu site está disponível no Netlify"

