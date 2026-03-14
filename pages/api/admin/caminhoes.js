import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })

  // GET — todos os caminhões
  if (req.method === 'GET') {
    const { data } = await query(
      `SELECT c.*, u.username as jogador_nome_atual
       FROM caminhoes c
       LEFT JOIN usuarios u ON c.jogador_id = u.id
       ORDER BY c.jogador_nome, c.comprado_em DESC`, []
    )
    return res.json(data || [])
  }

  // PATCH — atualizar nome da transportadora
  if (req.method === 'PATCH') {
    const { id, nome_transportadora } = req.body
    if (!id) return res.status(400).json({ error: 'ID obrigatório' })
    const { data, error } = await queryOne(
      `UPDATE caminhoes SET nome_transportadora=$1 WHERE id=$2 AND jogador_id=$3 RETURNING *`,
      [nome_transportadora, id, user.id]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // DELETE — apagar caminhão específico
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ID obrigatório' })

    // Verificar se tem frete ativo
    const { data: freteAtivo } = await queryOne(
      `SELECT id FROM fretes_transportadora WHERE caminhao_id=$1 AND status IN ('em_rota_buscar','em_rota_fazenda')`, [id]
    )
    if (freteAtivo) return res.status(400).json({ error: 'Caminhão está em rota — aguarde o frete terminar' })

    await query(`DELETE FROM caminhoes WHERE id=$1`, [id])
    await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
      [user.username, 'Caminhão removido', `ID ${id}`])

    return res.json({ ok: true })
  }

  res.status(405).end()
}
