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
  const ideal = 50
  const ratio = Math.min(rebanho.total / ideal, 1)
  const precoKg = Number((5 - (ratio * 2)).toFixed(2))
  const precos = {
    precoKg,
    bezerro: 900,
    garrote: Math.round(400 * precoKg),
    boi: Math.round(540 * precoKg),
    abate: Math.round(540 * precoKg * 1.2),
    frete: 50
  }
  res.json({ rebanho, precos })
}
