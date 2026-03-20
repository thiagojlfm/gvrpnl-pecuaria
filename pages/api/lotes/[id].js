import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

const RACAO_FASE = { bezerro: 21, garrote: 35, boi: 56, abatido: 0 }
const PESOS = { bezerro:180, garrote:400, boi:540, abatido:648 }
const FASES = ['bezerro','garrote','boi','abatido']
const FASE_NOMES = { bezerro:'Bezerro', garrote:'Garrote', boi:'Boi', abatido:'Boi Abatido' }

async function notificar(jogador_id, titulo, mensagem) {
  await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
    [jogador_id, titulo, mensagem]).catch(()=>{})
}

async function logAdmin(admin_nome, acao, detalhes) {
  await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
    [admin_nome, acao, detalhes]).catch(()=>{})
}

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  const { id } = req.query
  const body = req.body || {}
  const { action } = body

  const { data: lote } = await queryOne('SELECT * FROM lotes WHERE id = $1', [id])
  if (!lote) return res.status(404).json({ error: 'Lote não encontrado' })

  // ── SOLICITAR ABATE ──────────────────────────────────────────────────────
  if (action === 'solicitar_abate') {
    if (user.role !== 'admin' && String(user.id) !== String(lote.jogador_id))
      return res.status(403).json({ error: 'Sem permissão' })
    if (lote.fase !== 'abatido')
      return res.status(400).json({ error: 'Lote ainda não está na fase de abate' })
    const precoKg = Number(body.preco_kg) || 3
    const valorAbate = Math.round(lote.quantidade * 648 * precoKg)
    const { data, error } = await queryOne(
      `UPDATE lotes SET status='aguardando_pagamento', valor_abate=$1 WHERE id=$2 RETURNING *`,
      [valorAbate, id]
    )
    if (error) return res.status(500).json({ error: error.message })
    await logAdmin(user.username, 'Abate solicitado', `${lote.codigo} — ${lote.jogador_nome} — ${lote.quantidade} cab. — $${valorAbate}`)
    return res.json(data)
  }

  // ── MARCAR PAGO ──────────────────────────────────────────────────────────
  if (action === 'marcar_pago') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { data, error } = await queryOne(
      `UPDATE lotes SET status='pago' WHERE id=$1 RETURNING *`, [id]
    )
    if (error) return res.status(500).json({ error: error.message })
    await query(
      `INSERT INTO transacoes (tipo, lote_id, lote_codigo, de_jogador, para_jogador, quantidade, valor, fase, status)
       VALUES ('abate',$1,$2,$3,'Frigorífico NPC',$4,$5,'abatido','pago')`,
      [lote.id, lote.codigo, lote.jogador_nome, lote.quantidade, lote.valor_abate]
    )
    await notificar(lote.jogador_id, '💰 Abate pago!',
      `Lote ${lote.codigo} — ${lote.quantidade} cab. — $${lote.valor_abate} adicionado à sua conta.`)
    await logAdmin(user.username, 'Abate confirmado', `${lote.codigo} — ${lote.jogador_nome} — $${lote.valor_abate}`)
    return res.json(data)
  }

  // ── AVANÇAR FASE ─────────────────────────────────────────────────────────
  if (action === 'avancar_fase') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const idx = FASES.indexOf(lote.fase)
    if (idx >= 3) return res.status(400).json({ error: 'Já está na fase final' })
    const novaFase = FASES[idx + 1]

    // Descontar ração da fase que terminou
    const kgConsumidos = RACAO_FASE[lote.fase] * lote.quantidade
    if (kgConsumidos > 0) {
      await query(
        `UPDATE estoque_racao SET kg_disponivel = GREATEST(0, kg_disponivel - $1) WHERE jogador_id = $2`,
        [kgConsumidos, lote.jogador_id]
      )
    }

    // Recalcular datas a partir de HOJE para as fases FUTURAS (não a fase atual)
    const hoje = new Date()
    const datasUpdate = {}
    // idx+1 é a nova fase atual, idx+2 em diante são as futuras
    const fasesFuturas = FASES.slice(idx + 2)
    fasesFuturas.forEach((f, i) => {
      const d = new Date(hoje)
      d.setDate(d.getDate() + (i + 1) * 7)
      if (f === 'garrote') datasUpdate.data_fase2 = d.toISOString().split('T')[0]
      if (f === 'boi') datasUpdate.data_fase3 = d.toISOString().split('T')[0]
      if (f === 'abatido') datasUpdate.data_fase4 = d.toISOString().split('T')[0]
    })

    const setCols = Object.entries(datasUpdate).map(([k,v], i) => `${k}='${v}'`).join(',')
    const { data, error } = await queryOne(
      `UPDATE lotes SET fase=$1, peso_kg=$2${setCols ? ',' + setCols : ''} WHERE id=$3 RETURNING *`,
      [novaFase, PESOS[novaFase], id]
    )
    if (error) return res.status(500).json({ error: error.message })

    await notificar(lote.jogador_id,
      `🐄 Lote ${lote.codigo} avançou!`,
      `${lote.quantidade} animais passaram para ${FASE_NOMES[novaFase]}.${novaFase === 'abatido' ? ' Pronto para abate!' : ' Próxima fase em 7 dias.'}`
    )
    await logAdmin(user.username, 'Fase avançada',
      `${lote.codigo} — ${lote.jogador_nome} — ${FASE_NOMES[lote.fase]} → ${FASE_NOMES[novaFase]}`)
    return res.json(data)
  }

  // ── DIVIDIR LOTE ─────────────────────────────────────────────────────────
  if (action === 'dividir') {
    if (String(user.id) !== String(lote.jogador_id) && user.role !== 'admin')
      return res.status(403).json({ error: 'Sem permissão' })

    const qtdA = parseInt(body.quantidade_a)
    const qtdB = lote.quantidade - qtdA

    if (!qtdA || qtdA <= 0 || qtdB <= 0)
      return res.status(400).json({ error: 'Quantidade inválida para divisão' })
    if (qtdA >= lote.quantidade)
      return res.status(400).json({ error: 'Quantidade A deve ser menor que o total' })

    // Operação atômica: deletar original e criar dois novos
    const { data: countData } = await query('SELECT COUNT(*) FROM lotes', [])
    const count = parseInt(countData?.[0]?.count || 0)
    const codigoA = `${lote.codigo}-A`
    const codigoB = `${lote.codigo}-B`

    // Delete original first (anti-duplication lock)
    await query(`DELETE FROM lotes WHERE id = $1`, [id])

    // Create lote A
    const { data: loteA } = await queryOne(
      `INSERT INTO lotes (codigo, jogador_id, jogador_nome, fazenda, fazenda_id, quantidade, fase, peso_kg,
        valor_compra, data_compra, data_fase2, data_fase3, data_fase4, status, comprovante)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [codigoA, lote.jogador_id, lote.jogador_nome, lote.fazenda, lote.fazenda_id,
       qtdA, lote.fase, lote.peso_kg, lote.valor_compra, lote.data_compra,
       lote.data_fase2, lote.data_fase3, lote.data_fase4, lote.status, lote.comprovante]
    )

    // Create lote B
    const { data: loteB } = await queryOne(
      `INSERT INTO lotes (codigo, jogador_id, jogador_nome, fazenda, fazenda_id, quantidade, fase, peso_kg,
        valor_compra, data_compra, data_fase2, data_fase3, data_fase4, status, comprovante)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [codigoB, lote.jogador_id, lote.jogador_nome, lote.fazenda, lote.fazenda_id,
       qtdB, lote.fase, lote.peso_kg, lote.valor_compra, lote.data_compra,
       lote.data_fase2, lote.data_fase3, lote.data_fase4, lote.status, lote.comprovante]
    )

    await notificar(lote.jogador_id, `✂ Lote ${lote.codigo} dividido`,
      `Criados ${codigoA} (${qtdA} cab.) e ${codigoB} (${qtdB} cab.)`)

    return res.json({ loteA, loteB })
  }

  res.status(400).json({ error: 'Ação inválida' })
}
