import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'
import { ensureLavouraTables } from '../../../lib/lavoura_schema'

const CAP_MARCA = { Valtra: 30, 'John Deere': 70, Fendt: 150 }

export default async function handler(req, res) {
  await ensureLavouraTables()

  const token = getTokenFromReq(req)
  const user  = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // GET — lista garagem do jogador (próprias + alugadas ativas)
  if (req.method === 'GET') {
    const jogador_id = (req.query.jogador_id && user.role === 'admin')
      ? req.query.jogador_id
      : user.id

    // Máquinas próprias (com info de aluguel ativo, se houver)
    const { data: proprias } = await query(`
      SELECT lg.*,
        la.locatario_nome AS alugado_para_nome,
        la.fim_aluguel    AS alugado_ate,
        la.id             AS aluguel_id
      FROM lavoura_garagem lg
      LEFT JOIN lavoura_alugueis la
        ON la.maquina_id = lg.id AND la.status = 'ativo'
      WHERE lg.jogador_id = $1
      ORDER BY lg.criado_em ASC
    `, [jogador_id])

    // Máquinas alugadas de outros jogadores (ativas)
    const { data: alugadas } = await query(`
      SELECT lg.id, lg.tipo, lg.marca, lg.nome, lg.capacidade,
             la.fim_aluguel, la.dono_nome, la.id AS aluguel_id,
             true AS alugado
      FROM lavoura_alugueis la
      JOIN lavoura_garagem lg ON lg.id = la.maquina_id
      WHERE la.locatario_id = $1 AND la.status = 'ativo' AND la.fim_aluguel > now()
    `, [jogador_id])

    return res.json([...(proprias||[]), ...(alugadas||[]).map(m => ({ ...m, alugado: true }))])
  }

  // POST — admin adiciona máquina
  if (req.method === 'POST') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { jogador_id, tipo, marca, nome } = req.body
    const capacidade = CAP_MARCA[marca] || null
    if (!jogador_id || !tipo || !marca || !nome)
      return res.status(400).json({ error: 'jogador_id, tipo, marca e nome são obrigatórios' })

    const { data, error } = await queryOne(
      `INSERT INTO lavoura_garagem (jogador_id, tipo, marca, nome, capacidade)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [jogador_id, tipo, marca, nome, capacidade]
    )
    if (error) return res.status(500).json({ error: error.message })
    await query(
      `INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
      [user.username, 'Máquina adicionada', `${nome} (${tipo}) → jogador ${jogador_id}`]
    )
    return res.json(data)
  }

  // DELETE — admin remove máquina
  if (req.method === 'DELETE') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id } = req.body
    const { data, error } = await queryOne(
      `DELETE FROM lavoura_garagem WHERE id = $1 RETURNING *`, [id]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  res.status(405).end()
}
