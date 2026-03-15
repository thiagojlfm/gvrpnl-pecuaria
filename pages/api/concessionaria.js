import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

// Seed de modelos padrão
const MODELOS_PADRAO = [
  { modelo:'Truck Pequeno', descricao:'Ideal para pequenos criadores.', capacidade:30, racao_cap:1500, preco:80000, foto_url:'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&q=80' },
  { modelo:'Truck Médio', descricao:'O mais popular do servidor.', capacidade:60, racao_cap:3000, preco:150000, foto_url:'/truck_medio.jpg' },
  { modelo:'Carretão', descricao:'Para grandes fazendas. Máxima capacidade por viagem.', capacidade:120, racao_cap:6000, preco:210000, foto_url:'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=400&q=80' },
]

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  // GET — estoque da concessionária
  if (req.method === 'GET') {
    const { tipo } = req.query

    // Always sync prices
    await query(`DELETE FROM concessionaria_estoque`, [])
    if (true) {
      for (const m of MODELOS_PADRAO) {
        await query(
          `INSERT INTO concessionaria_estoque (modelo, descricao, capacidade, racao_cap, preco, foto_url) VALUES ($1,$2,$3,$4,$5,$6)`,
          [m.modelo, m.descricao, m.capacidade, m.racao_cap, m.preco, m.foto_url]
        )
      }
    }

    if (tipo === 'pedidos' && user?.role === 'admin') {
      const { data } = await query(
        `SELECT * FROM pedidos_caminhao ORDER BY criado_em DESC`, []
      )
      return res.json(data || [])
    }

    const { data } = await query(`SELECT * FROM concessionaria_estoque WHERE disponivel=true ORDER BY preco ASC`, [])
    return res.json(data || [])
  }

  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  // POST — jogador solicita compra de caminhão
  if (req.method === 'POST') {
    const { modelo_id, comprovante } = req.body
    const { data: modelo } = await queryOne(`SELECT * FROM concessionaria_estoque WHERE id=$1`, [parseInt(modelo_id)])
    if (!modelo) return res.status(404).json({ error: 'Modelo não encontrado' })

    // Check se tabela pedidos_caminhao existe, se não criar inline
    await query(`CREATE TABLE IF NOT EXISTS pedidos_caminhao (
      id SERIAL PRIMARY KEY,
      jogador_id UUID, jogador_nome TEXT,
      modelo_id INTEGER, modelo_nome TEXT,
      valor NUMERIC(10,2), comprovante TEXT,
      status TEXT DEFAULT 'pendente',
      criado_em TIMESTAMP DEFAULT now()
    )`, [])

    const { data, error } = await queryOne(
      `INSERT INTO pedidos_caminhao (jogador_id, jogador_nome, modelo_id, modelo_nome, valor, comprovante)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user.id, user.username, modelo_id, modelo.modelo, modelo.preco, comprovante]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // PATCH — admin aprova pedido de caminhão
  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id, status } = req.body

    const { data: pedido } = await queryOne(`SELECT * FROM pedidos_caminhao WHERE id=$1`, [id])
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' })

    await query(`UPDATE pedidos_caminhao SET status=$1 WHERE id=$2`, [status, id])

    if (status === 'aprovado') {
      // Criar caminhão na garagem do jogador
      const { data: modelo } = await queryOne(`SELECT * FROM concessionaria_estoque WHERE id=$1`, [pedido.modelo_id])
      const placa = `GV-${String(Math.floor(Math.random()*9000)+1000)}`
      await queryOne(
        `INSERT INTO caminhoes (jogador_id, jogador_nome, modelo, placa, capacidade, racao_cap, status)
         VALUES ($1,$2,$3,$4,$5,$6,'disponivel') RETURNING *`,
        [pedido.jogador_id, pedido.jogador_nome, pedido.modelo_nome, placa, modelo?.capacidade || 60, modelo?.racao_cap || 3000]
      )
      await query(
        `INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [pedido.jogador_id, '🚛 Caminhão entregue!',
         `Seu ${pedido.modelo_nome} (placa ${placa}) está na sua garagem. Pronto para fazer fretes!`]
      )
      await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
        [user.username, 'Caminhão entregue', `${pedido.jogador_nome} — ${pedido.modelo_nome}`])
    }

    return res.json({ ok: true })
  }

  res.status(405).end()
}
