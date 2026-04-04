import { query, queryOne } from '../../../lib/db'
import { verifyToken, getTokenFromReq } from '../../../lib/auth'

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user  = token ? verifyToken(token) : null
  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // Auto-expirar alugueis vencidos
  await query(`
    UPDATE lavoura_alugueis SET status = 'concluido'
    WHERE status = 'ativo' AND fim_aluguel < now()
  `, [])

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { tipo } = req.query

    // Máquinas disponíveis para alugar (de outros jogadores)
    if (tipo === 'disponiveis') {
      const { data } = await query(`
        SELECT lg.id, lg.tipo, lg.marca, lg.nome, lg.preco_aluguel_dia,
               u.username AS dono_nome, lg.jogador_id AS dono_id
        FROM lavoura_garagem lg
        JOIN usuarios u ON u.id = lg.jogador_id
        WHERE lg.disponivel_aluguel = true
          AND lg.jogador_id != $1
          AND NOT EXISTS (
            SELECT 1 FROM lavoura_alugueis la
            WHERE la.maquina_id = lg.id AND la.status = 'ativo'
          )
        ORDER BY lg.preco_aluguel_dia ASC
      `, [user.id])
      return res.json(data || [])
    }

    // Meus alugueis ativos como locatário
    if (tipo === 'meus') {
      const { data } = await query(`
        SELECT la.*, u.username AS dono_nome
        FROM lavoura_alugueis la
        JOIN usuarios u ON u.id = la.dono_id
        WHERE la.locatario_id = $1 AND la.status = 'ativo' AND la.fim_aluguel > now()
        ORDER BY la.fim_aluguel ASC
      `, [user.id])
      return res.json(data || [])
    }

    // Minhas máquinas em aluguel como dono
    if (tipo === 'dono') {
      const { data } = await query(`
        SELECT la.*, lg.nome AS maquina_nome, lg.tipo AS maquina_tipo
        FROM lavoura_alugueis la
        JOIN lavoura_garagem lg ON lg.id = la.maquina_id
        WHERE la.dono_id = $1 AND la.status IN ('pendente','ativo')
        ORDER BY la.criado_em DESC
      `, [user.id])
      return res.json(data || [])
    }

    // Admin: pedidos pendentes de aluguel
    if (tipo === 'pendentes') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
      const { data } = await query(`
        SELECT la.*, lg.nome AS maquina_nome, lg.tipo AS maquina_tipo
        FROM lavoura_alugueis la
        JOIN lavoura_garagem lg ON lg.id = la.maquina_id
        WHERE la.status = 'pendente'
        ORDER BY la.criado_em ASC
      `, [])
      return res.json(data || [])
    }

    return res.status(400).json({ error: 'tipo inválido' })
  }

  // ── POST — locatário solicita aluguel ────────────────────────────────────
  if (req.method === 'POST') {
    const { maquina_id, dias, comprovante } = req.body
    if (!maquina_id || !dias || !comprovante)
      return res.status(400).json({ error: 'maquina_id, dias e comprovante são obrigatórios' })

    const { data: maq } = await queryOne(`
      SELECT lg.*, u.username AS dono_nome
      FROM lavoura_garagem lg
      JOIN usuarios u ON u.id = lg.jogador_id
      WHERE lg.id = $1 AND lg.disponivel_aluguel = true
    `, [maquina_id])
    if (!maq) return res.status(404).json({ error: 'Máquina não encontrada ou não disponível' })
    if (String(maq.jogador_id) === String(user.id))
      return res.status(400).json({ error: 'Você não pode alugar sua própria máquina' })

    // Verificar se já está alugada
    const { data: jaAtivo } = await queryOne(
      `SELECT id FROM lavoura_alugueis WHERE maquina_id=$1 AND status='ativo' LIMIT 1`, [maquina_id]
    )
    if (jaAtivo) return res.status(400).json({ error: 'Máquina já está alugada no momento' })

    // Verificar pedido pendente duplicado do mesmo locatário
    const { data: jaPend } = await queryOne(
      `SELECT id FROM lavoura_alugueis WHERE maquina_id=$1 AND locatario_id=$2 AND status='pendente' LIMIT 1`,
      [maquina_id, user.id]
    )
    if (jaPend) return res.status(400).json({ error: 'Você já tem um pedido pendente para essa máquina' })

    const diasInt   = Math.min(Math.max(parseInt(dias)||1, 1), 30)
    const valorTotal = parseFloat(maq.preco_aluguel_dia) * diasInt

    const { data, error } = await queryOne(`
      INSERT INTO lavoura_alugueis
        (maquina_id, dono_id, dono_nome, locatario_id, locatario_nome,
         modelo_nome, tipo, marca, capacidade, preco_dia, dias, valor_total, comprovante)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [maquina_id, maq.jogador_id, maq.dono_nome, user.id, user.username,
        maq.nome, maq.tipo, maq.marca, maq.capacidade,
        maq.preco_aluguel_dia, diasInt, valorTotal, comprovante])
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // ── PATCH ────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { action } = req.body

    // Dono configura disponibilidade + preço
    if (action === 'configurar') {
      const { maquina_id, disponivel, preco_dia } = req.body
      const { data: maq } = await queryOne(`SELECT * FROM lavoura_garagem WHERE id=$1`, [maquina_id])
      if (!maq || String(maq.jogador_id) !== String(user.id))
        return res.status(403).json({ error: 'Não é sua máquina' })
      await query(
        `UPDATE lavoura_garagem SET disponivel_aluguel=$1, preco_aluguel_dia=$2 WHERE id=$3`,
        [!!disponivel, parseFloat(preco_dia)||0, maquina_id]
      )
      return res.json({ ok: true })
    }

    // Admin aprova ou recusa
    if (action === 'aprovar' || action === 'recusar') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
      const { id } = req.body
      const { data: al } = await queryOne(`SELECT * FROM lavoura_alugueis WHERE id=$1`, [id])
      if (!al) return res.status(404).json({ error: 'Aluguel não encontrado' })

      if (action === 'recusar') {
        await query(`UPDATE lavoura_alugueis SET status='recusado' WHERE id=$1`, [id])
        await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [al.locatario_id, '❌ Aluguel recusado',
           `O pedido de aluguel de ${al.modelo_nome} foi recusado pelo admin.`])
        return res.json({ ok: true })
      }

      // Aprovar
      const inicio = new Date()
      const fim    = new Date(inicio.getTime() + al.dias * 24 * 60 * 60 * 1000)
      await query(
        `UPDATE lavoura_alugueis SET status='ativo', inicio_aluguel=$1, fim_aluguel=$2 WHERE id=$3`,
        [inicio.toISOString(), fim.toISOString(), id]
      )
      await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [al.locatario_id, '🚜 Aluguel aprovado!',
         `${al.modelo_nome} está disponível por ${al.dias} dia(s). Válido até ${fim.toLocaleDateString('pt-BR')}.`])
      await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [al.dono_id, '💰 Máquina alugada!',
         `${al.locatario_nome} alugou sua ${al.modelo_nome} por ${al.dias}d. Valor: $${al.valor_total}.`])
      await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
        [user.username, 'Aluguel aprovado',
         `${al.locatario_nome} alugou ${al.modelo_nome} de ${al.dono_nome} por ${al.dias}d — $${al.valor_total}`])
      return res.json({ ok: true })
    }

    return res.status(400).json({ error: 'action inválida' })
  }

  // ── DELETE — locatário cancela pedido pendente ───────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body
    const { data: al } = await queryOne(`SELECT * FROM lavoura_alugueis WHERE id=$1`, [id])
    if (!al) return res.status(404).json({ error: 'Não encontrado' })
    if (String(al.locatario_id) !== String(user.id) && user.role !== 'admin')
      return res.status(403).json({ error: 'Sem permissão' })
    if (al.status !== 'pendente')
      return res.status(400).json({ error: 'Só pode cancelar pedidos pendentes' })
    await query(`UPDATE lavoura_alugueis SET status='cancelado' WHERE id=$1`, [id])
    return res.json({ ok: true })
  }

  res.status(405).end()
}
