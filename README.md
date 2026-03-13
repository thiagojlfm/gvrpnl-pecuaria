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
   - DATABASE_URL = postgresql://neondb_owner:npg_pMY8WHmDT2RL@ep-lively-shape-acrlveyo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   - JWT_SECRET = gvrpnl_secret_2026
4. Deploy!

### 4. Primeiro acesso
- Login: admin / admin123
- TROQUE A SENHA depois!

## Ciclo do gado
- Semana 1 — Bezerro (180kg) · Gov. NPC · $900 fixo
- Semana 2 — Garrote (400kg) · pode vender p/ jogador
- Semana 3 — Boi (540kg) · pode vender p/ jogador
- Semana 4 — Boi abatido · Frigorífico NPC · admin faz addmoney
