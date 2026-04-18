import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  if (req.method === 'GET') {
    const { data, error } = await query(
      `SELECT * FROM anuncios WHERE status='ativo' ORDER BY criado_em DESC`,
      []
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (!user) return res.status(401).json({ error: 'Nao autorizado' })

  if (req.method === 'POST') {
    const { lote_id, preco_pedido, obs } = req.body
    const precoPedidoNum = Number(preco_pedido || 0)

    if (!lote_id || precoPedidoNum <= 0) {
      return res.status(400).json({ error: 'Dados do anuncio invalidos' })
    }

    const { data: lote } = await queryOne(`SELECT * FROM lotes WHERE id = $1`, [lote_id])
    if (!lote) return res.status(404).json({ error: 'Lote nao encontrado' })
    if (String(lote.jogador_id) !== String(user.id)) {
      return res.status(403).json({ error: 'Esse lote nao pertence ao jogador logado' })
    }
    if (lote.status !== 'ativo') {
      return res.status(400).json({ error: 'So e possivel anunciar lotes ativos' })
    }
    if (lote.fase === 'bezerro' || lote.fase === 'abatido') {
      return res.status(400).json({ error: 'Apenas garrote e boi podem ser anunciados' })
    }

    const { data: anuncioAtivo } = await queryOne(
      `SELECT id FROM anuncios WHERE lote_id = $1 AND status = 'ativo'`,
      [lote_id]
    )
    if (anuncioAtivo) {
      return res.status(400).json({ error: 'Esse lote ja possui anuncio ativo' })
    }

    const { data, error } = await queryOne(
      `INSERT INTO anuncios (lote_id, lote_codigo, vendedor_id, vendedor_nome, fazenda, fase, quantidade, peso_kg, preco_pedido, obs, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ativo') RETURNING *`,
      [
        lote.id,
        lote.codigo,
        user.id,
        user.username,
        lote.fazenda || user.fazenda,
        lote.fase,
        lote.quantidade,
        lote.peso_kg,
        precoPedidoNum,
        obs,
      ]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissao' })

    const { anuncio_id, comprador_nome, preco_final, lote_id } = req.body
    const { data: anuncio } = await queryOne(`SELECT * FROM anuncios WHERE id=$1`, [anuncio_id])
    if (!anuncio) return res.status(404).json({ error: 'Anuncio nao encontrado' })

    await query(`UPDATE anuncios SET status='vendido' WHERE id=$1`, [anuncio_id])
    await query(`UPDATE lotes SET jogador_nome=$1, status='ativo' WHERE id=$2`, [comprador_nome, lote_id])
    await query(
      `INSERT INTO transacoes (tipo, lote_id, lote_codigo, de_jogador, para_jogador, quantidade, valor, fase, status)
       VALUES ('p2p',$1,$2,$3,$4,$5,$6,$7,'concluido')`,
      [lote_id, anuncio.lote_codigo, anuncio.vendedor_nome, comprador_nome, anuncio.quantidade, preco_final, anuncio.fase]
    )
    return res.json({ ok: true })
  }

  res.status(405).end()
}
