import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  if (req.method === 'GET') {
    let q, params
    if (user.role === 'admin') {
      q = `SELECT * FROM solicitacoes ORDER BY criado_em DESC`
      params = []
    } else {
      // Jogador só vê as próprias
      q = `SELECT * FROM solicitacoes WHERE jogador_id = $1 ORDER BY criado_em DESC`
      params = [user.id]
    }
    const { data } = await query(q, params)
    return res.json(data || [])
  }

  // POST — jogador cria solicitação
  if (req.method === 'POST') {
    const { quantidade, valor_total, custo_racao, comprovante, fazenda_id } = req.body
    const { data, error } = await queryOne(
      `INSERT INTO solicitacoes (jogador_id, jogador_nome, fazenda, quantidade, valor_total, custo_racao, comprovante, fazenda_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pendente') RETURNING *`,
      [user.id, user.username, user.fazenda || '', quantidade, valor_total, custo_racao, comprovante, fazenda_id || null]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // PATCH — admin aprova ou recusa
  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id, status } = req.body

    const { data: solic } = await queryOne(`SELECT * FROM solicitacoes WHERE id = $1`, [id])
    if (!solic) return res.status(404).json({ error: 'Solicitação não encontrada' })

    // Update status
    await query(`UPDATE solicitacoes SET status=$1 WHERE id=$2`, [status, id])

    // Se aprovado → criar lote automaticamente
    if (status === 'aprovado') {
      // Get jogador info
      const { data: jogador } = await queryOne(`SELECT * FROM usuarios WHERE id = $1`, [solic.jogador_id])

      // Count lotes for codigo
      const { data: countData } = await query('SELECT COUNT(*) FROM lotes', [])
      const count = parseInt(countData?.[0]?.count || 0)
      const codigo = `L-${String(count + 1).padStart(3, '0')}`

      // Datas
      const hoje = new Date()
      const fase2 = new Date(hoje); fase2.setDate(hoje.getDate() + 7)
      const fase3 = new Date(hoje); fase3.setDate(hoje.getDate() + 14)
      const fase4 = new Date(hoje); fase4.setDate(hoje.getDate() + 21)

      // Create lote
      const { data: lote, error: loteErr } = await queryOne(
        `INSERT INTO lotes (codigo, jogador_id, jogador_nome, fazenda, fazenda_id, quantidade, fase, peso_kg,
          valor_compra, data_compra, data_fase2, data_fase3, data_fase4, status, comprovante)
         VALUES ($1,$2,$3,$4,$5,$6,'bezerro',180,$7,$8,$9,$10,$11,'ativo',$12) RETURNING *`,
        [codigo, solic.jogador_id, solic.jogador_nome || jogador?.username,
         jogador?.fazenda || '', solic.fazenda_id || null,
         solic.quantidade, solic.valor_total / solic.quantidade,
         hoje.toISOString().split('T')[0],
         fase2.toISOString().split('T')[0],
         fase3.toISOString().split('T')[0],
         fase4.toISOString().split('T')[0],
         solic.comprovante]
      )
      if (loteErr) return res.status(500).json({ error: 'Solicitação aprovada mas erro ao criar lote: ' + loteErr.message })

      // Record transaction
      await query(
        `INSERT INTO transacoes (tipo, lote_id, lote_codigo, de_jogador, para_jogador, quantidade, valor, fase, status)
         VALUES ('compra_npc',$1,$2,'Gov. NPC',$3,$4,$5,'bezerro','concluido')`,
        [lote.id, codigo, solic.jogador_nome, solic.quantidade, solic.valor_total]
      )

      // Auto-credit ração APENAS fase bezerro (21kg/cab) — resto precisa comprar no celeiro
      const racaoBezerro = solic.quantidade * 21
      await query(
        `INSERT INTO estoque_racao (jogador_id, kg_disponivel)
         VALUES ($1, $2)
         ON CONFLICT (jogador_id) DO UPDATE SET kg_disponivel = estoque_racao.kg_disponivel + $2`,
        [solic.jogador_id, racaoBezerro]
      )

      // Notificar jogador
      await query(
        `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [solic.jogador_id, '✅ Compra aprovada!',
         `Lote ${codigo} criado com ${solic.quantidade} bezerros. Ração para a fase bezerro (${racaoBezerro}kg) já creditada. Compre ração no Celeiro para as próximas fases.`]
      )

      // Frete interno — 30min saindo da transportadora + 30min indo à fazenda = 1h
      const buscaEm = new Date(Date.now() + 30 * 60 * 1000)  // chega ao curral
      const chegaEm = new Date(Date.now() + 60 * 60 * 1000)  // chega na fazenda
      await query(
        `INSERT INTO frete (lote_id, jogador_id, fazenda_id, status, chega_em, busca_em)
         VALUES ($1,$2,$3,'em_rota_buscar',$4,$5)`,
        [lote.id, solic.jogador_id, solic.fazenda_id || null, chegaEm.toISOString(), buscaEm.toISOString()]
      )

      // Marcar lote como em_transito até frete chegar
      await query(`UPDATE lotes SET status='em_transito' WHERE id=$1`, [lote.id])

      // Criar fretes em blocos de 30 — menor capacidade do sistema
      // Transportador pode pegar múltiplos blocos, cada bloco = +1h na rota
      const valorPorCab = 30
      const BLOCO = 30
      const origemFrete = 'Curral Gov. NPC'
      const destinoFrete = solic.fazenda_id ? `Fazenda ${jogador?.fazenda || solic.jogador_nome}` : `Fazenda de ${solic.jogador_nome}`
      let qtdRestante = solic.quantidade
      let numFretes = 0
      let blocoNum = 1
      while (qtdRestante > 0) {
        const qtdEste = Math.min(qtdRestante, BLOCO)
        const valorEste = qtdEste * valorPorCab
        await query(
          `INSERT INTO fretes_transportadora
           (lote_id, lote_codigo, origem, destino, quantidade, valor, comprador_id, status, criado_em, bloco_num, bloco_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'disponivel',now(),$8,$9)`,
          [lote.id, codigo, origemFrete, destinoFrete, qtdEste, valorEste, solic.jogador_id,
           blocoNum, Math.ceil(solic.quantidade / BLOCO)]
        )
        qtdRestante -= qtdEste
        numFretes++
        blocoNum++
      }
      const valorFreteTotal = solic.quantidade * valorPorCab

      // Notificar todos transportadores disponíveis
      const { data: transportadores } = await query(
        `SELECT DISTINCT jogador_id FROM caminhoes WHERE status='disponivel'`, []
      )
      for (const t of (transportadores||[])) {
        await query(
          `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [t.jogador_id, `🚛 ${numFretes > 1 ? numFretes + ' fretes disponíveis!' : 'Frete disponível!'}`,
           `${solic.quantidade} bezerros para transportar${numFretes > 1 ? ` (${numFretes} caminhões necessários)` : ''} — $${valorFreteTotal} total. Acesse a Transportadora!`]
        )
      }

      // Log
      await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
        [user.username, 'Compra aprovada → lote criado',
         `${codigo} — ${solic.jogador_nome} — ${solic.quantidade} cab.`])

      return res.json({ ok: true, lote, codigo })
    }

    // Recusado — só notifica
    await query(
      `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
      [solic.jogador_id, '❌ Compra recusada',
       `Sua solicitação de ${solic.quantidade} bezerros foi recusada. Entre em contato com o admin.`]
    )

    return res.json({ ok: true })
  }

  res.status(405).end()
}
