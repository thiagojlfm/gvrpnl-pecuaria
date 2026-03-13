import { query } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })

  if (req.method === 'POST') {
    const { tipo, lote_id } = req.body

    if (tipo === 'lote' && lote_id) {
      await query(`DELETE FROM lotes WHERE id = $1`, [lote_id])
      return res.json({ ok: true, msg: 'Lote removido' })
    }

    if (tipo === 'rebanho_completo') {
      await query(`DELETE FROM transacoes WHERE tipo IN ('compra_npc','abate','p2p','compra_racao')`, [])
      await query(`DELETE FROM anuncios`, [])
      await query(`DELETE FROM chat_anuncios`, [])
      await query(`DELETE FROM lotes`, [])
      await query(`UPDATE estoque_racao SET kg_disponivel = 0`, [])
      return res.json({ ok: true, msg: 'Rebanho resetado com sucesso' })
    }

    return res.status(400).json({ error: 'tipo inválido' })
  }

  res.status(405).end()
}
