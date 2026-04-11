import { query } from './db'

let schemaReady = false

async function run(sql) {
  const { error } = await query(sql, [])
  if (error) throw error
}

export async function ensureLavouraTables() {
  if (schemaReady) return

  await run(`
    CREATE TABLE IF NOT EXISTS lavoura_fazenda (
      jogador_id UUID PRIMARY KEY REFERENCES usuarios(id),
      capacidade_base NUMERIC(10,2) NOT NULL DEFAULT 40,
      boost_capim NUMERIC(10,2) NOT NULL DEFAULT 0,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS lavoura_garagem (
      id SERIAL PRIMARY KEY,
      jogador_id UUID NOT NULL REFERENCES usuarios(id),
      tipo TEXT NOT NULL,
      marca TEXT NOT NULL,
      nome TEXT NOT NULL,
      capacidade INTEGER,
      disponivel_aluguel BOOLEAN NOT NULL DEFAULT false,
      preco_aluguel_dia NUMERIC(10,2) NOT NULL DEFAULT 0,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS lavoura_campos (
      id SERIAL PRIMARY KEY,
      jogador_id UUID NOT NULL REFERENCES usuarios(id),
      cultura TEXT NOT NULL,
      area_ha NUMERIC(10,2) NOT NULL,
      marca_maquina TEXT,
      status TEXT NOT NULL DEFAULT 'arando',
      custo_total NUMERIC(12,2) NOT NULL DEFAULT 0,
      clima TEXT,
      resultado TEXT,
      inicio_op TIMESTAMPTZ,
      fim_op TIMESTAMPTZ,
      inicio_pasto TIMESTAMPTZ,
      fim_pasto TIMESTAMPTZ,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS lavoura_alugueis (
      id SERIAL PRIMARY KEY,
      maquina_id INTEGER NOT NULL REFERENCES lavoura_garagem(id),
      dono_id UUID NOT NULL REFERENCES usuarios(id),
      dono_nome TEXT NOT NULL,
      locatario_id UUID NOT NULL REFERENCES usuarios(id),
      locatario_nome TEXT NOT NULL,
      modelo_nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      marca TEXT NOT NULL,
      capacidade INTEGER,
      preco_dia NUMERIC(10,2) NOT NULL DEFAULT 0,
      dias INTEGER NOT NULL DEFAULT 1,
      valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
      comprovante TEXT,
      status TEXT NOT NULL DEFAULT 'pendente',
      inicio_aluguel TIMESTAMPTZ,
      fim_aluguel TIMESTAMPTZ,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await run(`ALTER TABLE lavoura_garagem ADD COLUMN IF NOT EXISTS jogador_id UUID`)
  await run(`ALTER TABLE lavoura_garagem ADD COLUMN IF NOT EXISTS capacidade INTEGER`)
  await run(`ALTER TABLE lavoura_garagem ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'trator'`)
  await run(`ALTER TABLE lavoura_garagem ADD COLUMN IF NOT EXISTS marca TEXT NOT NULL DEFAULT 'Valtra'`)
  await run(`ALTER TABLE lavoura_garagem ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT 'Maquina rural'`)
  await run(`ALTER TABLE lavoura_garagem ADD COLUMN IF NOT EXISTS disponivel_aluguel BOOLEAN NOT NULL DEFAULT false`)
  await run(`ALTER TABLE lavoura_garagem ADD COLUMN IF NOT EXISTS preco_aluguel_dia NUMERIC(10,2) NOT NULL DEFAULT 0`)
  await run(`ALTER TABLE lavoura_garagem ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT now()`)

  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS jogador_id UUID`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS cultura TEXT NOT NULL DEFAULT 'milho'`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS area_ha NUMERIC(10,2) NOT NULL DEFAULT 0`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS marca_maquina TEXT`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'arando'`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS custo_total NUMERIC(12,2) NOT NULL DEFAULT 0`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS clima TEXT`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS inicio_op TIMESTAMPTZ`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS fim_op TIMESTAMPTZ`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS resultado TEXT`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS inicio_pasto TIMESTAMPTZ`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS fim_pasto TIMESTAMPTZ`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT now()`)
  await run(`ALTER TABLE lavoura_campos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()`)

  await run(`ALTER TABLE lavoura_fazenda ADD COLUMN IF NOT EXISTS jogador_id UUID`)
  await run(`ALTER TABLE lavoura_fazenda ADD COLUMN IF NOT EXISTS capacidade_base NUMERIC(10,2) NOT NULL DEFAULT 40`)
  await run(`ALTER TABLE lavoura_fazenda ADD COLUMN IF NOT EXISTS boost_capim NUMERIC(10,2) NOT NULL DEFAULT 0`)
  await run(`ALTER TABLE lavoura_fazenda ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT now()`)
  await run(`ALTER TABLE lavoura_fazenda ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()`)

  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS maquina_id INTEGER`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS dono_id UUID`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS locatario_id UUID`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS dono_nome TEXT NOT NULL DEFAULT ''`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS locatario_nome TEXT NOT NULL DEFAULT ''`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS modelo_nome TEXT NOT NULL DEFAULT ''`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'trator'`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS marca TEXT NOT NULL DEFAULT 'Valtra'`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS capacidade INTEGER`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS preco_dia NUMERIC(10,2) NOT NULL DEFAULT 0`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS dias INTEGER NOT NULL DEFAULT 1`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10,2) NOT NULL DEFAULT 0`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS comprovante TEXT`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente'`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS inicio_aluguel TIMESTAMPTZ`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS fim_aluguel TIMESTAMPTZ`)
  await run(`ALTER TABLE lavoura_alugueis ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT now()`)

  await run(`
    UPDATE lavoura_garagem
    SET capacidade = CASE marca
      WHEN 'Fendt' THEN 150
      WHEN 'John Deere' THEN 70
      ELSE 30
    END
    WHERE capacidade IS NULL
  `)

  await run(`CREATE INDEX IF NOT EXISTS idx_lavoura_campos_jogador_status ON lavoura_campos (jogador_id, status)`)
  await run(`CREATE INDEX IF NOT EXISTS idx_lavoura_garagem_jogador ON lavoura_garagem (jogador_id)`)
  await run(`CREATE INDEX IF NOT EXISTS idx_lavoura_alugueis_maquina_status ON lavoura_alugueis (maquina_id, status)`)
  await run(`CREATE INDEX IF NOT EXISTS idx_lavoura_alugueis_locatario_status ON lavoura_alugueis (locatario_id, status)`)

  schemaReady = true
}
