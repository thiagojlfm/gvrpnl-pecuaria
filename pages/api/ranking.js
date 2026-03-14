import { query } from '../../lib/db'

export default async function handler(req, res) {
  const { data } = await query(`
    SELECT
      t.para_jogador AS nome,
      COUNT(*) AS total_abates,
      SUM(t.quantidade) AS total_cabecas,
      SUM(t.valor) AS total_ganho
    FROM transacoes t
    WHERE t.tipo = 'abate'
    GROUP BY t.para_jogador
    ORDER BY total_ganho DESC
    LIMIT 10
  `, [])
  return res.json(data || [])
}
