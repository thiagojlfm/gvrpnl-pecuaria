import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  if (req.method === 'GET') {
    const { data } = await query(
      `SELECT * FROM notificacoes WHERE jogador_id = $1 ORDER BY criado_em DESC LIMIT 20`,
      [user.id]
    )
    return res.json(data || [])
  }

  if (req.method === 'PATCH') {
    const { id } = req.body
    if (id === 'all') {
      await query(`UPDATE notificacoes SET lida = true WHERE jogador_id = $1`, [user.id])
    } else {
      await query(`UPDATE notificacoes SET lida = true WHERE id = $1 AND jogador_id = $2`, [id, user.id])
    }
    return res.json({ ok: true })
  }

  res.status(405).end()
}
