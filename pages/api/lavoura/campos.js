import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'
import { ensureLavouraTables } from '../../../lib/lavoura_schema'

const _d = 86400000
const CAP_MARCA    = { Valtra: 30, 'John Deere': 70, Fendt: 150 }
const RECEITA_BASE = { milho: 1650, soja: 2000 }
const PRECO_RACAO  = 2
const CLIMAS = {
  ideal:  { mult: 1.20, diasExtra: 0, capimMult: 1.8 },
  normal: { mult: 1.00, diasExtra: 0, capimMult: 1.5 },
  chuva:  { mult: 1.00, diasExtra: 2, capimMult: 1.5 },
  seca:   { mult: 0.75, diasExtra: 0, capimMult: 1.0 },
  granizo:{ mult: 0.50, diasExtra: 0, capimMult: 0.7 },
  praga:  { mult: 0.60, diasExtra: 0, capimMult: 0.9 },
}
const CICLOS = { milho: 7, soja: 7, capim: 14 } // dias de crescimento

function durMs(ha, marca) {
  return (ha / (CAP_MARCA[marca] || 30)) * 24 * 3600000
}
function sortearClima() {
  const probs = [
    ['ideal', 0.15], ['normal', 0.35], ['chuva', 0.20],
    ['seca', 0.15], ['granizo', 0.10], ['praga', 0.05],
  ]
  const roll = Math.random()
  let acc = 0
  for (const [key, p] of probs) {
    acc += p
    if (roll < acc) return key
  }
  return 'normal'
}

async function creditarEstoqueRacao(jogador_id, kgRacao) {
  await query(
    `INSERT INTO estoque_racao (jogador_id, kg_disponivel)
     VALUES ($1, $2)
     ON CONFLICT (jogador_id) DO UPDATE
       SET kg_disponivel = estoque_racao.kg_disponivel + $2,
           atualizado_em = now()`,
    [jogador_id, kgRacao]
  )
}

export default async function handler(req, res) {
  await ensureLavouraTables()

  const token = getTokenFromReq(req)
  const user  = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // GET — lista campos do jogador
  if (req.method === 'GET') {
    const jogador_id = (user.role === 'admin' && req.query.jogador_id)
      ? req.query.jogador_id
      : user.id

    // Auto-avança campos cujo fim_op já passou (validação no backend)
    await autoAvancar(jogador_id)

    const { data, error } = await query(
      `SELECT * FROM lavoura_campos
       WHERE jogador_id = $1 AND status NOT IN ('colhido')
       ORDER BY criado_em DESC`,
      [jogador_id]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data || [])
  }

  // POST — plantar novo campo
  if (req.method === 'POST') {
    const { cultura, area_ha } = req.body
    const jogador_id = user.id

    if (!cultura || !area_ha)
      return res.status(400).json({ error: 'cultura e area_ha são obrigatórios' })

    // Validação: jogador tem trator e plantadeira?
    const { data: garagem } = await query(
      `SELECT tipo, marca FROM lavoura_garagem WHERE jogador_id = $1`, [jogador_id]
    )
    const temTrator      = garagem?.some(m => m.tipo === 'trator')
    const temPlantadeira = garagem?.some(m => m.tipo === 'plantadeira')
    if (!temTrator || !temPlantadeira)
      return res.status(400).json({ error: 'Você precisa de trator e plantadeira na garagem.' })

    // Deriva marca do trator a partir da garagem (não confia no cliente)
    const marca_maquina = garagem.find(m => m.tipo === 'trator')?.marca || 'Valtra'

    // Validação: capacidade da frota
    const capFrota = Math.min(
      CAP_MARCA[garagem.find(m => m.tipo === 'trator')?.marca] || 0,
      CAP_MARCA[garagem.find(m => m.tipo === 'plantadeira')?.marca] || 0
    )
    if (area_ha > capFrota)
      return res.status(400).json({ error: `Sua frota opera no máximo ${capFrota} ha/dia.` })

    // Validação hard cap capim
    if (cultura === 'capim') {
      const { data: faz } = await queryOne(
        `SELECT capacidade_base, boost_capim FROM lavoura_fazenda WHERE jogador_id = $1`, [jogador_id]
      )
      if (faz) {
        const limiteMax  = faz.capacidade_base * 1.8
        const boostMax   = limiteMax - faz.capacidade_base
        if (faz.boost_capim >= boostMax)
          return res.status(400).json({ error: `Limite de pasto atingido! Máximo: ${limiteMax} ha (base × 1,8).` })
      }
    }

    const CULTURAS_CUSTO = { milho: 1100, soja: 1300, capim: 500 }
    const custo_total = area_ha * (CULTURAS_CUSTO[cultura] || 1000)
    const now         = new Date()
    const fim_op      = new Date(now.getTime() + durMs(area_ha, marca_maquina))

    const { data, error } = await queryOne(
      `INSERT INTO lavoura_campos
         (jogador_id, cultura, area_ha, marca_maquina, status, custo_total, inicio_op, fim_op)
       VALUES ($1,$2,$3,$4,'arando',$5,$6,$7) RETURNING *`,
      [jogador_id, cultura, area_ha, marca_maquina, custo_total, now.toISOString(), fim_op.toISOString()]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // PATCH — atualizar status: revelar clima, iniciar colheita, liberar capim
  if (req.method === 'PATCH') {
    const { id, action } = req.body
    if (!id || !action) return res.status(400).json({ error: 'id e action são obrigatórios' })

    const { data: campo } = await queryOne(
      `SELECT * FROM lavoura_campos WHERE id = $1`, [id]
    )
    if (!campo) return res.status(404).json({ error: 'Campo não encontrado' })

    // Apenas admin ou dono podem alterar
    if (user.role !== 'admin' && String(campo.jogador_id) !== String(user.id))
      return res.status(403).json({ error: 'Sem permissão' })

    // ── revelar_clima ──────────────────────────────────────────────────────
    if (action === 'revelar_clima') {
      if (campo.clima) return res.status(400).json({ error: 'Clima já revelado' })
      if (!['crescendo','pronto','pronto_capim'].includes(campo.status))
        return res.status(400).json({ error: 'Clima só pode ser revelado durante crescimento ou quando pronto' })
      const clima = sortearClima()
      const { data, error } = await queryOne(
        `UPDATE lavoura_campos SET clima=$1, atualizado_em=now() WHERE id=$2 RETURNING *`,
        [clima, id]
      )
      if (error) return res.status(500).json({ error: error.message })
      return res.json(data)
    }

    // ── iniciar_colheita ───────────────────────────────────────────────────
    if (action === 'iniciar_colheita') {
      if (campo.status !== 'pronto')
        return res.status(400).json({ error: 'Campo não está pronto para colheita' })
      if (!campo.clima)
        return res.status(400).json({ error: 'Revele o clima antes de colher' })

      // Valida colheitadeira
      const { data: garagem } = await query(
        `SELECT tipo, marca FROM lavoura_garagem WHERE jogador_id = $1`, [campo.jogador_id]
      )
      const colh = garagem?.find(m => m.tipo === 'colheitadeira')
      if (!colh) return res.status(400).json({ error: 'Sem colheitadeira na garagem' })

      const now     = new Date()
      const fim_op  = new Date(now.getTime() + durMs(campo.area_ha, colh.marca))
      const { data, error } = await queryOne(
        `UPDATE lavoura_campos SET status='colhendo', marca_maquina=$1, inicio_op=$2, fim_op=$3, atualizado_em=now()
         WHERE id=$4 RETURNING *`,
        [colh.marca, now.toISOString(), fim_op.toISOString(), id]
      )
      if (error) return res.status(500).json({ error: error.message })
      return res.json(data)
    }

    // ── concluir_colheita ──────────────────────────────────────────────────
    // Chamado pelo backend auto-avanço ou pelo frontend quando fim_op passou
    if (action === 'concluir_colheita') {
      if (campo.status !== 'colhendo')
        return res.status(400).json({ error: 'Campo não está colhendo' })

      // Validação de tempo no backend — não confia no frontend
      if (campo.fim_op && new Date(campo.fim_op) > new Date())
        return res.status(400).json({ error: 'Colheita ainda não concluída' })

      const cli      = CLIMAS[campo.clima || 'normal']
      const receita  = Math.round(campo.area_ha * (RECEITA_BASE[campo.cultura] || 0) * cli.mult)
      const custo    = parseFloat(campo.custo_total)
      const lucro    = receita - custo
      const prejuizo = lucro < 0

      let resultado = ''

      if (campo.cultura === 'soja') {
        resultado = `$${receita} — ADDMONEY${prejuizo ? ' ⚠️ PREJUÍZO' : ''}`
      } else if (campo.cultura === 'milho') {
        const kgRacao = Math.round(receita / PRECO_RACAO)
        resultado = `+${kgRacao} kg ração`
        // Adiciona ao estoque de ração do jogador
        await creditarEstoqueRacao(campo.jogador_id, kgRacao)
      }

      const { data, error } = await queryOne(
        `UPDATE lavoura_campos SET status='colhido', resultado=$1, fim_op=null, atualizado_em=now()
         WHERE id=$2 RETURNING *`,
        [resultado, id]
      )
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ ...data, receita, lucro })
    }

    // ── liberar_capim ──────────────────────────────────────────────────────
    if (action === 'liberar_capim') {
      if (campo.status !== 'pronto_capim')
        return res.status(400).json({ error: 'Capim não está pronto para liberar' })
      if (!campo.clima)
        return res.status(400).json({ error: 'Revele o clima antes de liberar' })

      const cli           = CLIMAS[campo.clima || 'normal']
      const haPastoGerado = parseFloat((campo.area_ha * cli.capimMult).toFixed(2))

      const now       = new Date()
      const fim_pasto = new Date(now.getTime() + 30 * _d)

      // Upsert na lavoura_fazenda, respeitando o hard cap
      const { data: faz } = await queryOne(
        `SELECT capacidade_base, boost_capim FROM lavoura_fazenda WHERE jogador_id = $1`,
        [campo.jogador_id]
      )
      const base     = parseFloat(faz?.capacidade_base || 40)
      const boostAtual = parseFloat(faz?.boost_capim || 0)
      const boostMax = base * 0.8  // 1.8× total = base + 0.8× base de boost
      const novoBoost = Math.min(boostAtual + haPastoGerado, boostMax)

      await query(
        `INSERT INTO lavoura_fazenda (jogador_id, capacidade_base, boost_capim)
         VALUES ($1, $2, $3)
         ON CONFLICT (jogador_id) DO UPDATE
           SET boost_capim = $3, atualizado_em = now()`,
        [campo.jogador_id, base, novoBoost]
      )

      const { data, error } = await queryOne(
        `UPDATE lavoura_campos
         SET status='liberado', inicio_pasto=$1, fim_pasto=$2, resultado=$3, atualizado_em=now()
         WHERE id=$4 RETURNING *`,
        [now.toISOString(), fim_pasto.toISOString(), `${haPastoGerado} ha de pasto`, id]
      )
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ ...data, haPastoGerado, novoBoost })
    }

    return res.status(400).json({ error: `Action desconhecida: ${action}` })
  }

  res.status(405).end()
}

// ─── Auto-avanço backend ──────────────────────────────────────────────────────
// Valida timestamps no servidor — imune a manipulação de relógio do cliente
async function autoAvancar(jogador_id) {
  const now = new Date().toISOString()

  // arando → plantando
  await query(
    `UPDATE lavoura_campos
     SET status='plantando', inicio_op=now(),
         fim_op=now() + (area_ha / CASE marca_maquina WHEN 'Fendt' THEN 150 WHEN 'John Deere' THEN 70 ELSE 30 END * interval '1 day'),
         atualizado_em=now()
     WHERE jogador_id=$1 AND status='arando' AND fim_op < $2`,
    [jogador_id, now]
  )

  // plantando → crescendo (ciclo: 7d milho/soja, 14d capim)
  await query(
    `UPDATE lavoura_campos
     SET status='crescendo', inicio_op=now(),
         fim_op=now() + (CASE cultura WHEN 'capim' THEN interval '14 days' ELSE interval '7 days' END),
         atualizado_em=now()
     WHERE jogador_id=$1 AND status='plantando' AND fim_op < $2`,
    [jogador_id, now]
  )

  // crescendo → pronto / pronto_capim
  await query(
    `UPDATE lavoura_campos
     SET status=CASE cultura WHEN 'capim' THEN 'pronto_capim' ELSE 'pronto' END,
         fim_op=null, atualizado_em=now()
     WHERE jogador_id=$1 AND status='crescendo' AND fim_op < $2`,
    [jogador_id, now]
  )

  // colhendo → colhido (auto-conclusão quando fim_op passou)
  const { data: colhendos } = await query(
    `SELECT * FROM lavoura_campos WHERE jogador_id=$1 AND status='colhendo' AND fim_op < $2`,
    [jogador_id, now]
  )
  for (const campo of (colhendos || [])) {
    const cli     = CLIMAS[campo.clima || 'normal']
    const receita = Math.round(campo.area_ha * (RECEITA_BASE[campo.cultura] || 0) * cli.mult)
    let resultado = ''

    if (campo.cultura === 'soja') {
      resultado = `$${receita} — ADDMONEY`
    } else if (campo.cultura === 'milho') {
      const kgRacao = Math.round(receita / PRECO_RACAO)
      resultado = `+${kgRacao} kg ração`
      await creditarEstoqueRacao(campo.jogador_id, kgRacao)
    }

    await query(
      `UPDATE lavoura_campos SET status='colhido', resultado=$1, fim_op=null, atualizado_em=now()
       WHERE id=$2`,
      [resultado, campo.id]
    )
  }
}
