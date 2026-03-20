import { query } from '../../lib/db'

export default async function handler(req, res) {
  const { data: lotes } = await query(
    `SELECT fase, quantidade FROM lotes WHERE status IN ('ativo','aguardando_pagamento','em_transito')`, []
  )

  const rebanho = { bezerro:0, garrote:0, boi:0, total:0 }
  lotes?.forEach(l => {
    if (l.fase !== 'abatido') {
      rebanho[l.fase] = (rebanho[l.fase]||0) + l.quantidade
      rebanho.total += l.quantidade
    }
  })

  // ratio: 0 = vazio, 1 = cheio (base 400 cab)
  const ratio = Math.min(rebanho.total / 400, 1)

  // precoKg por fase — varia apenas 5% entre vazio e cheio
  // Mínimo (cheio) garante margem mínima mesmo com ração cara
  const precoKgGarrote = Number((2.65 + (1 - ratio) * 0.13).toFixed(2)) // 2.65 → 2.78
  const precoKgBoi     = Number((2.43 + (1 - ratio) * 0.12).toFixed(2)) // 2.43 → 2.55
  const precoKgAbate   = Number((2.66 + (1 - ratio) * 0.13).toFixed(2)) // 2.66 → 2.79

  // Ração sobe com demanda
  let precoRacao = 2.00
  if (rebanho.total > 600) precoRacao = 3.00
  else if (rebanho.total > 400) precoRacao = 2.40

  // Custos acumulados por fase
  const custoAteGarrote = 800 + 50 + Math.round(21 * precoRacao * 100) / 100
  const custoAteBoi     = custoAteGarrote + Math.round(35 * precoRacao * 100) / 100
  const custoAteAbate   = custoAteBoi + Math.round(56 * precoRacao * 100) / 100

  const precos = {
    precoKgGarrote,
    precoKgBoi,
    precoKgAbate,
    precoKg: precoKgAbate, // compat
    precoRacao,
    racaoPorCabeca: 112,
    custoRacao: Math.round(112 * precoRacao * 100) / 100,
    bezerro: 800,
    garrote: Math.round(400 * precoKgGarrote),
    boi:     Math.round(540 * precoKgBoi),
    abate:   Math.round(648 * precoKgAbate),
    frete: 50,
    racaoDiariaBezerro: 3,
    racaoDiariaGarrote: 5,
    racaoDiariaBoi: 8,
  }

  // Margens por fase
  const margemGarrote = Number(((precos.garrote - custoAteGarrote) / precos.garrote * 100).toFixed(1))
  const margemBoi     = Number(((precos.boi - custoAteBoi) / precos.boi * 100).toFixed(1))
  const margemAbate   = Number(((precos.abate - custoAteAbate) / precos.abate * 100).toFixed(1))

  res.json({ rebanho, precos, margem: margemAbate, margemGarrote, margemBoi, margemAbate })
}
