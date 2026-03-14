import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

const RACAO_FASE = { bezerro: 21, garrote: 35, boi: 56, abatido: 0 }

async function notificar(jogador_id, titulo, mensagem) {
  await query(
    `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
    [jogador_id, titulo, mensagem]
  ).catch(() => {})
}

async function logAdmin(admin_nome, acao, detalhes) {
  await query(
    `INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
    [admin_nome, acao, detalhes]
  ).catch(() => {})
}

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  const { id } = req.query
  const { action, ...body } = req.body

  const { data: lote } = await queryOne('SELECT * FROM lotes WHERE id = $1', [id])
  if (!lote) return res.status(404).json({ error: 'Lote não encontrado' })

  const fases = ['bezerro','garrote','boi','abatido']
  const pesos = { bezerro:180, garrote:400, boi:540, abatido:648 }
  const faseNomes = { bezerro:'Bezerro', garrote:'Garrote', boi:'Boi', abatido:'Boi Abatido' }

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
    await logAdmin(user.username, 'Abate solicitado', `Lote ${lote.codigo} — ${lote.jogador_nome} — ${lote.quantidade} cab. — $${valorAbate}`)
    return res.json(data)
  }

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
    await notificar(lote.jogador_id, '💰 Abate pago!', `Lote ${lote.codigo} — ${lote.quantidade} cab. — $${lote.valor_abate} adicionado à sua conta no servidor.`)
    await logAdmin(user.username, 'Abate confirmado', `Lote ${lote.codigo} — ${lote.jogador_nome} — $${lote.valor_abate}`)
    return res.json(data)
  }

  if (action === 'avancar_fase') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const idx = fases.indexOf(lote.fase)
    if (idx >= 3) return res.status(400).json({ error: 'Já está na fase final' })
    const novaFase = fases[idx + 1]
    const kgConsumidos = RACAO_FASE[lote.fase] * lote.quantidade
    if (kgConsumidos > 0) {
      await query(
        `UPDATE estoque_racao SET kg_disponivel = GREATEST(0, kg_disponivel - $1) WHERE jogador_id = $2`,
        [kgConsumidos, lote.jogador_id]
      )
    }
    const { data, error } = await queryOne(
      `UPDATE lotes SET fase=$1, peso_kg=$2 WHERE id=$3 RETURNING *`,
      [novaFase, pesos[novaFase], id]
    )
    if (error) return res.status(500).json({ error: error.message })
    await notificar(lote.jogador_id,
      `🐄 Lote ${lote.codigo} avançou!`,
      `Seus ${lote.quantidade} animais passaram para a fase ${faseNomes[novaFase]}. ${novaFase === 'abatido' ? 'Pronto para solicitar o abate!' : `Próxima fase em 7 dias.`}`
    )
    await logAdmin(user.username, 'Fase avançada', `Lote ${lote.codigo} — ${lote.jogador_nome} — ${faseNomes[lote.fase]} → ${faseNomes[novaFase]}`)
    return res.json(data)
  }

  res.status(400).json({ error: 'Ação inválida' })
}
