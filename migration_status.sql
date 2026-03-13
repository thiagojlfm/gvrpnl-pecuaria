-- Rodar no Neon SQL Editor ANTES de fazer deploy
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aprovado';
-- Garante que admin já existente fica aprovado
UPDATE usuarios SET status = 'aprovado' WHERE role = 'admin';
