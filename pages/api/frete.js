import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  if (req.method === 'GET') {
    const { lote_id, jogador_id } = req.query
    if (lote_id) {
      const { data } = await queryOne(`SELECT * FROM frete WHERE lote_id = $1 ORDER BY id DESC LIMIT 1`, [lote_id])
      return res.json(data || null)
    }
    if (jogador_id) {
      const { data } = await query(
        `SELECT * FROM frete WHERE jogador_id = $1 AND status IN ('em_rota_buscar','em_rota_fazenda') ORDER BY id DESC`,
        [jogador_id]
      )
      return res.json(data || [])
    }
    return res.json([])
  }

  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  if (req.method === 'POST') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { lote_id, jogador_id, fazenda_id } = req.body
    // 30min indo buscar, 60min chegando na fazenda
    const buscaEm = new Date(Date.now() + 30 * 60 * 1000)
    const chegaEm = new Date(Date.now() + 60 * 60 * 1000)
    const { data, error } = await queryOne(
      `INSERT INTO frete (lote_id, jogador_id, fazenda_id, status, chega_em, busca_em)
       VALUES ($1,$2,$3,'em_rota_buscar',$4,$5) RETURNING *`,
      [lote_id, jogador_id, fazenda_id||null, chegaEm.toISOString(), buscaEm.toISOString()]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'PATCH') {
    const { id, status } = req.body
    const { data } = await queryOne(
      `UPDATE frete SET status=$1 WHERE id=$2 RETURNING *`, [status, id]
    )
    return res.json(data)
  }

  res.status(405).end()
}
