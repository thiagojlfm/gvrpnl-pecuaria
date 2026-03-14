import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

// Frete por cabeça
const FRETE_POR_CABECA = 10 // $10/cab

function calcValorFrete(quantidade) {
  return quantidade * FRETE_POR_CABECA
}

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  // GET — fretes disponíveis ou do transportador
  if (req.method === 'GET') {
    const { tipo, jogador_id } = req.query

    if (tipo === 'disponiveis') {
      if (!user) return res.status(401).json({ error: 'Não autorizado' })
      const { data } = await query(
        `SELECT * FROM fretes_transportadora WHERE status = 'disponivel' ORDER BY criado_em DESC`, []
      )
      return res.json(data || [])
    }

    if (tipo === 'meus') {
      if (!user) return res.status(401).json({ error: 'Não autorizado' })
      const { data } = await query(
        `SELECT * FROM fretes_transportadora WHERE transportador_id = $1 ORDER BY criado_em DESC LIMIT 30`,
        [user.id]
      )
      return res.json(data || [])
    }

    if (tipo === 'todos' && user?.role === 'admin') {
      const { data } = await query(
        `SELECT * FROM fretes_transportadora ORDER BY criado_em DESC LIMIT 50`, []
      )
      return res.json(data || [])
    }

    // Caminhões do jogador
    if (tipo === 'caminhoes') {
      if (!user) return res.status(401).json({ error: 'Não autorizado' })
      const id = user.role === 'admin' && jogador_id ? jogador_id : user.id
      const { data } = await query(
        `SELECT * FROM caminhoes WHERE jogador_id = $1 ORDER BY comprado_em DESC`, [id]
      )
      return res.json(data || [])
    }

    // Stats do transportador
    if (tipo === 'stats') {
      if (!user) return res.status(401).json({ error: 'Não autorizado' })
      const { data } = await queryOne(
        `SELECT COUNT(*) as total_fretes, COALESCE(SUM(valor),0) as total_ganho,
         COUNT(CASE WHEN pago=false AND status='entregue' THEN 1 END) as aguardando_pagamento,
         COALESCE(SUM(CASE WHEN pago=false AND status='entregue' THEN valor ELSE 0 END),0) as valor_pendente
         FROM fretes_transportadora WHERE transportador_id = $1`,
        [user.id]
      )
      return res.json(data || {})
    }

    return res.status(400).json({ error: 'tipo inválido' })
  }

  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // POST — aceitar frete
  if (req.method === 'POST') {
    const { frete_id, caminhao_id } = req.body

    // Verificar se frete ainda disponível (atomic check)
    const { data: frete } = await queryOne(
      `SELECT * FROM fretes_transportadora WHERE id = $1 AND status = 'disponivel'`, [frete_id]
    )
    if (!frete) return res.status(400).json({ error: 'Frete não disponível — já foi aceito por outro transportador!' })

    // Verificar se caminhão pertence ao jogador e está livre
    const { data: caminhao } = await queryOne(
      `SELECT * FROM caminhoes WHERE id = $1 AND jogador_id = $2 AND status = 'disponivel'`,
      [caminhao_id, user.id]
    )
    if (!caminhao) return res.status(400).json({ error: 'Caminhão não disponível' })

    // Verificar capacidade — caminhão deve ter capacidade >= quantidade do frete
    if (caminhao.capacidade < frete.quantidade) {
      return res.status(400).json({
        error: `Caminhão com capacidade insuficiente! Este frete tem ${frete.quantidade} cabeças mas seu caminhão comporta apenas ${caminhao.capacidade}. Você precisaria de ${Math.ceil(frete.quantidade / caminhao.capacidade)} caminhão(ões) deste modelo.`
      })
    }

    // Verificar capacidade
    if (frete.quantidade > caminhao.capacidade) {
      return res.status(400).json({
        error: `Caminhão não comporta ${frete.quantidade} cabeças! Capacidade máxima: ${caminhao.capacidade}. Este frete precisa de um caminhão maior.`
      })
    }

    const agora = new Date()
    const chegaBuscar = new Date(agora.getTime() + 30 * 60 * 1000) // 30min indo buscar
    const chegaFazenda = new Date(agora.getTime() + 60 * 60 * 1000) // 60min total (chegou na fazenda)

    // Aceitar frete atomicamente
    const { data: freteAtualizado, error } = await queryOne(
      `UPDATE fretes_transportadora
       SET status='em_rota_buscar', transportador_id=$1, transportador_nome=$2,
           caminhao_id=$3, aceito_em=now(), entrega_em=$4, chegada_fazenda_em=$5
       WHERE id=$6 AND status='disponivel' RETURNING *`,
      [user.id, user.username, caminhao_id, chegaBuscar.toISOString(), chegaFazenda.toISOString(), frete_id]
    )
    if (error || !freteAtualizado) return res.status(400).json({ error: 'Frete já foi aceito por outro!' })

    // Marcar caminhão como ocupado
    await query(`UPDATE caminhoes SET status='em_rota' WHERE id=$1`, [caminhao_id])

    // Notificar dono do gado
    await query(
      `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
      [frete.comprador_id,
       '🚛 Caminhão a caminho!',
       `${user.username} aceitou seu frete. Buscando os bezerros — chega na fazenda em 1h.`]
    )

    // Log
    await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
      [user.username, 'Frete aceito', `${frete.lote_codigo} — ${frete.quantidade} cab. — $${frete.valor}`])

    return res.json(freteAtualizado)
  }

  // PATCH — atualizar status (sistema ou admin)
  if (req.method === 'PATCH') {
    const { id, status, pago } = req.body

    if (pago !== undefined && user.role === 'admin') {
      // Admin marca como pago
      const { data: frete } = await queryOne(`SELECT * FROM fretes_transportadora WHERE id=$1`, [id])
      await query(`UPDATE fretes_transportadora SET pago=true WHERE id=$1`, [id])
      await query(
        `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [frete.transportador_id, '💰 Frete pago!',
         `Frete ${frete.lote_codigo} — $${frete.valor} adicionado à sua conta.`]
      )
      await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
        [user.username, 'Frete pago', `${frete.lote_codigo} — ${frete.transportador_nome} — $${frete.valor}`])
      return res.json({ ok: true })
    }

    if (status) {
      const { data: frete } = await queryOne(
        `UPDATE fretes_transportadora SET status=$1 WHERE id=$2 RETURNING *`, [status, id]
      )
      // Se entregue, liberar caminhão
      if (status === 'entregue' && frete?.caminhao_id) {
        await query(`UPDATE caminhoes SET status='disponivel' WHERE id=$1`, [frete.caminhao_id])
        // Notificar transportador
        await query(
          `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [frete.transportador_id, '✅ Entrega concluída!',
           `Frete ${frete.lote_codigo} entregue. $${frete.valor} aguardando pagamento do admin.`]
        )
      }
      // Se em_rota_fazenda, notificar dono
      if (status === 'em_rota_fazenda' && frete?.comprador_id) {
        await query(
          `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [frete.comprador_id, '🐄 Gado a caminho!',
           `Os bezerros foram carregados e estão indo para sua fazenda. Chegam em 30 minutos!`]
        )
      }
      return res.json({ ok: true })
    }

    return res.status(400).json({ error: 'Parâmetros inválidos' })
  }

  // DELETE — admin reseta transportadora
  if (req.method === 'DELETE') {
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    await query(`UPDATE caminhoes SET status='disponivel'`, [])
    await query(`DELETE FROM fretes_transportadora`, [])
    await query(`DELETE FROM pedidos_caminhao WHERE status='pendente'`, [])
    await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
      [user.username, 'Transportadora resetada', 'Todos os fretes removidos, caminhões liberados'])
    return res.json({ ok: true })
  }

  res.status(405).end()
}
