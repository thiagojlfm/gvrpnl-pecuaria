import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  if (req.method === 'GET') {
    // Retorna pedidos + cálculo de necessidade de ração
    let q, params
    if (user.role === 'admin') {
      q = `SELECT * FROM pedidos_racao ORDER BY criado_em DESC`
      params = []
    } else {
      q = `SELECT * FROM pedidos_racao WHERE jogador_id = $1 ORDER BY criado_em DESC`
      params = [user.id]
    }
    const { data: pedidos } = await query(q, params)

    // Calcular necessidade baseada no rebanho atual
    const { data: lotes } = await query(
      `SELECT fase, quantidade FROM lotes WHERE jogador_id = $1 AND status IN ('ativo','aguardando_pagamento')`,
      [user.id]
    )
    const { data: estoque } = await queryOne(
      `SELECT kg_disponivel FROM estoque_racao WHERE jogador_id = $1`, [user.id]
    )

    // Ração necessária por fase restante
    const RACAO = { garrote: 35, boi: 56 } // só fases que precisam comprar no celeiro
    let kgNecessario = 0
    const detalhes = []
    ;(lotes||[]).forEach(l => {
      const fases = []
      if (l.fase === 'bezerro' || l.fase === 'garrote') {
        if (l.fase === 'bezerro') fases.push({ fase:'garrote', kg: 35 * l.quantidade })
        fases.push({ fase:'boi', kg: 56 * l.quantidade })
        fases.forEach(f => { kgNecessario += f.kg; detalhes.push({ ...f, lote_qtd: l.quantidade }) })
      }
    })

    const kgDisponivel = Number(estoque?.kg_disponivel || 0)
    const kgFaltando = Math.max(0, kgNecessario - kgDisponivel)

    return res.json({
      pedidos: pedidos || [],
      necessidade: { kgNecessario, kgDisponivel, kgFaltando, detalhes }
    })
  }

  // POST — jogador solicita ração
  if (req.method === 'POST') {
    const { kg_solicitado, comprovante, fazenda_id } = req.body
    if (!kg_solicitado || kg_solicitado <= 0)
      return res.status(400).json({ error: 'Quantidade inválida' })

    // Busca preço atual do mercado
    const { data: lotes } = await query(
      `SELECT fase, quantidade FROM lotes WHERE status IN ('ativo','aguardando_pagamento')`, []
    )
    const total = (lotes||[]).reduce((s,l) => l.fase !== 'abatido' ? s + l.quantidade : s, 0)
    let precoKg = 2
    if (total > 600) precoKg = 3
    else if (total > 400) precoKg = 2.4

    const valorTotal = Math.round(kg_solicitado * precoKg * 100) / 100

    const { data, error } = await queryOne(
      `INSERT INTO pedidos_racao (jogador_id, jogador_nome, fazenda_id, kg_solicitado, valor_total, preco_kg, comprovante, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pendente') RETURNING *`,
      [user.id, user.username, fazenda_id||null, kg_solicitado, valorTotal, precoKg, comprovante||null]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // PATCH — admin confirma entrega
  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id, status } = req.body

    const { data: pedido } = await queryOne(`SELECT * FROM pedidos_racao WHERE id = $1`, [id])
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' })

    await query(`UPDATE pedidos_racao SET status=$1 WHERE id=$2`, [status, id])

    if (status === 'entregue') {
      // Creditar ração no estoque
      await query(
        `INSERT INTO estoque_racao (jogador_id, kg_disponivel)
         VALUES ($1, $2)
         ON CONFLICT (jogador_id) DO UPDATE SET kg_disponivel = estoque_racao.kg_disponivel + $2`,
        [pedido.jogador_id, pedido.kg_solicitado]
      )
      // Notificar
      await query(
        `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [pedido.jogador_id, '🌾 Ração entregue!',
         `${pedido.kg_solicitado}kg de ração creditados no seu estoque.`]
      )
      await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
        [user.username, 'Ração entregue', `${pedido.jogador_nome} — ${pedido.kg_solicitado}kg — $${pedido.valor_total}`])
    }

    return res.json({ ok: true })
  }

  res.status(405).end()
}
