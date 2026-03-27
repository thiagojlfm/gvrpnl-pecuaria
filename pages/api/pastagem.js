import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

const CAMPOS_PASTO = [
  { id:1, codigo:'PA-01', nome:'Campo Verde Norte',    regiao:'Green Hills Norte',    ha:20, preco_semana:10500 },
  { id:2, codigo:'PA-02', nome:'Pastagem Rio Claro',   regiao:'Green Hills Sul',      ha:35, preco_semana:17400 },
  { id:3, codigo:'PA-03', nome:'Campo Dourado Oeste',  regiao:'Lake Ville',           ha:50, preco_semana:22500 },
  { id:4, codigo:'PA-04', nome:'Pasto Serra Alta',     regiao:'Green Hills Talhões',  ha:25, preco_semana:12600 },
  { id:5, codigo:'PA-05', nome:'Retiro Bela Vista',    regiao:'Lake Ville Talhões',   ha:40, preco_semana:18600 },
  { id:6, codigo:'PA-06', nome:'Campo Novo Horizonte', regiao:'Green Hills',          ha:70, preco_semana:31500 },
]
const CAP_POR_HA = { bezerro:3, garrote:2, boi:1, abatido:1 }

async function ensureTables() {
  await query(`CREATE TABLE IF NOT EXISTS alugueis_pasto (
    id SERIAL PRIMARY KEY,
    jogador_id UUID NOT NULL,
    jogador_nome TEXT,
    campo_id INTEGER NOT NULL,
    campo_nome TEXT,
    campo_codigo TEXT,
    fazenda_id INTEGER,
    ha_alugado INTEGER,
    valor_semana NUMERIC(10,2),
    status_pagamento TEXT DEFAULT 'pendente',
    valido_ate TIMESTAMP,
    status TEXT DEFAULT 'ativo',
    criado_em TIMESTAMP DEFAULT now()
  )`, [])
  await query(`ALTER TABLE alugueis_pasto ADD COLUMN IF NOT EXISTS campo_codigo TEXT`, [])
  await query(`ALTER TABLE alugueis_pasto ADD COLUMN IF NOT EXISTS fazenda_id INTEGER`, [])
  await query(`ALTER TABLE alugueis_pasto ADD COLUMN IF NOT EXISTS valor_semana NUMERIC(10,2)`, [])
  await query(`ALTER TABLE alugueis_pasto ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'pendente'`, [])
}

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  await ensureTables()

  // GET ────────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data: ativos } = await query(
      `SELECT campo_id, jogador_id, jogador_nome, valido_ate, status_pagamento, id, valor_semana
       FROM alugueis_pasto WHERE status='ativo'`, []
    )
    const ocupados = new Map((ativos||[]).map(a => [a.campo_id, a]))

    let meusAlugueis = []
    if (user) {
      const { data } = await query(
        `SELECT * FROM alugueis_pasto WHERE jogador_id=$1 AND status='ativo' ORDER BY criado_em DESC`,
        [user.id]
      )
      meusAlugueis = data || []
    }

    let todosAlugueis = []
    if (user?.role === 'admin') {
      const { data } = await query(
        `SELECT * FROM alugueis_pasto WHERE status='ativo' ORDER BY criado_em DESC`, []
      )
      todosAlugueis = data || []
    }

    const campos = CAMPOS_PASTO.map(c => ({
      ...c,
      cap_bezerros:     c.ha * CAP_POR_HA.bezerro,
      cap_garrotes:     c.ha * CAP_POR_HA.garrote,
      cap_bois:         c.ha * CAP_POR_HA.boi,
      ocupado:          ocupados.has(c.id),
      inquilino:        ocupados.get(c.id)?.jogador_nome || null,
      inquilino_id:     ocupados.get(c.id)?.jogador_id || null,
      aluguel_id:       ocupados.get(c.id)?.id || null,
      status_pagamento: ocupados.get(c.id)?.status_pagamento || null,
      valor_semana:     c.preco_semana,
      meu:              meusAlugueis.some(a => a.campo_id === c.id),
      valido_ate:       meusAlugueis.find(a => a.campo_id === c.id)?.valido_ate || null,
      meu_pagamento:    meusAlugueis.find(a => a.campo_id === c.id)?.status_pagamento || null,
    }))

    return res.json({ campos, meus: meusAlugueis, todos: todosAlugueis })
  }

  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // POST — jogador reserva ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { campo_id } = req.body
    const campo = CAMPOS_PASTO.find(c => c.id === parseInt(campo_id))
    if (!campo) return res.status(404).json({ error: 'Campo não encontrado' })

    const { data: ocupado } = await queryOne(
      `SELECT id FROM alugueis_pasto WHERE campo_id=$1 AND status='ativo'`, [campo_id]
    )
    if (ocupado) return res.status(400).json({ error: 'Campo já está alugado' })

    const { data: fazenda } = await queryOne(`SELECT id FROM fazendas WHERE codigo=$1`, [campo.codigo])
    const validoAte = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const { data, error } = await queryOne(
      `INSERT INTO alugueis_pasto
       (jogador_id, jogador_nome, campo_id, campo_nome, campo_codigo, fazenda_id, ha_alugado, valor_semana, valido_ate, status_pagamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pendente') RETURNING *`,
      [user.id, user.username, campo.id, campo.nome, campo.codigo,
       fazenda?.id||null, campo.ha, campo.preco_semana, validoAte.toISOString()]
    )
    if (error) return res.status(500).json({ error: error.message })

    await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
      [user.id, '🌿 Pasto reservado!',
       `${campo.nome} — ${campo.ha}ha. Pague $${campo.preco_semana.toLocaleString('pt-BR')} ao admin para confirmar.`])

    return res.json(data)
  }

  // PATCH — ações admin ───────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { action, campo_id, jogador_id, jogador_nome, aluguel_id } = req.body

    if (action === 'associar') {
      const campo = CAMPOS_PASTO.find(c => c.id === parseInt(campo_id))
      if (!campo) return res.status(404).json({ error: 'Campo não encontrado' })

      await query(`UPDATE alugueis_pasto SET status='encerrado' WHERE campo_id=$1 AND status='ativo'`, [campo_id])

      const { data: fazenda } = await queryOne(`SELECT id FROM fazendas WHERE codigo=$1`, [campo.codigo])
      const validoAte = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await queryOne(
        `INSERT INTO alugueis_pasto
         (jogador_id, jogador_nome, campo_id, campo_nome, campo_codigo, fazenda_id, ha_alugado, valor_semana, valido_ate, status, status_pagamento)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ativo','pendente')`,
        [jogador_id, jogador_nome, campo.id, campo.nome, campo.codigo,
         fazenda?.id||null, campo.ha, campo.preco_semana, validoAte.toISOString()]
      )

      if (fazenda?.id) {
        await query(`UPDATE fazendas SET dono_id=$1 WHERE id=$2`, [jogador_id, fazenda.id])
      }

      await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [jogador_id, '🌿 Pasto associado!',
         `Admin associou ${campo.nome} (${campo.ha}ha) à sua conta. Valor: $${campo.preco_semana.toLocaleString('pt-BR')}. Pague ao admin!`])

      return res.json({ ok: true })
    }

    if (action === 'quitar') {
      if (!aluguel_id) return res.status(400).json({ error: 'aluguel_id obrigatório' })
      await query(`UPDATE alugueis_pasto SET status_pagamento='pago' WHERE id=$1`, [aluguel_id])
      const { data: aluguel } = await queryOne(`SELECT * FROM alugueis_pasto WHERE id=$1`, [aluguel_id])
      if (aluguel) {
        await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [aluguel.jogador_id, '✅ Pagamento confirmado!',
           `Pasto ${aluguel.campo_nome} quitado. Contrato ativo até ${new Date(aluguel.valido_ate).toLocaleDateString('pt-BR')}.`])
      }
      return res.json({ ok: true })
    }

    if (action === 'desassociar') {
      const { data: aluguel } = await queryOne(
        `SELECT * FROM alugueis_pasto WHERE campo_id=$1 AND status='ativo'`, [campo_id]
      )
      await query(`UPDATE alugueis_pasto SET status='encerrado' WHERE campo_id=$1 AND status='ativo'`, [campo_id])
      if (aluguel?.fazenda_id) {
        await query(`UPDATE fazendas SET dono_id=NULL WHERE id=$1`, [aluguel.fazenda_id])
      }
      return res.json({ ok: true })
    }

    return res.status(400).json({ error: 'Ação inválida' })
  }

  // DELETE ────────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id } = req.body
    const { data: aluguel } = await queryOne(`SELECT * FROM alugueis_pasto WHERE id=$1`, [id])
    await query(`UPDATE alugueis_pasto SET status='encerrado' WHERE id=$1`, [id])
    if (aluguel?.fazenda_id) {
      await query(`UPDATE fazendas SET dono_id=NULL WHERE id=$1`, [aluguel.fazenda_id])
    }
    return res.json({ ok: true })
  }

  res.status(405).end()
}
