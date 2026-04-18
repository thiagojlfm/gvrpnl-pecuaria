import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

const CAP_POR_HA = { bezerro: 3, garrote: 2, boi: 1, abatido: 1 }

function calcHaUsada(lotes = []) {
  return (lotes || []).reduce((s, l) => s + (Number(l.quantidade || 0) / (CAP_POR_HA[l.fase] || 1)), 0)
}

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  if (req.method === 'GET') {
    let q
    let params

    if (user?.role === 'admin') {
      q = 'SELECT * FROM lotes ORDER BY criado_em DESC'
      params = []
    } else if (user) {
      q = 'SELECT * FROM lotes WHERE jogador_id = $1 ORDER BY criado_em DESC'
      params = [user.id]
    } else {
      return res.status(401).json({ error: 'Nao autorizado' })
    }

    // Auto-resolve fretes that have expired - set em_transito lotes to ativo.
    await query(
      `
      UPDATE lotes SET status='ativo'
      WHERE status='em_transito'
      AND id IN (
        SELECT lote_id FROM frete
        WHERE status IN ('em_rota_buscar','em_rota_fazenda')
        AND chega_em < NOW()
      )
    `,
      []
    )

    // Also mark those fretes as entregue.
    await query(
      `
      UPDATE frete SET status='entregue'
      WHERE status IN ('em_rota_buscar','em_rota_fazenda')
      AND chega_em < NOW()
    `,
      []
    )

    const { data, error } = await query(q, params)
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'POST') {
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Sem permissao' })

    const {
      jogador_id,
      jogador_nome,
      fazenda,
      fazenda_id,
      quantidade,
      valor_compra,
      data_compra,
      comprovante,
    } = req.body

    const quantidadeNum = Number(quantidade || 0)
    const valorCompraNum = Number(valor_compra || 800)

    if (!jogador_id || quantidadeNum <= 0) {
      return res.status(400).json({ error: 'Dados da compra invalidos' })
    }

    let fazendaIdFinal = fazenda_id || null
    let fazendaNomeFinal = fazenda || ''

    if (fazenda_id) {
      const { data: fazSelecionada } = await queryOne(
        `SELECT id, dono_id, nome FROM fazendas WHERE id = $1`,
        [fazenda_id]
      )

      if (fazSelecionada && String(fazSelecionada.dono_id) !== String(jogador_id)) {
        return res.status(400).json({ error: 'A fazenda escolhida nao pertence ao jogador selecionado' })
      }
    }

    const { data: fazendasJogador } = await query(
      `
      SELECT *
      FROM fazendas
      WHERE dono_id = $1
      ORDER BY CASE WHEN id = $2 THEN 0 ELSE 1 END, tamanho_ha DESC, id ASC
    `,
      [jogador_id, fazenda_id || null]
    )

    if ((fazendasJogador || []).length > 0) {
      const ids = fazendasJogador.map(fz => Number(fz.id)).filter(Number.isFinite)
      const lotesPorFazenda = new Map()

      if (ids.length > 0) {
        const { data: lotesAtivos } = await query(
          `
          SELECT fazenda_id, fase, quantidade
          FROM lotes
          WHERE fazenda_id = ANY($1::int[])
            AND status NOT IN ('pago','vendido')
        `,
          [ids]
        )

        ;(lotesAtivos || []).forEach(l => {
          const key = String(l.fazenda_id)
          if (!lotesPorFazenda.has(key)) lotesPorFazenda.set(key, [])
          lotesPorFazenda.get(key).push(l)
        })
      }

      const necessarioHa = quantidadeNum / 3
      const fazendaComEspaco = fazendasJogador.find(fz => {
        const usada = calcHaUsada(lotesPorFazenda.get(String(fz.id)))
        return usada + necessarioHa <= Number(fz.tamanho_ha || 0)
      })

      if (!fazendaComEspaco) {
        const capacidadeTotal = fazendasJogador.reduce((s, fz) => s + Number(fz.tamanho_ha || 0), 0)
        const capacidadeUsada = fazendasJogador.reduce(
          (s, fz) => s + calcHaUsada(lotesPorFazenda.get(String(fz.id))),
          0
        )

        return res.status(400).json({
          error: `Sem capacidade total! Usada: ${Math.round(capacidadeUsada * 10) / 10}/${capacidadeTotal} ha equiv. nas ${fazendasJogador.length} fazenda(s) do jogador.`,
        })
      }

      fazendaIdFinal = fazendaComEspaco.id
      fazendaNomeFinal = fazendaComEspaco.nome
    }

    // Generate unique codigo.
    const { data: maxData } = await query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 3) AS INTEGER)),0) as mx FROM lotes WHERE codigo ~ '^L-[0-9]+'",
      []
    )
    const nextNum = parseInt(maxData?.[0]?.mx || 0, 10) + 1
    const codigo = `L-${String(nextNum).padStart(3, '0')}`

    const dataCompra = new Date(data_compra || new Date())
    const fase2 = new Date(dataCompra)
    fase2.setDate(fase2.getDate() + 7)
    const fase3 = new Date(dataCompra)
    fase3.setDate(fase3.getDate() + 14)
    const fase4 = new Date(dataCompra)
    fase4.setDate(fase4.getDate() + 21)

    const { data, error } = await queryOne(
      `INSERT INTO lotes (codigo, jogador_id, jogador_nome, fazenda, fazenda_id, quantidade, fase, peso_kg, valor_compra, data_compra, data_fase2, data_fase3, data_fase4, status, comprovante)
       VALUES ($1,$2,$3,$4,$5,$6,'bezerro',180,$7,$8,$9,$10,$11,'ativo',$12) RETURNING *`,
      [
        codigo,
        jogador_id,
        jogador_nome,
        fazendaNomeFinal || '',
        fazendaIdFinal || null,
        quantidadeNum,
        valorCompraNum,
        dataCompra.toISOString().split('T')[0],
        fase2.toISOString().split('T')[0],
        fase3.toISOString().split('T')[0],
        fase4.toISOString().split('T')[0],
        comprovante || '',
      ]
    )
    if (error) return res.status(500).json({ error: error.message })

    await query(
      `INSERT INTO transacoes (tipo, lote_id, lote_codigo, de_jogador, para_jogador, quantidade, valor, fase, status)
       VALUES ('compra_npc',$1,$2,'Posto Agropecuario',$3,$4,$5,'bezerro','concluido')`,
      [data.id, codigo, jogador_nome, quantidadeNum, quantidadeNum * valorCompraNum]
    )

    await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`, [
      user.username,
      'Lote registrado',
      `${codigo} - ${jogador_nome} - ${quantidadeNum} cab.`,
    ])

    return res.json(data)
  }

  res.status(405).end()
}
