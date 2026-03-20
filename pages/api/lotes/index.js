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

    // Auto-resolve fretes that have expired — set em_transito lotes to ativo
    await query(`
      UPDATE lotes SET status='ativo'
      WHERE status='em_transito'
      AND id IN (
        SELECT lote_id FROM frete
        WHERE status IN ('em_rota_buscar','em_rota_fazenda')
        AND chega_em < NOW()
      )
    `, [])

    // Also mark those fretes as entregue
    await query(`
      UPDATE frete SET status='entregue'
      WHERE status IN ('em_rota_buscar','em_rota_fazenda')
      AND chega_em < NOW()
    `, [])

    const { data, error } = await query(q, params)
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'POST') {
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { jogador_id, jogador_nome, fazenda, fazenda_id, quantidade, valor_compra, data_compra, comprovante } = req.body

    // Check fazenda capacity if provided
    if (fazenda_id) {
      const { data: faz } = await queryOne(`SELECT * FROM fazendas WHERE id = $1`, [fazenda_id])
      if (faz) {
        const { data: lotesAtivos } = await query(
          `SELECT fase, quantidade FROM lotes WHERE fazenda_id = $1 AND status NOT IN ('pago','vendido')`, [fazenda_id]
        )
        const CAP = { bezerro: 3, garrote: 2, boi: 1, abatido: 1 }
        const usada = (lotesAtivos||[]).reduce((s,l) => s + l.quantidade / (CAP[l.fase]||1), 0)
        const novaCapacidade = usada + (quantidade / 3)
        if (novaCapacidade > faz.tamanho_ha) {
          return res.status(400).json({ error: `Fazenda sem capacidade! Usada: ${Math.round(usada)}/${faz.tamanho_ha} ha equiv.` })
        }
      }
    }

    // Generate unique codigo
    const { data: maxData } = await query("SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 3) AS INTEGER)),0) as mx FROM lotes WHERE codigo ~ '^L-[0-9]+'", [])
    const nextNum = (parseInt(maxData?.[0]?.mx || 0)) + 1
    const codigo = `L-${String(nextNum).padStart(3, '0')}`

    const dataCompra = new Date(data_compra || new Date())
    const fase2 = new Date(dataCompra); fase2.setDate(fase2.getDate() + 7)
    const fase3 = new Date(dataCompra); fase3.setDate(fase3.getDate() + 14)
    const fase4 = new Date(dataCompra); fase4.setDate(fase4.getDate() + 21)

    const { data, error } = await queryOne(
      `INSERT INTO lotes (codigo, jogador_id, jogador_nome, fazenda, fazenda_id, quantidade, fase, peso_kg, valor_compra, data_compra, data_fase2, data_fase3, data_fase4, status, comprovante)
       VALUES ($1,$2,$3,$4,$5,$6,'bezerro',180,$7,$8,$9,$10,$11,'ativo',$12) RETURNING *`,
      [codigo, jogador_id, jogador_nome, fazenda||'', fazenda_id||null, quantidade, valor_compra||800,
       dataCompra.toISOString().split('T')[0], fase2.toISOString().split('T')[0],
       fase3.toISOString().split('T')[0], fase4.toISOString().split('T')[0], comprovante||'']
    )
    if (error) return res.status(500).json({ error: error.message })

    await query(
      `INSERT INTO transacoes (tipo, lote_id, lote_codigo, de_jogador, para_jogador, quantidade, valor, fase, status)
       VALUES ('compra_npc',$1,$2,'Posto Agropecuário',$3,$4,$5,'bezerro','concluido')`,
      [data.id, codigo, jogador_nome, quantidade, quantidade * (valor_compra||800)]
    )

    await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
      [user.username, 'Lote registrado', `${codigo} — ${jogador_nome} — ${quantidade} cab.`])

    return res.json(data)
  }

  res.status(405).end()
}
