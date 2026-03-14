import { query } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })

  if (req.method === 'GET') {
    const { data } = await query(`SELECT * FROM admin_log ORDER BY criado_em DESC LIMIT 50`, [])
    return res.json(data || [])
  }

  if (req.method === 'POST') {
    const { acao, detalhes } = req.body
    await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`, [user.username, acao, detalhes])
    return res.json({ ok: true })
  }

  res.status(405).end()
}
