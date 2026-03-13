import bcrypt from 'bcryptjs'
import { query } from '../../../lib/db'

export default async function handler(req, res) {
  const hash = await bcrypt.hash('admin123', 10)
  await query(`update usuarios set password_hash = $1 where username = 'admin'`, [hash])
  res.json({ ok: true, hash })
}
