import { query, queryOne } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import bcrypt from 'bcryptjs'

async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await query(
      `SELECT id, username, role, fazenda, criado_em FROM usuarios ORDER BY criado_em DESC`, []
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }
  if (req.method === 'POST') {
    const { username, password, fazenda } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Campos obrigatórios' })
    const hash = await bcrypt.hash(password, 10)
    const { data, error } = await queryOne(
      `INSERT INTO usuarios (username, password_hash, role, fazenda) VALUES ($1,$2,'jogador',$3) RETURNING id, username, role, fazenda`,
      [username, hash, fazenda]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }
  if (req.method === 'DELETE') {
    const { id } = req.body
    await query(`DELETE FROM usuarios WHERE id=$1`, [id])
    return res.json({ ok: true })
  }
  res.status(405).end()
}

export default requireAuth(handler, 'admin')
