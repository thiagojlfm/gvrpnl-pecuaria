import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

const TIPOS_CUSTO = [
  { tipo: 'cerca', label: 'Reforma de Cerca', desc: 'Manutenção e reparo das cercas do pasto' },
  { tipo: 'vacina', label: 'Vacinação', desc: 'Aplicação de vacinas no rebanho' },
  { tipo: 'pasto', label: 'Limpeza de Pasto', desc: 'Roçagem e limpeza da área de pastagem' },
  { tipo: 'bebedouro', label: 'Reparo de Bebedouro', desc: 'Manutenção dos bebedouros' },
  { tipo: 'vaqueiro', label: 'Vaqueiro', desc: 'Contratação de vaqueiro (1 por 60 cabeças)' },
  { tipo: 'veterinario', label: 'Veterinário', desc: 'Visita veterinária ao rebanho' },
]

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  if (req.method === 'GET') {
    if (req.query.tipos) return res.json(TIPOS_CUSTO)
    const { fazenda_id } = req.query
    const { data } = await query(
      `SELECT * FROM custos_fazenda WHERE fazenda_id = $1 ORDER BY criado_em DESC`, [fazenda_id]
    )
    return res.json(data || [])
  }

  // POST — dono abre um chamado de serviço
  if (req.method === 'POST') {
    const { fazenda_id, tipo, descricao, valor, prestador_nome } = req.body
    const { data, error } = await queryOne(
      `INSERT INTO custos_fazenda (fazenda_id, tipo, descricao, valor, prestador_nome, status)
       VALUES ($1,$2,$3,$4,$5,'pendente') RETURNING *`,
      [fazenda_id, tipo, descricao, valor, prestador_nome]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // PATCH — marcar como pago (dono) ou confirmar (admin)
  if (req.method === 'PATCH') {
    const { id, status, comprovante } = req.body
    const updates = [`status=$1`], vals = [status]
    if (comprovante) { updates.push(`comprovante=$2`); vals.push(comprovante) }
    if (status === 'pago') { updates.push(`pago_em=now()`) }
    vals.push(id)
    const { data, error } = await queryOne(
      `UPDATE custos_fazenda SET ${updates.join(',')} WHERE id=$${vals.length} RETURNING *`, vals
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  res.status(405).end()
}
