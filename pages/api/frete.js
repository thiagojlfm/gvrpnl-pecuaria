import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  if (req.method === 'GET') {
    if (!user) return res.status(401).json({ error: 'Nao autorizado' })

    const { lote_id, jogador_id } = req.query

    if (lote_id) {
      const { data } = await queryOne(`SELECT * FROM frete WHERE lote_id = $1 ORDER BY id DESC LIMIT 1`, [lote_id])
      if (data && user.role !== 'admin' && String(data.jogador_id) !== String(user.id)) {
        return res.status(403).json({ error: 'Sem permissao' })
      }
      return res.json(data || null)
    }

    if (jogador_id) {
      if (user.role !== 'admin' && String(jogador_id) !== String(user.id)) {
        return res.status(403).json({ error: 'Sem permissao' })
      }

      const { data } = await query(
        `SELECT * FROM frete WHERE jogador_id = $1 AND status IN ('em_rota_buscar','em_rota_fazenda') ORDER BY id DESC`,
        [jogador_id]
      )
      return res.json(data || [])
    }

    return res.json([])
  }

  if (!user) return res.status(401).json({ error: 'Nao autorizado' })

  if (req.method === 'POST') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissao' })

    const { lote_id, jogador_id, fazenda_id } = req.body
    const buscaEm = new Date(Date.now() + 15 * 60 * 1000)
    const chegaEm = new Date(Date.now() + 30 * 60 * 1000)

    const { data, error } = await queryOne(
      `INSERT INTO frete (lote_id, jogador_id, fazenda_id, status, chega_em, busca_em)
       VALUES ($1,$2,$3,'em_rota_buscar',$4,$5) RETURNING *`,
      [lote_id, jogador_id, fazenda_id || null, chegaEm.toISOString(), buscaEm.toISOString()]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'PATCH') {
    const { id, status } = req.body
    const { data: frete } = await queryOne(`SELECT * FROM frete WHERE id = $1`, [id])
    if (!frete) return res.status(404).json({ error: 'Frete nao encontrado' })

    const ehDono = String(frete.jogador_id) === String(user.id)
    if (user.role !== 'admin' && !ehDono) {
      return res.status(403).json({ error: 'Sem permissao' })
    }
    if (user.role !== 'admin' && status !== 'entregue') {
      return res.status(403).json({ error: 'Jogador so pode confirmar a propria entrega' })
    }

    const { data, error } = await queryOne(
      `UPDATE frete SET status=$1 WHERE id=$2 RETURNING *`,
      [status, id]
    )
    if (error) return res.status(500).json({ error: error.message })

    if (status === 'entregue' && data?.lote_id) {
      await query(`UPDATE lotes SET status='ativo' WHERE id=$1`, [data.lote_id])
      await query(
        `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [data.jogador_id, 'Bezerros chegaram!', 'Seu gado foi entregue na fazenda e ja esta no seu rebanho!']
      )
    }

    if (status === 'entregue') {
      const { data: fretesTrans } = await query(
        `SELECT id, caminhao_id FROM fretes_transportadora
         WHERE lote_id = $1 AND status IN ('em_rota_buscar','em_rota_fazenda')`,
        [data?.lote_id]
      )

      for (const ft of fretesTrans || []) {
        await query(`UPDATE fretes_transportadora SET status='entregue' WHERE id=$1`, [ft.id])
        if (ft.caminhao_id) {
          await query(`UPDATE caminhoes SET status='disponivel' WHERE id=$1`, [ft.caminhao_id])
        }
      }
    }

    return res.json(data)
  }

  res.status(405).end()
}
