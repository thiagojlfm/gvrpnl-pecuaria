import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user  = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // GET — lista garagem do jogador (ou de qualquer jogador se admin)
  if (req.method === 'GET') {
    const jogador_id = req.query.jogador_id || user.id
    const { data, error } = await query(
      `SELECT * FROM lavoura_garagem WHERE jogador_id = $1 ORDER BY criado_em ASC`,
      [jogador_id]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data || [])
  }

  // POST — admin adiciona máquina (compra na concessionária futuramente)
  if (req.method === 'POST') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { jogador_id, tipo, marca, nome } = req.body
    if (!jogador_id || !tipo || !marca || !nome)
      return res.status(400).json({ error: 'jogador_id, tipo, marca e nome são obrigatórios' })

    const { data, error } = await queryOne(
      `INSERT INTO lavoura_garagem (jogador_id, tipo, marca, nome)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [jogador_id, tipo, marca, nome]
    )
    if (error) return res.status(500).json({ error: error.message })
    await query(
      `INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
      [user.username, 'Máquina adicionada', `${nome} (${tipo}) → jogador ${jogador_id}`]
    )
    return res.json(data)
  }

  // DELETE — admin remove máquina
  if (req.method === 'DELETE') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id } = req.body
    const { data, error } = await queryOne(
      `DELETE FROM lavoura_garagem WHERE id = $1 RETURNING *`, [id]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  res.status(405).end()
}
