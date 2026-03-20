import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })

  if (req.method === 'POST') {
    const { lote_id, lote_codigo, quantidade, vendedor_nome, comprador_id, comprador_nome } = req.body

    const valorFrete = quantidade * 30 // $30/cab
    const blocoTotal = Math.ceil(quantidade / 30)
    let qtdRestante = quantidade
    let blocoNum = 1

    while (qtdRestante > 0) {
      const qtdEste = Math.min(qtdRestante, 30)
      const valorEste = qtdEste * 30
      await query(
        `INSERT INTO fretes_transportadora
         (lote_id, lote_codigo, origem, destino, quantidade, valor, comprador_id, status, bloco_num, bloco_total, tipo_carga)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'disponivel',$8,$9,'gado')`,
        [lote_id, lote_codigo,
         `Fazenda de ${vendedor_nome}`,
         `Fazenda de ${comprador_nome}`,
         qtdEste, valorEste, comprador_id, blocoNum, blocoTotal]
      )
      qtdRestante -= qtdEste
      blocoNum++
    }

    // Notificar transportadores
    const { data: trans } = await query(`SELECT DISTINCT jogador_id FROM caminhoes WHERE status='disponivel'`, [])
    for (const t of (trans||[])) {
      await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [t.jogador_id, '🚛 Frete de venda disponível!',
         `${quantidade} animais — ${vendedor_nome} → ${comprador_nome} — $${valorFrete}`])
    }

    // Notificar comprador
    if (comprador_id) {
      await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [comprador_id, '🐄 Animais a caminho!',
         `Frete de ${quantidade} animais gerado. Acesse a Transportadora para acompanhar.`])
    }

    return res.json({ ok: true, fretes: blocoTotal })
  }

  res.status(405).end()
}
