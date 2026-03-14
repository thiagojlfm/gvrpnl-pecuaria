import { query } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })

  if (req.method === 'POST') {
    const { tipo, lote_id, jogador_id } = req.body

    // Excluir lote individual — lote_id é UUID
    if (tipo === 'lote' && lote_id) {
      await query(`DELETE FROM chat_anuncios WHERE anuncio_id IN (SELECT id FROM anuncios WHERE lote_id = $1)`, [lote_id])
      await query(`DELETE FROM anuncios WHERE lote_id = $1`, [lote_id])
      await query(`DELETE FROM transacoes WHERE lote_id = $1`, [lote_id])
      await query(`DELETE FROM lotes WHERE id = $1`, [lote_id])
      return res.json({ ok: true, msg: 'Lote removido' })
    }

    // Reset rebanho de um jogador
    if (tipo === 'jogador' && jogador_id) {
      await query(`DELETE FROM chat_anuncios WHERE anuncio_id IN (SELECT id FROM anuncios WHERE lote_id IN (SELECT id FROM lotes WHERE jogador_id = $1))`, [jogador_id])
      await query(`DELETE FROM anuncios WHERE lote_id IN (SELECT id FROM lotes WHERE jogador_id = $1)`, [jogador_id])
      await query(`DELETE FROM transacoes WHERE lote_id IN (SELECT id FROM lotes WHERE jogador_id = $1)`, [jogador_id])
      await query(`DELETE FROM lotes WHERE jogador_id = $1`, [jogador_id])
      await query(`DELETE FROM solicitacoes WHERE jogador_id = $1`, [jogador_id])
      await query(`UPDATE estoque_racao SET kg_disponivel = 0 WHERE jogador_id = $1`, [jogador_id])
      return res.json({ ok: true })
    }

    // Reset completo
    if (tipo === 'rebanho_completo') {
      await query(`DELETE FROM chat_anuncios`, [])
      await query(`DELETE FROM anuncios`, [])
      await query(`DELETE FROM transacoes`, [])        // limpa ranking
      await query(`DELETE FROM lotes`, [])
      await query(`DELETE FROM solicitacoes`, [])
      await query(`DELETE FROM pedidos_racao`, [])
      await query(`DELETE FROM fretes_transportadora`, [])
      await query(`DELETE FROM frete`, [])
      await query(`UPDATE estoque_racao SET kg_disponivel = 0`, [])
      await query(`UPDATE caminhoes SET status='disponivel'`, []) // libera caminhões
      return res.json({ ok: true, msg: 'Rebanho resetado' })
    }

    return res.status(400).json({ error: 'tipo inválido' })
  }

  res.status(405).end()
}
