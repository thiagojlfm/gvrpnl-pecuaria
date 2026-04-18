# GVRPNL — Sistema de Pecuária

## Setup completo

### 1. Neon — as tabelas já foram criadas!
O SQL já foi executado no Neon. Banco pronto.

### 2. GitHub — subir o projeto
1. Acesse https://github.com/new
2. Nome: gvrpnl-pecuaria → Create repository
3. Clique em "uploading an existing file"
4. Extraia o zip e arraste TODOS os arquivos
5. Commit changes

### 3. Vercel — deploy
1. Acesse https://vercel.com/new
2. Conecte o repositório gvrpnl-pecuaria
3. Em Environment Variables adicione:
   - DATABASE_URL = `<YOUR_NEON_DATABASE_URL>` (copie do painel do Neon)
   - JWT_SECRET = `<GENERATE_A_STRONG_RANDOM_SECRET>` (ex.: `openssl rand -hex 32`)
4. Deploy!

> ⚠️ **Nunca** faça commit de URLs de banco, chaves JWT ou senhas reais. Use apenas variáveis de ambiente.

### 4. Primeiro acesso
- Crie o usuário admin manualmente no banco (ou via script de seed local) com uma senha forte gerada por você.
- Nunca reutilize a senha em outro ambiente.

## Ciclo do gado
- Semana 1 — Bezerro (180kg) · Gov. NPC · $900 fixo
- Semana 2 — Garrote (400kg) · pode vender p/ jogador
- Semana 3 — Boi (540kg) · pode vender p/ jogador
- Semana 4 — Boi abatido · Frigorífico NPC · admin faz addmoney
