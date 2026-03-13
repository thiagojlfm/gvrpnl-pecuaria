import { queryOne } from '../../../lib/db'
import { signToken } from '../../../lib/auth'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Campos obrigatórios' })

  const { data: user, error } = await queryOne(
    'SELECT * FROM usuarios WHERE username = $1', [username]
  )
  if (error || !user) return res.status(401).json({ error: 'Usuário não encontrado' })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Senha incorreta' })

  const token = signToken({ id: user.id, username: user.username, role: user.role, fazenda: user.fazenda })
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, fazenda: user.fazenda } })
}
