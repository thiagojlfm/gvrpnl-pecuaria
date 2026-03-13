import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  if (req.method === 'GET') {
    let q, params
    if (user?.role === 'admin') {
      q = 'SELECT * FROM lotes ORDER BY criado_em DESC'
      params = []
    } else if (user) {
      q = 'SELECT * FROM lotes WHERE jogador_id = $1 ORDER BY criado_em DESC'
      params = [user.id]
    } else {
      return res.status(401).json({ error: 'Não autorizado' })
    }
    const { data, error } = await query(q, params)
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'POST') {
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { jogador_id, jogador_nome, fazenda, quantidade, valor_compra, data_compra, comprovante } = req.body

    const { data: countData } = await query('SELECT COUNT(*) FROM lotes', [])
    const count = parseInt(countData?.[0]?.count || 0)
    const codigo = `L-${String(count + 1).padStart(3, '0')}`

    const dataCompra = new Date(data_compra || new Date())
    const fase2 = new Date(dataCompra); fase2.setDate(fase2.getDate() + 7)
    const fase3 = new Date(dataCompra); fase3.setDate(fase3.getDate() + 14)
    const fase4 = new Date(dataCompra); fase4.setDate(fase4.getDate() + 21)

    const { data, error } = await queryOne(
      `INSERT INTO lotes (codigo, jogador_id, jogador_nome, fazenda, quantidade, fase, peso_kg, valor_compra, data_compra, data_fase2, data_fase3, data_fase4, status, comprovante)
       VALUES ($1,$2,$3,$4,$5,'bezerro',180,$6,$7,$8,$9,$10,'ativo',$11) RETURNING *`,
      [codigo, jogador_id, jogador_nome, fazenda, quantidade, valor_compra,
       dataCompra.toISOString().split('T')[0], fase2.toISOString().split('T')[0],
       fase3.toISOString().split('T')[0], fase4.toISOString().split('T')[0], comprovante]
    )
    if (error) return res.status(500).json({ error: error.message })

    await query(
      `INSERT INTO transacoes (tipo, lote_id, lote_codigo, de_jogador, para_jogador, quantidade, valor, fase, status)
       VALUES ('compra_npc',$1,$2,'Gov. NPC',$3,$4,$5,'bezerro','concluido')`,
      [data.id, codigo, jogador_nome, quantidade, valor_compra]
    )

    return res.json(data)
  }

  res.status(405).end()
}
