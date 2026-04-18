import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

const TIPOS_CUSTO = [
  { tipo: 'cerca', label: 'Reforma de Cerca', desc: 'Manutencao e reparo das cercas do pasto' },
  { tipo: 'vacina', label: 'Vacinacao', desc: 'Aplicacao de vacinas no rebanho' },
  { tipo: 'pasto', label: 'Limpeza de Pasto', desc: 'Rocagem e limpeza da area de pastagem' },
  { tipo: 'bebedouro', label: 'Reparo de Bebedouro', desc: 'Manutencao dos bebedouros' },
  { tipo: 'vaqueiro', label: 'Vaqueiro', desc: 'Contratacao de vaqueiro (1 por 60 cabecas)' },
  { tipo: 'veterinario', label: 'Veterinario', desc: 'Visita veterinaria ao rebanho' },
]

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Nao autorizado' })

  if (req.method === 'GET') {
    if (req.query.tipos) return res.json(TIPOS_CUSTO)

    const { fazenda_id } = req.query
    if (!fazenda_id) return res.status(400).json({ error: 'fazenda_id obrigatorio' })

    const { data: fazenda } = await queryOne(`SELECT id, dono_id FROM fazendas WHERE id = $1`, [fazenda_id])
    if (!fazenda) return res.status(404).json({ error: 'Fazenda nao encontrada' })
    if (user.role !== 'admin' && String(fazenda.dono_id) !== String(user.id)) {
      return res.status(403).json({ error: 'Sem permissao' })
    }

    const { data } = await query(
      `SELECT * FROM custos_fazenda WHERE fazenda_id = $1 ORDER BY criado_em DESC`,
      [fazenda_id]
    )
    return res.json(data || [])
  }

  if (req.method === 'POST') {
    const { fazenda_id, tipo, descricao, valor, prestador_nome } = req.body
    const { data: fazenda } = await queryOne(`SELECT id, dono_id FROM fazendas WHERE id = $1`, [fazenda_id])
    if (!fazenda) return res.status(404).json({ error: 'Fazenda nao encontrada' })
    if (user.role !== 'admin' && String(fazenda.dono_id) !== String(user.id)) {
      return res.status(403).json({ error: 'Sem permissao' })
    }

    const { data, error } = await queryOne(
      `INSERT INTO custos_fazenda (fazenda_id, tipo, descricao, valor, prestador_nome, status)
       VALUES ($1,$2,$3,$4,$5,'pendente') RETURNING *`,
      [fazenda_id, tipo, descricao, valor, prestador_nome]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'PATCH') {
    const { id, status, comprovante } = req.body
    const { data: custo } = await queryOne(`SELECT * FROM custos_fazenda WHERE id = $1`, [id])
    if (!custo) return res.status(404).json({ error: 'Chamado nao encontrado' })

    const { data: fazenda } = await queryOne(`SELECT id, dono_id FROM fazendas WHERE id = $1`, [custo.fazenda_id])
    if (!fazenda) return res.status(404).json({ error: 'Fazenda nao encontrada' })
    if (user.role !== 'admin' && String(fazenda.dono_id) !== String(user.id)) {
      return res.status(403).json({ error: 'Sem permissao' })
    }

    const updates = [`status=$1`]
    const vals = [status]
    if (comprovante) {
      updates.push(`comprovante=$2`)
      vals.push(comprovante)
    }
    if (status === 'pago') updates.push(`pago_em=now()`)

    vals.push(id)
    const { data, error } = await queryOne(
      `UPDATE custos_fazenda SET ${updates.join(',')} WHERE id=$${vals.length} RETURNING *`,
      vals
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  res.status(405).end()
}
