import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  const { id } = req.query
  const { action, ...body } = req.body

  const { data: lote } = await queryOne('SELECT * FROM lotes WHERE id = $1', [id])
  if (!lote) return res.status(404).json({ error: 'Lote não encontrado' })

  if (action === 'solicitar_abate') {
    if (user.role !== 'admin' && user.id !== lote.jogador_id)
      return res.status(403).json({ error: 'Sem permissão' })
    if (lote.fase !== 'abatido')
      return res.status(400).json({ error: 'Lote ainda não está na fase de abate' })
    const precoKg = body.preco_kg || 5
    const valorAbate = lote.quantidade * 648 * precoKg
    const { data, error } = await queryOne(
      `UPDATE lotes SET status='aguardando_pagamento', valor_abate=$1 WHERE id=$2 RETURNING *`,
      [valorAbate, id]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (action === 'marcar_pago') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { data, error } = await queryOne(
      `UPDATE lotes SET status='pago' WHERE id=$1 RETURNING *`, [id]
    )
    if (error) return res.status(500).json({ error: error.message })
    await query(
      `INSERT INTO transacoes (tipo, lote_id, lote_codigo, de_jogador, para_jogador, quantidade, valor, fase, status)
       VALUES ('abate',$1,$2,$3,'Frigorífico NPC',$4,$5,'abatido','pago')`,
      [lote.id, lote.codigo, lote.jogador_nome, lote.quantidade, lote.valor_abate]
    )
    return res.json(data)
  }

  if (action === 'avancar_fase') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const fases = ['bezerro','garrote','boi','abatido']
    const pesos = { bezerro:180, garrote:400, boi:540, abatido:648 }
    const idx = fases.indexOf(lote.fase)
    if (idx >= 3) return res.status(400).json({ error: 'Já está na fase final' })
    const novaFase = fases[idx + 1]
    const { data, error } = await queryOne(
      `UPDATE lotes SET fase=$1, peso_kg=$2 WHERE id=$3 RETURNING *`,
      [novaFase, pesos[novaFase], id]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  res.status(400).json({ error: 'Ação inválida' })
}
