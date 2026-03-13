import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  if (req.method === 'GET') {
    const { anuncio_id, since } = req.query
    if (!anuncio_id) return res.status(400).json({ error: 'anuncio_id obrigatório' })
    const sinceInt = parseInt(since) || 0
    // anuncio_id é UUID — não faz parseInt
    const { data, error } = await query(
      `SELECT * FROM chat_anuncios WHERE anuncio_id = $1 AND id > $2 ORDER BY criado_em ASC LIMIT 100`,
      [anuncio_id, sinceInt]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data || [])
  }

  if (req.method === 'POST') {
    const { anuncio_id, mensagem } = req.body
    if (!mensagem?.trim()) return res.status(400).json({ error: 'Mensagem vazia' })
    const { data, error } = await queryOne(
      `INSERT INTO chat_anuncios (anuncio_id, jogador_id, jogador_nome, mensagem) VALUES ($1,$2,$3,$4) RETURNING *`,
      [anuncio_id, user.id, user.username, mensagem.trim()]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'DELETE') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id } = req.body
    await query(`DELETE FROM chat_anuncios WHERE id = $1`, [parseInt(id)])
    return res.json({ ok: true })
  }

  res.status(405).end()
}
