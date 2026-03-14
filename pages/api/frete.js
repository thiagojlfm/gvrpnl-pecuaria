import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  if (req.method === 'GET') {
    const { lote_id, jogador_id } = req.query
    if (lote_id) {
      const { data } = await queryOne(`SELECT * FROM frete WHERE lote_id = $1`, [lote_id])
      return res.json(data || null)
    }
    if (jogador_id) {
      const { data } = await query(`SELECT * FROM frete WHERE jogador_id = $1 AND status = 'em_transito'`, [jogador_id])
      return res.json(data || [])
    }
    return res.json([])
  }

  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // POST — admin cria frete após aprovar compra
  if (req.method === 'POST') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { lote_id, jogador_id, fazenda_id, minutos = 2 } = req.body
    const chegaEm = new Date(Date.now() + minutos * 60 * 1000)
    const { data, error } = await queryOne(
      `INSERT INTO frete (lote_id, jogador_id, fazenda_id, status, chega_em)
       VALUES ($1,$2,$3,'em_transito',$4) RETURNING *`,
      [lote_id, jogador_id, fazenda_id, chegaEm.toISOString()]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // PATCH — marcar chegou
  if (req.method === 'PATCH') {
    const { id } = req.body
    const { data } = await queryOne(
      `UPDATE frete SET status='entregue' WHERE id=$1 RETURNING *`, [id]
    )
    return res.json(data)
  }

  res.status(405).end()
}
