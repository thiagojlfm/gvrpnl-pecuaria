import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

// Frete: cliente paga $50/cab, transportador recebe $30/cab ($20 é combustível)
const FRETE_CLIENTE = 50
const FRETE_TRANSPORTADOR = 30

function calcValorFrete(quantidade) {
  return quantidade * FRETE_TRANSPORTADOR // valor que o transportador recebe
}

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  // GET — fretes disponíveis ou do transportador
  if (req.method === 'GET') {
    const { tipo, jogador_id } = req.query

    if (tipo === 'disponiveis') {
      if (!user) return res.status(401).json({ error: 'Não autorizado' })
      // Show all fretes - client filters by caminhao capacity
      const { data } = await query(
        `SELECT * FROM fretes_transportadora WHERE status = 'disponivel' ORDER BY tipo_carga, criado_em DESC`, []
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

    // Get all available vans for admin assignment
    if (tipo === 'vans_disponiveis' && user?.role === 'admin') {
      const { data } = await query(
        `SELECT c.*, u.username as dono FROM caminhoes c
         LEFT JOIN usuarios u ON c.jogador_id = u.id
         WHERE c.status = 'disponivel' AND (c.tipo = 'racao' OR c.racao_cap > 0)
         ORDER BY c.tipo DESC, c.racao_cap DESC`, []
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

    // Verificar compatibilidade tipo carga
    const tipoFrete = frete.tipo_carga || 'gado'
    const tipoCaminhao = caminhao.tipo || 'gado'
    // Van só transporta ração. Trucks boiadeiros com racao_cap > 0 transportam ambos.
    if (tipoFrete === 'racao' && (caminhao.racao_cap||0) === 0) {
      return res.status(400).json({ error: 'Este caminhão não tem capacidade para ração!' })
    }
    if (tipoFrete === 'gado' && tipoCaminhao === 'racao') {
      return res.status(400).json({ error: 'Van de ração não transporta gado!' })
    }

    // Verificar capacidade conforme tipo
    if (tipoFrete === 'racao') {
      const racaoCap = caminhao.racao_cap || 0
      if (frete.quantidade > racaoCap) {
        return res.status(400).json({
          error: `Capacidade de ração insuficiente! Frete tem ${frete.quantidade}kg mas seu veículo comporta ${racaoCap}kg.`
        })
      }
    } else {
      if (caminhao.capacidade < frete.quantidade) {
        return res.status(400).json({
          error: `Caminhão insuficiente! ${frete.quantidade} cab. mas seu caminhão comporta ${caminhao.capacidade}.`
        })
      }
    }

    const agora = new Date()
    const chegaBuscar = new Date(agora.getTime() + 30 * 60 * 1000) // 30min indo buscar
    const chegaFazenda = new Date(agora.getTime() + 60 * 60 * 1000) // 60min total (chegou na fazenda)

    // Aceitar blocos — transportador pode pegar múltiplos blocos do mesmo lote
    const blocos_ids = req.body.blocos_ids || [frete_id] // array de IDs de blocos
    const totalQtd = blocos_ids.length === 1 ? frete.quantidade :
      (await query(`SELECT SUM(quantidade) as t FROM fretes_transportadora WHERE id = ANY($1::int[])`, [blocos_ids])).data?.[0]?.t || frete.quantidade

    // Base 1h + 15min por bloco extra
    const numBlocos = blocos_ids.length
    const duracaoMs = (60 + (numBlocos - 1) * 15) * 60 * 1000  // 1h base + 15min por bloco extra
    const buscaMs = Math.floor(duracaoMs / 2)  // metade do tempo indo buscar
    const chegaBuscarMulti = new Date(agora.getTime() + buscaMs)
    const chegaFazendaMulti = new Date(agora.getTime() + duracaoMs)

    // Aceitar todos os blocos atomicamente
    let aceitou = 0
    for (const bid of blocos_ids) {
      const { data: b } = await queryOne(
        `UPDATE fretes_transportadora
         SET status='em_rota_buscar', transportador_id=$1, transportador_nome=$2,
             caminhao_id=$3, aceito_em=now(), entrega_em=$4, chegada_fazenda_em=$5
         WHERE id=$6 AND status='disponivel' RETURNING *`,
        [user.id, user.username, caminhao_id, chegaBuscarMulti.toISOString(), chegaFazendaMulti.toISOString(), bid]
      )
      if (b) aceitou++
    }
    if (aceitou === 0) return res.status(400).json({ error: 'Fretes já foram aceitos por outro!' })
    const freteAtualizado = await queryOne(`SELECT * FROM fretes_transportadora WHERE id=$1`, [frete_id]).then(r=>r.data)

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
      // Fluxo ração manual: liberado → retirado → entregue
      // 'atribuir' — admin atribui van e libera bloco
      if (status === 'atribuir') {
        const { transportador_id, transportador_nome, caminhao_id } = req.body
        if (!transportador_id) return res.status(400).json({ error: 'Selecione um transportador' })

        // Check van capacity
        const { data: van } = await queryOne(`SELECT * FROM caminhoes WHERE id=$1`, [caminhao_id])
        if (van && van.racao_cap < frete.quantidade) {
          return res.status(400).json({ error: `Van comporta ${van.racao_cap}kg mas bloco tem ${frete.quantidade}kg` })
        }

        await queryOne(
          `UPDATE fretes_transportadora SET status='liberado', transportador_id=$1, transportador_nome=$2, caminhao_id=$3 WHERE id=$4`,
          [transportador_id, transportador_nome, caminhao_id||null, id]
        )
        // Mark van as busy
        if (caminhao_id) await query(`UPDATE caminhoes SET status='em_rota' WHERE id=$1`, [caminhao_id])

        await query(
          `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [transportador_id,
           '🌾 Carga liberada no armazém!',
           `Frete ${frete.lote_codigo} — ${frete.quantidade}kg prontos para retirada. Vá ao armazém no jogo e clique em "Retirei".`]
        )
        await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
          [user.username, 'Bloco ração atribuído', `${frete.lote_codigo} bloco ${frete.bloco_num} → ${transportador_nome}`])
        return res.json({ ok: true })
      }

      // 'liberado' — notificação já feita no atribuir
      if (status === 'liberado') {
        await query(
          `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [frete.transportador_id,
           '🌾 Carga liberada no armazém!',
           `Frete ${frete.lote_codigo} — ${frete.quantidade}kg prontos para retirada. Vá ao armazém no jogo e clique em "Retirei".`]
        )
      }

      // 'retirado' — transportador confirma retirada no armazém
      if (status === 'retirado') {
        await query(
          `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [frete.comprador_id,
           '🚐 Ração a caminho!',
           `${frete.transportador_nome} retirou ${frete.quantidade}kg no armazém. Vá ao encontro dele no jogo e clique em "Recebi" quando chegar.`]
        )
      }

      // Se entregue, liberar caminhão
      if (status === 'entregue' && frete?.caminhao_id) {
        await query(`UPDATE caminhoes SET status='disponivel' WHERE id=$1`, [frete.caminhao_id])

        // Se for ração, creditar no estoque do comprador
        if (frete.tipo_carga === 'racao') {
          await query(
            `INSERT INTO estoque_racao (jogador_id, kg_disponivel)
             VALUES ($1, $2)
             ON CONFLICT (jogador_id) DO UPDATE SET kg_disponivel = estoque_racao.kg_disponivel + $2`,
            [frete.comprador_id, frete.quantidade]
          )
          await query(
            `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
            [frete.comprador_id, '🌾 Ração chegou!',
             `${frete.quantidade}kg de ração entregues e creditados no seu estoque!`]
          )
        }

        // Notificar transportador
        await query(
          `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [frete.transportador_id, '✅ Entrega concluída!',
           `${frete.tipo_carga === 'racao' ? '🌾' : '🐄'} Frete ${frete.lote_codigo} entregue. $${frete.valor} aguardando pagamento do admin.`]
        )
      }
      // Se em_rota_fazenda, notificar dono (só gado)
      if (status === 'em_rota_fazenda' && frete?.comprador_id && frete.tipo_carga !== 'racao') {
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
    await query(`DELETE FROM caminhoes`, [])              // apaga todos os caminhões
    await query(`DELETE FROM fretes_transportadora`, [])
    await query(`DELETE FROM pedidos_caminhao`, [])           // apaga todos os pedidos
    await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
      [user.username, 'Transportadora resetada', 'Todos os fretes removidos, caminhões liberados'])
    return res.json({ ok: true })
  }

  res.status(405).end()
}
