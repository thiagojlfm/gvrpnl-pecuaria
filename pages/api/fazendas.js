import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

// Capacity rules per hectare
const CAP = { bezerro: 3, garrote: 2, boi: 1, abatido: 1 }

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  // GET — list all or single
  if (req.method === 'GET') {
    const { id, minha } = req.query

    if (id) {
      const { data: f } = await queryOne(`SELECT * FROM fazendas WHERE id = $1`, [id])
      if (!f) return res.status(404).json({ error: 'Fazenda não encontrada' })
      // Get lotes on this farm
      const { data: lotes } = await query(`SELECT * FROM lotes WHERE fazenda_id = $1 AND status NOT IN ('pago','vendido')`, [id])
      // Get custos
      const { data: custos } = await query(`SELECT * FROM custos_fazenda WHERE fazenda_id = $1 ORDER BY criado_em DESC`, [id])
      // Calc capacity used
      const usada = (lotes||[]).reduce((s,l) => {
        const equiv = l.quantidade / (CAP[l.fase] || 1)
        return s + equiv
      }, 0)
      return res.json({ ...f, lotes: lotes||[], custos: custos||[], capacidade_usada: Math.round(usada * 10) / 10 })
    }

    if (minha && user) {
      const { data } = await query(`SELECT * FROM fazendas WHERE dono_id = $1`, [user.id])
      return res.json(data || [])
    }

    const { data } = await query(`SELECT * FROM fazendas ORDER BY codigo ASC`, [])
    return res.json(data || [])
  }

  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // PATCH — admin updates fazenda (preço, dono, nome)
  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id, preco, dono_id, dono_nome, nome, status } = req.body

    const updates = [], vals = []
    let i = 1
    if (preco !== undefined) { updates.push(`preco=$${i++}`); vals.push(preco) }
    if (dono_id !== undefined) { updates.push(`dono_id=$${i++}`); vals.push(dono_id || null) }
    if (dono_nome !== undefined) { updates.push(`dono_nome=$${i++}`); vals.push(dono_nome || null) }
    if (nome !== undefined) { updates.push(`nome=$${i++}`); vals.push(nome) }
    if (status !== undefined) { updates.push(`status=$${i++}`); vals.push(status) }
    if (dono_id) { updates.push(`comprado_em=now()`) }
    if (!updates.length) return res.status(400).json({ error: 'Nada para atualizar' })

    vals.push(id)
    const { data, error } = await queryOne(
      `UPDATE fazendas SET ${updates.join(',')} WHERE id=$${i} RETURNING *`, vals
    )
    if (error) return res.status(500).json({ error: error.message })

    // Log admin action
    await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
      [user.username, 'Fazenda atualizada', `Fazenda ${data?.codigo} — ${JSON.stringify(req.body)}`])

    return res.json(data)
  }

  res.status(405).end()
}
