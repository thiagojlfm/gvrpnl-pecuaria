import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

const FRETES_NPC_DIA = 12
const FRETE_NPC_PORCENTO = 0.6   // 60% do valor normal
const OFERTA_NPC_PORCENTO = 0.9  // 90% do preço de mercado
const PASTO_PRECO_POR_HA = 500   // $500/ha por semana

// Destinos NPC fictícios
const DESTINOS_NPC = [
  'Frigorífico Central', 'Fazenda Modelo NPC', 'Curral Regional',
  'Distribuidor Norte', 'Abatedouro Sul', 'Cooperativa Vale Verde'
]
const ORIGENS_NPC = [
  'Curral Gov. NPC', 'Posto Agropecuário', 'Centro de Distribuição'
]

// Confinamentos NPC para venda de garrotes superlotados
const CONFINAMENTOS = [
  { nome: 'Confinamento Norte', regiao: 'Green Hills Norte', desconto: 0.08, cor: '#4060d0' },
  { nome: 'Confinamento Oeste', regiao: 'Lake Ville Oeste', desconto: 0.12, cor: '#c8922a' },
  { nome: 'Confinamento Sudeste', regiao: 'Green Hills Sudeste', desconto: 0.10, cor: '#4a8a30' },
]

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  // ── GET — listar fretes NPC disponíveis hoje ──────────────────────────────
  if (req.method === 'GET') {
    const { tipo } = req.query

    if (tipo === 'fretes') {
      // Garantir que tabela existe
      await query(`CREATE TABLE IF NOT EXISTS fretes_npc (
        id SERIAL PRIMARY KEY,
        origem TEXT, destino TEXT,
        quantidade INTEGER, valor NUMERIC(10,2),
        tipo_carga TEXT DEFAULT 'gado',
        bloco_num INTEGER DEFAULT 1, bloco_total INTEGER DEFAULT 1,
        status TEXT DEFAULT 'disponivel',
        transportador_id UUID, transportador_nome TEXT, caminhao_id INTEGER,
        aceito_em TIMESTAMP, entrega_em TIMESTAMP,
        pago BOOLEAN DEFAULT false,
        data_referencia DATE DEFAULT CURRENT_DATE,
        criado_em TIMESTAMP DEFAULT now()
      )`, [])

      // Verificar quantos fretes NPC existem hoje
      const { data: hoje } = await query(
        `SELECT COUNT(*) as total FROM fretes_npc WHERE data_referencia = CURRENT_DATE`, []
      )
      const totalHoje = parseInt(hoje?.[0]?.total || 0)

      // Gerar fretes se não tiver 12 ainda
      if (totalHoje < FRETES_NPC_DIA) {
        const faltam = FRETES_NPC_DIA - totalHoje
        // Buscar preço atual do mercado
        const { data: lotes } = await query(
          `SELECT fase, quantidade FROM lotes WHERE status IN ('ativo','em_transito')`, []
        )
        const total = (lotes||[]).reduce((s,l) => l.fase !== 'abatido' ? s + l.quantidade : s, 0)
        const precoBase = Math.max(10, 30 * FRETE_NPC_PORCENTO) // 60% de $30/cab

        for (let i = 0; i < faltam; i++) {
          const qtd = [15, 20, 25, 30][Math.floor(Math.random() * 4)]
          const isRacao = Math.random() > 0.6 // 40% chance de ser ração
          const valor = isRacao
            ? Math.round(qtd * 150 * FRETE_NPC_PORCENTO) // ração: 60% de $0.5/kg * qtd kg
            : Math.round(qtd * 30 * FRETE_NPC_PORCENTO)   // gado: 60% de $30/cab
          const origem = ORIGENS_NPC[Math.floor(Math.random() * ORIGENS_NPC.length)]
          const destino = DESTINOS_NPC[Math.floor(Math.random() * DESTINOS_NPC.length)]
          await query(
            `INSERT INTO fretes_npc (origem, destino, quantidade, valor, tipo_carga, bloco_num, bloco_total, data_referencia)
             VALUES ($1,$2,$3,$4,$5,1,1,CURRENT_DATE)`,
            [origem, destino, qtd, valor, isRacao ? 'racao' : 'gado']
          )
        }
      }

      const { data } = await query(
        `SELECT * FROM fretes_npc WHERE data_referencia = CURRENT_DATE AND status = 'disponivel' ORDER BY tipo_carga, valor DESC`, []
      )
      return res.json(data || [])
    }

    if (tipo === 'meus_fretes' && user) {
      const { data } = await query(
        `SELECT * FROM fretes_npc WHERE transportador_id = $1 ORDER BY criado_em DESC LIMIT 20`, [user.id]
      )
      return res.json(data || [])
    }

    if (tipo === 'pasto') {
      // Retorna opções de aluguel de pasto NPC
      return res.json({
        preco_por_ha: PASTO_PRECO_POR_HA,
        opcoes: [
          { ha: 10, valor: 10 * PASTO_PRECO_POR_HA, label: 'Pasto Pequeno — 10 ha' },
          { ha: 25, valor: 25 * PASTO_PRECO_POR_HA, label: 'Pasto Médio — 25 ha' },
          { ha: 50, valor: 50 * PASTO_PRECO_POR_HA, label: 'Pasto Grande — 50 ha' },
        ]
      })
    }

    if (tipo === 'confinamentos') {
      // Retorna confinamentos com preço calculado pelo mercado atual
      const { data: lotes } = await query(
        `SELECT quantidade FROM lotes WHERE status IN ('ativo','em_transito') AND fase != 'abatido'`, []
      )
      const total = (lotes||[]).reduce((s,l) => s + l.quantidade, 0)
      const ratio = Math.min(total / 400, 1)
      const precoKg = 5 - ratio * 2
      const precoKgGarrote = 2.73 - ratio * 0.53
      const precoGarrote = Math.round(400 * precoKgGarrote)

      return res.json(CONFINAMENTOS.map(c => ({
        ...c,
        preco_cab: Math.round(precoGarrote * (1 - c.desconto)),
        preco_mercado: precoGarrote,
      })))
    }

    return res.status(400).json({ error: 'tipo inválido' })
  }

  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // ── POST — aceitar frete NPC ──────────────────────────────────────────────
  if (req.method === 'POST') {
    const { action } = req.body

    if (action === 'aceitar_frete') {
      const { frete_id, caminhao_id } = req.body

      const { data: frete } = await queryOne(
        `SELECT * FROM fretes_npc WHERE id=$1 AND status='disponivel' AND data_referencia=CURRENT_DATE`, [frete_id]
      )
      if (!frete) return res.status(400).json({ error: 'Frete NPC não disponível ou expirado!' })

      // Verificar caminhão
      const { data: cam } = await queryOne(
        `SELECT * FROM caminhoes WHERE id=$1 AND jogador_id=$2 AND status='disponivel'`, [caminhao_id, user.id]
      )
      if (!cam) return res.status(400).json({ error: 'Caminhão não disponível' })

      // Checar capacidade
      if (frete.tipo_carga === 'racao' && (cam.racao_cap||0) < frete.quantidade) {
        return res.status(400).json({ error: `Caminhão comporta ${cam.racao_cap}kg de ração, frete tem ${frete.quantidade}kg` })
      }
      if (frete.tipo_carga === 'gado' && cam.capacidade < frete.quantidade) {
        return res.status(400).json({ error: `Caminhão comporta ${cam.capacidade} cab., frete tem ${frete.quantidade}` })
      }

      // Duração: 30min base + 10min a cada $200 de valor
      const minutosExtra = Math.floor(frete.valor / 200) * 10
      const minutos = 30 + minutosExtra
      const entregaEm = new Date(Date.now() + minutos * 60 * 1000)

      await queryOne(
        `UPDATE fretes_npc SET status='em_rota', transportador_id=$1, transportador_nome=$2,
         caminhao_id=$3, aceito_em=now(), entrega_em=$4 WHERE id=$5`,
        [user.id, user.username, caminhao_id, entregaEm.toISOString(), frete_id]
      )
      await query(`UPDATE caminhoes SET status='em_rota' WHERE id=$1`, [caminhao_id])

      return res.json({ ok: true, entrega_em: entregaEm })
    }

    if (action === 'entregar_frete') {
      const { frete_id } = req.body
      const { data: frete } = await queryOne(
        `SELECT * FROM fretes_npc WHERE id=$1 AND transportador_id=$2`, [frete_id, user.id]
      )
      if (!frete) return res.status(404).json({ error: 'Frete não encontrado' })

      await query(`UPDATE fretes_npc SET status='entregue', pago=true WHERE id=$1`, [frete_id])
      if (frete.caminhao_id) {
        await query(`UPDATE caminhoes SET status='disponivel' WHERE id=$1`, [frete.caminhao_id])
      }

      await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
        [user.username, 'Frete NPC entregue', `${frete.origem} → ${frete.destino} — ${frete.quantidade} ${frete.tipo_carga==='racao'?'kg':'cab.'} — $${frete.valor}`])

      return res.json({ ok: true, valor: frete.valor })
    }

    if (action === 'oferta_npc') {
      // Oferta NPC para anúncio de garrote
      const { anuncio_id } = req.body
      const { data: anuncio } = await queryOne(
        `SELECT a.*, l.quantidade, l.fase FROM anuncios a JOIN lotes l ON l.id=a.lote_id WHERE a.id=$1 AND a.vendedor_id=$2`,
        [anuncio_id, user.id]
      )
      if (!anuncio) return res.status(404).json({ error: 'Anúncio não encontrado' })
      if (anuncio.fase !== 'garrote') return res.status(400).json({ error: 'Oferta NPC só para garrotes' })

      // Buscar preço atual do mercado
      const { data: mercado } = await queryOne(
        `SELECT COUNT(*) as total FROM lotes WHERE status IN ('ativo','em_transito')`, []
      )
      const totalRebanho = parseInt(mercado?.total || 0)
      const ratio = Math.min(totalRebanho / 400, 1)
      const precoKg = 5 - ratio * 2
      // Oferta baseada no preço do GARROTE (400kg * precoKg) - não do abate
      const precoKgGarrote = 2.73 - ratio * 0.53
      const precoGarrote = Math.round(400 * precoKgGarrote)
      const valorMercado = precoGarrote * anuncio.quantidade
      const ofertaNPC = Math.round(valorMercado * OFERTA_NPC_PORCENTO)

      return res.json({
        oferta: ofertaNPC,
        valor_mercado: valorMercado,
        desconto_pct: Math.round((1 - OFERTA_NPC_PORCENTO) * 100),
        quantidade: anuncio.quantidade,
        anuncio_id
      })
    }

    if (action === 'vender_confinamento') {
      const { lote_id, confinamento_nome, valor_total } = req.body
      const { data: lote } = await queryOne(`SELECT * FROM lotes WHERE id=$1 AND jogador_id=$2`, [lote_id, user.id])
      if (!lote) return res.status(404).json({ error: 'Lote não encontrado' })

      await query(`UPDATE lotes SET status='vendido' WHERE id=$1`, [lote_id])
      await query(
        `INSERT INTO transacoes (tipo, lote_id, lote_codigo, de_jogador, para_jogador, quantidade, valor, fase, status)
         VALUES ('venda_confinamento',$1,$2,$3,$4,$5,$6,'garrote','aguardando')`,
        [lote.id, lote.codigo, user.username, confinamento_nome, lote.quantidade, valor_total]
      )
      // Gerar frete para o confinamento
      const chegaEm = new Date(Date.now() + 60 * 60 * 1000)
      const buscaEm = new Date(Date.now() + 30 * 60 * 1000)
      await query(
        `INSERT INTO fretes_transportadora (lote_id, lote_codigo, origem, destino, quantidade, valor, comprador_id, status, bloco_num, bloco_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'disponivel',1,1)`,
        [lote.id, lote.codigo, 'Fazenda do Produtor', confinamento_nome,
         lote.quantidade, Math.round(lote.quantidade * 30), user.id]
      )
      // Notificar transportadores
      const { data: trans } = await query(`SELECT DISTINCT jogador_id FROM caminhoes WHERE status='disponivel'`, [])
      for (const t of (trans||[])) {
        await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [t.jogador_id, '🚛 Frete disponível!', `${lote.quantidade} garrotes → ${confinamento_nome}`])
      }
      await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [user.id, '✅ Venda registrada!', `${lote.quantidade} garrotes vendidos ao ${confinamento_nome} por $${valor_total}. Aguarde addmoney do admin.`])
      return res.json({ ok: true })
    }

    if (action === 'aceitar_oferta_npc') {
      const { anuncio_id, valor } = req.body
      const { data: anuncio } = await queryOne(
        `SELECT a.*, l.id as lote_id FROM anuncios a JOIN lotes l ON l.id=a.lote_id WHERE a.id=$1 AND a.vendedor_id=$2`,
        [anuncio_id, user.id]
      )
      if (!anuncio) return res.status(404).json({ error: 'Anúncio não encontrado' })

      await query(`UPDATE anuncios SET status='vendido' WHERE id=$1`, [anuncio_id])
      await query(`UPDATE lotes SET status='vendido' WHERE id=$1`, [anuncio.lote_id])
      await query(
        `INSERT INTO transacoes (tipo, lote_id, lote_codigo, de_jogador, para_jogador, quantidade, valor, fase, status)
         VALUES ('venda_npc',$1,$2,'Frigorífico NPC',$3,$4,$5,'garrote','pago')`,
        [anuncio.lote_id, anuncio.lote_codigo, user.username, anuncio.quantidade, valor]
      )
      await query(
        `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [user.id, '🤝 Venda NPC concluída!',
         `${anuncio.quantidade} garrotes vendidos ao Frigorífico NPC por $${valor}. Valor de addmoney registrado.`]
      )
      await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
        [user.username, 'Venda NPC garrote', `${anuncio.lote_codigo} — ${anuncio.quantidade} cab. — $${valor}`])

      return res.json({ ok: true, valor })
    }

    if (action === 'alugar_pasto') {
      const { fazenda_id, ha } = req.body
      const preco = ha * PASTO_PRECO_POR_HA

      await query(`CREATE TABLE IF NOT EXISTS pastagem_npc (
        id SERIAL PRIMARY KEY, jogador_id UUID, fazenda_id INTEGER,
        ha_alugado INTEGER, valor_pago NUMERIC(10,2),
        valido_ate TIMESTAMP, status TEXT DEFAULT 'ativo',
        criado_em TIMESTAMP DEFAULT now()
      )`, [])

      const validoAte = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 semana
      await queryOne(
        `INSERT INTO pastagem_npc (jogador_id, fazenda_id, ha_alugado, valor_pago, valido_ate)
         VALUES ($1,$2,$3,$4,$5)`,
        [user.id, fazenda_id||null, ha, preco, validoAte.toISOString()]
      )

      await query(
        `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [user.id, '🌿 Pasto alugado!',
         `${ha} hectares adicionais por 7 dias. Valor: $${preco}. Válido até ${validoAte.toLocaleDateString('pt-BR')}.`]
      )

      return res.json({ ok: true, ha, preco, valido_ate: validoAte })
    }

    return res.status(400).json({ error: 'Ação inválida' })
  }

  res.status(405).end()
}
