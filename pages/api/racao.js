import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // GET — estoque de ração do jogador
  if (req.method === 'GET') {
    const jogadorId = user.role === 'admin' && req.query.jogador_id ? req.query.jogador_id : user.id
    const { data } = await queryOne(
      `SELECT * FROM estoque_racao WHERE jogador_id = $1`, [jogadorId]
    )
    return res.json(data || { jogador_id: jogadorId, kg_disponivel: 0 })
  }

  // POST — admin registra compra de ração
  if (req.method === 'POST') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { jogador_id, kg, valor } = req.body

    const { data: existing } = await queryOne(
      `SELECT * FROM estoque_racao WHERE jogador_id = $1`, [jogador_id]
    )
    let data
    if (existing) {
      const res2 = await queryOne(
        `UPDATE estoque_racao SET kg_disponivel = kg_disponivel + $1, ultima_compra = now() WHERE jogador_id = $2 RETURNING *`,
        [kg, jogador_id]
      )
      data = res2.data
    } else {
      const res2 = await queryOne(
        `INSERT INTO estoque_racao (jogador_id, kg_disponivel) VALUES ($1, $2) RETURNING *`,
        [jogador_id, kg]
      )
      data = res2.data
    }

    await query(
      `INSERT INTO transacoes (tipo, de_jogador, para_jogador, quantidade, valor, status) VALUES ('compra_racao', 'Cerealista NPC', $1, $2, $3, 'concluido')`,
      [user.role === 'admin' ? 'admin' : user.username, kg, valor]
    )

    return res.json(data)
  }

  res.status(405).end()
}
