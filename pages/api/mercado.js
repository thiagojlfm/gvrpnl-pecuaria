import { query } from '../../lib/db'

export default async function handler(req, res) {
  const { data: lotes } = await query(
    `SELECT fase, quantidade, status FROM lotes WHERE status IN ('ativo','aguardando_pagamento')`, []
  )
  const rebanho = { bezerro:0, garrote:0, boi:0, abatido:0, total:0 }
  lotes?.forEach(l => {
    rebanho[l.fase] = (rebanho[l.fase] || 0) + l.quantidade
    rebanho.total += l.quantidade
  })

  // Preço kg animal: base $3, teto $5 pelo rebanho
  const ideal = 50
  const ratio = Math.min(rebanho.total / ideal, 1)
  const precoKg = Number((5 - (ratio * 2)).toFixed(2))

  // Preço ração: base $2/kg, +20% entre 400-600, +50% acima de 600
  let precoRacao = 2
  if (rebanho.total > 600) precoRacao = 3
  else if (rebanho.total > 400) precoRacao = 2.4

  // Ração total por cabeça ciclo completo: 21+35+56 = 112kg
  const racaoPorCabeca = 112
  const custoRacao = racaoPorCabeca * precoRacao

  const precos = {
    precoKg,
    precoRacao,
    racaoPorCabeca,
    custoRacao,
    bezerro: 900,
    garrote: Math.round(400 * precoKg),
    boi: Math.round(540 * precoKg),
    abate: Math.round(540 * precoKg * 1.2),
    frete: 50,
    // Consumo por fase (kg/dia x 7 dias)
    racaoBezerro: 21,
    racaoGarrote: 35,
    racaoBoi: 56,
    racaoDiariaBezerro: 3,
    racaoDiariaGarrote: 5,
    racaoDiariaBoi: 8,
  }

  // Margem com rebanho atual
  const custoTotal = precos.bezerro + precos.frete + custoRacao
  const margem = Number(((precos.abate - custoTotal) / precos.abate * 100).toFixed(1))

  res.json({ rebanho, precos, margem })
}
