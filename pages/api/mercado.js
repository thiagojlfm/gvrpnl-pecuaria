import { query } from '../../lib/db'

export default async function handler(req, res) {
  const { data: lotes } = await query(
    `SELECT fase, quantidade, status FROM lotes WHERE status IN ('ativo','aguardando_pagamento','em_transito')`, []
  )

  const rebanho = { bezerro:0, garrote:0, boi:0, total:0 }
  lotes?.forEach(l => {
    if (l.fase !== 'abatido') {
      rebanho[l.fase] = (rebanho[l.fase]||0) + l.quantidade
      rebanho.total += l.quantidade
    }
  })

  // Ratio: 0 = vazio, 1 = cheio (base 400 cab)
  const ideal = 400
  const ratio = Math.min(rebanho.total / ideal, 1)

  // Preço por kg por fase — cai conforme rebanho aumenta (oferta sobe)
  // Vazio → Cheio
  // Garrote: $2.73 → $2.20  (margem cai de ~18% para ~12%)
  // Boi:     $2.49 → $2.05  (margem cai de ~25% para ~20%)
  // Abate:   $2.55 → $2.05  (margem cai de ~35% para ~27%)
  const precoKgGarrote = Number((2.73 - ratio * 0.53).toFixed(2))
  const precoKgBoi     = Number((2.49 - ratio * 0.44).toFixed(2))
  const precoKgAbate   = Number((2.55 - ratio * 0.50).toFixed(2))

  // Ração: sobe com demanda
  let precoRacao = 2.00
  if (rebanho.total > 600) precoRacao = 3.00
  else if (rebanho.total > 400) precoRacao = 2.40

  const racaoPorCabeca = 112 // total ciclo completo
  const custoRacao = racaoPorCabeca * precoRacao

  const precos = {
    // Preço por kg de cada fase
    precoKgGarrote,
    precoKgBoi,
    precoKgAbate,
    precoKg: precoKgAbate, // compat
    precoRacao,
    racaoPorCabeca,
    custoRacao,
    // Preço por cabeça
    bezerro: 800,
    garrote: Math.round(400 * precoKgGarrote),
    boi:     Math.round(540 * precoKgBoi),
    abate:   Math.round(648 * precoKgAbate),
    frete: 50,
    racaoDiariaBezerro: 3,
    racaoDiariaGarrote: 5,
    racaoDiariaBoi: 8,
  }

  // Margem estimada ciclo completo (bezerro → abate)
  const custoTotal = precos.bezerro + precos.frete + custoRacao
  const margem = Number(((precos.abate - custoTotal) / precos.abate * 100).toFixed(1))

  // Margens por fase para exibir no mercado
  const custoAteGarrote = 800 + 50 + (21 * precoRacao) + (35 * precoRacao)
  const custoAteBoi = custoAteGarrote + (56 * precoRacao)
  const margemGarrote = Number(((precos.garrote - custoAteGarrote) / precos.garrote * 100).toFixed(1))
  const margemBoi = Number(((precos.boi - custoAteBoi) / precos.boi * 100).toFixed(1))
  const margemAbate = margem

  res.json({ rebanho, precos, margem, margemGarrote, margemBoi, margemAbate })
}
