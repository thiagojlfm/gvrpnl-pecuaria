import { query } from '../../lib/db'

export default async function handler(req, res) {
  const { data, error } = await query(
    `SELECT * FROM transacoes ORDER BY criado_em DESC LIMIT 100`, []
  )
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}
