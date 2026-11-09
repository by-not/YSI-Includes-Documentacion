# Script de despliegue directo a GitHub Pages (sin depender de GitHub Actions)
$ErrorActionPreference = "Stop"

Write-Host "Compilando documentacion para produccion..." -ForegroundColor Yellow
$env:BASE_PATH = "/YSI-Includes-Documentacion/"
npm run docs:build

$distPath = Join-Path (Get-Location).Path "docs\.vitepress\dist"
Set-Location $distPath

Write-Host "Desplegando en rama gh-pages..." -ForegroundColor Yellow
git init
git config user.name "not"
git config user.email "navarretealex344@gmail.com"
git add -A
git commit -m "deploy: produccion para GitHub Pages"
git branch -M gh-pages
git remote add origin https://github.com/by-not/YSI-Includes-Documentacion.git
git push -f origin gh-pages

Set-Location ../../..
Write-Host "Despliegue completado con exito en gh-pages!" -ForegroundColor Green
