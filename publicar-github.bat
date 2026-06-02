@echo off
chcp 65001 >nul
setlocal

REM ============================================================
REM  LDCODE - Publicar Live Chat no GitHub
REM  Coloque este .bat na pasta do seu repositorio (junto com
REM  app.js, index.html, server.js, etc.) e de dois cliques.
REM ============================================================

cd /d "%~dp0"

echo.
echo ====================================================
echo   LDCODE - Publicando alteracoes no GitHub
echo ====================================================
echo.

REM Verifica se git esta instalado
where git >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao encontrado. Instale em https://git-scm.com/download/win
  pause
  exit /b 1
)

REM Verifica se estamos dentro de um repositorio git
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Esta pasta nao e um repositorio Git.
  echo Coloque este arquivo dentro da pasta do seu repo "ldcode" e tente de novo.
  pause
  exit /b 1
)

REM Remove trava de git pendente, se existir
if exist ".git\index.lock" (
  echo Removendo trava antiga do Git...
  del /f /q ".git\index.lock"
)

REM Descobre o branch atual ^(main ou master^)
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b
echo Branch atual: %BRANCH%
echo.

echo Adicionando arquivos...
git add app.js index.html server.js package.json painel-chat.html .gitignore INSTRUCOES.md app-chat-block.js publicar-github.bat

echo.
echo Criando commit...
git commit -m "feat: Live Chat em tempo real com Node.js + Socket.io (painel de atendimento)"
if errorlevel 1 (
  echo.
  echo [AVISO] Nada para commitar ^(talvez ja esteja tudo enviado^) - tentando push mesmo assim.
)

echo.
echo Enviando para o GitHub ^(branch %BRANCH%^)...
echo Se pedir login, use seu usuario e um Personal Access Token como senha.
echo.
git push origin %BRANCH%
if errorlevel 1 (
  echo.
  echo [ERRO] Falha no push. Confira sua conexao e suas credenciais do GitHub.
  pause
  exit /b 1
)

echo.
echo ====================================================
echo   Pronto! Alteracoes publicadas no GitHub.
echo ====================================================
echo.
pause
