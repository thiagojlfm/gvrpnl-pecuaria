import { query } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
  if (req.method !== 'POST') return res.status(405).end()

  await query(`UPDATE caminhoes SET status='disponivel' WHERE status='em_rota'`, [])
  await query(`DELETE FROM fretes_transportadora WHERE status='disponivel'`, [])
  await query(`UPDATE fretes_transportadora SET status='cancelado' WHERE status IN ('em_rota_buscar','em_rota_fazenda')`, [])

  await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
    [user.username, 'Reset transportadora', 'Caminhões liberados, fretes pendentes cancelados'])

  return res.json({ ok: true })
}
