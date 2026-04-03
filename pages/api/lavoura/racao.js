import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

const PRECO_RACAO = 2 // $/kg ao vender ao celeiro

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user  = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // GET — consulta estoque de ração
  if (req.method === 'GET') {
    const { data } = await queryOne(
      `SELECT * FROM lavoura_estoque_racao WHERE jogador_id = $1`, [user.id]
    )
    return res.json(data || { jogador_id: user.id, kg_disponivel: 0 })
  }

  // POST — vender ração ao celeiro (gera ADDMONEY)
  if (req.method === 'POST') {
    const { action, kg } = req.body

    if (action === 'vender_celeiro') {
      const { data: estoque } = await queryOne(
        `SELECT kg_disponivel FROM lavoura_estoque_racao WHERE jogador_id = $1`, [user.id]
      )
      const kgDisponivel = parseFloat(estoque?.kg_disponivel || 0)
      const kgVender     = kg ? Math.min(parseFloat(kg), kgDisponivel) : kgDisponivel

      if (kgVender <= 0)
        return res.status(400).json({ error: 'Sem ração em estoque' })

      const valor = Math.round(kgVender * PRECO_RACAO)

      // Zera ou reduz estoque
      await query(
        `UPDATE lavoura_estoque_racao
         SET kg_disponivel = kg_disponivel - $1, atualizado_em = now()
         WHERE jogador_id = $2`,
        [kgVender, user.id]
      )

      // Registra no admin_log para o admin fazer o addmoney
      await query(
        `INSERT INTO admin_log (admin_nome, acao, detalhes)
         VALUES ($1, $2, $3)`,
        [
          user.username,
          'Venda de ração ao Celeiro',
          `${user.username} vendeu ${kgVender} kg de ração — ADDMONEY $${valor}`,
        ]
      )

      return res.json({ kg_vendido: kgVender, valor, mensagem: `ADDMONEY $${valor}` })
    }

    return res.status(400).json({ error: 'Action inválida' })
  }

  res.status(405).end()
}
