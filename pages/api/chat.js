import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // GET — buscar mensagens de um anúncio
  if (req.method === 'GET') {
    const { anuncio_id, since } = req.query
    if (!anuncio_id) return res.status(400).json({ error: 'anuncio_id obrigatório' })
    let q = `SELECT * FROM chat_anuncios WHERE anuncio_id = $1`
    let params = [anuncio_id]
    if (since) {
      q += ` AND id > $2`
      params.push(since)
    }
    q += ` ORDER BY criado_em ASC LIMIT 100`
    const { data } = await query(q, params)
    return res.json(data || [])
  }

  // POST — enviar mensagem
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

  // DELETE — admin apaga mensagem
  if (req.method === 'DELETE') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id } = req.body
    await query(`DELETE FROM chat_anuncios WHERE id = $1`, [id])
    return res.json({ ok: true })
  }

  res.status(405).end()
}
