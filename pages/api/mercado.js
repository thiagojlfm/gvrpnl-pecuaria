import { query } from '../../lib/db'

export default async function handler(req, res) {
  const { data: lotes } = await query(
    `SELECT fase, quantidade, status FROM lotes WHERE status IN ('ativo','aguardando_pagamento')`, []
  )

  const rebanho = { bezerro:0, garrote:0, boi:0, total:0 }
  lotes?.forEach(l => {
    if (l.fase !== 'abatido') {
      rebanho[l.fase] = (rebanho[l.fase]||0) + l.quantidade
      rebanho.total += l.quantidade
    }
  })

  // precoKg: começa em $3 com rebanho vazio, sobe para $5 com rebanho cheio (50 cab ideal)
  // Isso significa: mais gado = animais mais valiosos, mas ração mais cara
  // Margem máx ~30% com precoKg=3 e ração base
  const ideal = 200
  const ratio = Math.min(rebanho.total / ideal, 1)
  const precoKg = Number((3 + ratio * 2).toFixed(2)) // 3 vazio → 5 cheio

  // Ração: base $2, sobe com rebanho
  let precoRacao = 2
  if (rebanho.total > 600) precoRacao = 3
  else if (rebanho.total > 400) precoRacao = 2.4

  const racaoPorCabeca = 112
  const custoRacao = racaoPorCabeca * precoRacao

  const precos = {
    precoKg,
    precoRacao,
    racaoPorCabeca,
    custoRacao,
    bezerro: 1100,
    garrote: Math.round(400 * precoKg),
    boi: Math.round(540 * precoKg),
    abate: Math.round(648 * precoKg),
    frete: 50,
    racaoDiariaBezerro: 3,
    racaoDiariaGarrote: 5,
    racaoDiariaBoi: 8,
  }

  const custoTotal = precos.bezerro + precos.frete + custoRacao
  const margem = Number(((precos.abate - custoTotal) / precos.abate * 100).toFixed(1))

  res.json({ rebanho, precos, margem })
}
