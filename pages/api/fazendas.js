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
      const { data: fazendas } = await query(`SELECT * FROM fazendas WHERE dono_id = $1`, [user.id])
      // Also include campos de pastagem NPC associados
      const { data: campos } = await query(
        `SELECT a.*, a.campo_id as fazenda_codigo FROM alugueis_pasto a
         WHERE a.jogador_id=$1 AND a.status='ativo' AND a.valido_ate > NOW()`,
        [user.id]
      )
      // Convert campos to fazenda-like objects
      const CAMPOS_INFO = {
        1: {ha:20,nome:'Campo Verde Norte',regiao:'Green Hills Norte',foto_url:'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=600&q=80'},
        2: {ha:35,nome:'Pastagem Rio Claro',regiao:'Green Hills Sul',foto_url:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80'},
        3: {ha:50,nome:'Campo Dourado Oeste',regiao:'Lake Ville',foto_url:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80'},
        4: {ha:25,nome:'Pasto Serra Alta',regiao:'Green Hills Talhões',foto_url:'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=600&q=80'},
        5: {ha:40,nome:'Retiro Bela Vista',regiao:'Lake Ville Talhões',foto_url:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80'},
        6: {ha:70,nome:'Campo Novo Horizonte',regiao:'Green Hills',foto_url:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80'},
      }
      const camposFormatados = (campos||[]).map(c => {
        const info = CAMPOS_INFO[c.campo_id] || {}
        return {
          id: `pasto_${c.campo_id}`,
          codigo: `P-${String(c.campo_id).padStart(3,'0')}`,
          nome: c.campo_nome || info.nome,
          regiao: info.regiao || 'Green Hills',
          tamanho_ha: info.ha || c.ha_alugado,
          tipologia: 'Pastagem',
          foto_url: info.foto_url,
          dono_id: user.id,
          dono_nome: user.username,
          status: 'alugado',
          tipo: 'pasto_npc',
          valido_ate: c.valido_ate,
          preco: c.valor_pago,
        }
      })
      return res.json([...(fazendas||[]), ...camposFormatados])
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
