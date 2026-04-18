import { query } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user  = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // Admin vê tudo; jogador vê apenas as próprias transações (como origem ou destino)
  const sql = user.role === 'admin'
    ? `SELECT * FROM transacoes ORDER BY criado_em DESC LIMIT 100`
    : `SELECT * FROM transacoes WHERE de_jogador = $1 OR para_jogador = $1 ORDER BY criado_em DESC LIMIT 100`
  const params = user.role === 'admin' ? [] : [user.username]

  const { data, error } = await query(sql, params)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}
