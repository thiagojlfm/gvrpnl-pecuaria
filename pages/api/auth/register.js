import bcrypt from 'bcryptjs'
import { query, queryOne } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { username, password, fazenda } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Campos obrigatórios' })
  if (username.length < 3) return res.status(400).json({ error: 'Usuário precisa ter pelo menos 3 caracteres' })
  if (password.length < 6) return res.status(400).json({ error: 'Senha precisa ter pelo menos 6 caracteres' })

  // Checar se username já existe
  const { data: existing } = await queryOne(
    'SELECT id FROM usuarios WHERE username = $1', [username]
  )
  if (existing) return res.status(400).json({ error: 'Usuário já existe' })

  const hash = await bcrypt.hash(password, 10)
  const { data, error } = await queryOne(
    `INSERT INTO usuarios (username, password_hash, role, fazenda, status)
     VALUES ($1, $2, 'jogador', $3, 'pendente') RETURNING id, username, role, fazenda, status`,
    [username, hash, fazenda || null]
  )
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, message: 'Cadastro enviado! Aguarde aprovação do admin.' })
}
