import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  if (req.method === 'GET') {
    const { data } = await queryOne(`SELECT id, username, fazenda, foto_url, bio, role, status, criado_em FROM usuarios WHERE id = $1`, [user.id])
    if (!data) return res.status(404).json({ error: 'Usuário não encontrado' })
    // Stats
    const { data: stats } = await queryOne(`
      SELECT COUNT(*) as total_abates, COALESCE(SUM(quantidade),0) as total_cabecas, COALESCE(SUM(valor),0) as total_ganho
      FROM transacoes WHERE tipo = 'abate' AND para_jogador = $1
    `, [data.username])
    return res.json({ ...data, stats })
  }

  if (req.method === 'PATCH') {
    const { fazenda, foto_url, bio, senha_atual, nova_senha, username, status, target_id } = req.body

    // Admin editando outro jogador
    const editId = user.role === 'admin' && target_id ? target_id : user.id

    const updates = []
    const vals = []
    let i = 1

    if (fazenda !== undefined) { updates.push(`fazenda=$${i++}`); vals.push(fazenda) }
    if (foto_url !== undefined) { updates.push(`foto_url=$${i++}`); vals.push(foto_url) }
    if (bio !== undefined) { updates.push(`bio=$${i++}`); vals.push(bio) }
    if (username !== undefined && user.role === 'admin') { updates.push(`username=$${i++}`); vals.push(username) }
    if (status !== undefined && user.role === 'admin') { updates.push(`status=$${i++}`); vals.push(status) }

    if (nova_senha) {
      if (user.role !== 'admin') {
        const { data: u } = await queryOne(`SELECT password_hash FROM usuarios WHERE id = $1`, [user.id])
        const ok = await bcrypt.compare(senha_atual, u?.password_hash || '')
        if (!ok) return res.status(400).json({ error: 'Senha atual incorreta' })
      }
      const hash = await bcrypt.hash(nova_senha, 10)
      updates.push(`password_hash=$${i++}`); vals.push(hash)
    }

    if (!updates.length) return res.status(400).json({ error: 'Nada para atualizar' })
    vals.push(editId)

    const { data, error } = await queryOne(
      `UPDATE usuarios SET ${updates.join(',')} WHERE id=$${i} RETURNING id, username, fazenda, foto_url, bio, role, status`,
      vals
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'POST') {
    // Marcar onboarding como visto
    await query(`UPDATE usuarios SET onboarding_ok = true WHERE id = $1`, [user.id])
    return res.json({ ok: true })
  }

  res.status(405).end()
}
