import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // GET — listar solicitações
  if (req.method === 'GET') {
    let q, params
    if (user.role === 'admin') {
      q = `SELECT * FROM solicitacoes ORDER BY criado_em DESC`
      params = []
    } else {
      q = `SELECT * FROM solicitacoes WHERE jogador_id = $1 ORDER BY criado_em DESC`
      params = [user.id]
    }
    const { data } = await query(q, params)
    return res.json(data || [])
  }

  // POST — jogador cria solicitação de compra
  if (req.method === 'POST') {
    const { quantidade, valor_total, custo_racao, comprovante } = req.body
    const { data, error } = await queryOne(
      `INSERT INTO solicitacoes (jogador_id, jogador_nome, fazenda, quantidade, valor_total, custo_racao, comprovante, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pendente') RETURNING *`,
      [user.id, user.username, user.fazenda, quantidade, valor_total, custo_racao, comprovante]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // PATCH — admin aprova ou recusa
  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id, status, obs } = req.body
    const { data, error } = await queryOne(
      `UPDATE solicitacoes SET status=$1, obs_admin=$2 WHERE id=$3 RETURNING *`,
      [status, obs || null, id]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  res.status(405).end()
}
