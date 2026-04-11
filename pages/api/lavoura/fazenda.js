import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'
import { ensureLavouraTables } from '../../../lib/lavoura_schema'

export default async function handler(req, res) {
  await ensureLavouraTables()

  const token = getTokenFromReq(req)
  const user  = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  const jogador_id = user.id

  // GET — retorna capacidade de pasto da fazenda + pastos ativos
  if (req.method === 'GET') {
    // Upsert: cria registro se não existir
    await query(
      `INSERT INTO lavoura_fazenda (jogador_id, capacidade_base, boost_capim)
       VALUES ($1, 40, 0) ON CONFLICT (jogador_id) DO NOTHING`,
      [jogador_id]
    )

    const { data: faz } = await queryOne(
      `SELECT * FROM lavoura_fazenda WHERE jogador_id = $1`, [jogador_id]
    )

    // Pastos expirados — zera boost de campos liberados vencidos
    const { data: expirados } = await query(
      `UPDATE lavoura_campos
       SET status='esgotado', atualizado_em=now()
       WHERE jogador_id=$1 AND status='liberado' AND fim_pasto < now()
       RETURNING area_ha, clima`,
      [jogador_id]
    )

    // Se tinha pastos expirados, recalcula boost baseado nos pastos ainda ativos
    if (expirados && expirados.length > 0) {
      const CLIMAS_MULT = { ideal:1.8, normal:1.5, chuva:1.5, seca:1.0, granizo:0.7, praga:0.9 }
      const { data: ativos } = await query(
        `SELECT area_ha, clima FROM lavoura_campos
         WHERE jogador_id=$1 AND status='liberado' AND fim_pasto > now()`,
        [jogador_id]
      )
      const boostAtual = (ativos||[]).reduce((s, c) => {
        return s + parseFloat(c.area_ha) * (CLIMAS_MULT[c.clima||'normal'] || 1.5)
      }, 0)
      await query(
        `UPDATE lavoura_fazenda SET boost_capim=$1, atualizado_em=now() WHERE jogador_id=$2`,
        [parseFloat(boostAtual.toFixed(2)), jogador_id]
      )
      faz.boost_capim = parseFloat(boostAtual.toFixed(2))
    }

    const limiteMax = parseFloat(faz.capacidade_base) * 1.8
    return res.json({
      ...faz,
      limite_max: limiteMax,
      boost_disponivel: parseFloat((limiteMax - parseFloat(faz.capacidade_base) - parseFloat(faz.boost_capim)).toFixed(2)),
      pasto_total: parseFloat((parseFloat(faz.capacidade_base) + parseFloat(faz.boost_capim)).toFixed(2)),
    })
  }

  res.status(405).end()
}
