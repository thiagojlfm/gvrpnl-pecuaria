import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

// Seed de modelos padrão — caminhões
const MODELOS_PADRAO = [
  { modelo:'Van de Ração', descricao:'Exclusiva para transporte de ração. Não transporta gado.', capacidade:0, racao_cap:500, preco:50000, foto_url:'/van.jpg', tipo:'racao' },
  { modelo:'Truck Pequeno', descricao:'Ideal para pequenos criadores.', capacidade:30, racao_cap:1500, preco:80000, foto_url:'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&q=80' },
  { modelo:'Truck Médio', descricao:'O mais popular do servidor.', capacidade:60, racao_cap:3000, preco:150000, foto_url:'/truck_medio.jpg' },
  { modelo:'Carretão', descricao:'Para grandes fazendas. Máxima capacidade por viagem.', capacidade:120, racao_cap:6000, preco:210000, foto_url:'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=400&q=80' },
]

// Seed de maquinário agrícola — Lavoura
// capacidade = ha/dia | racao_cap = 0 (não usa) | tipo = lavoura_trator / lavoura_plantadeira / lavoura_colheitadeira
const MAQUINAS_LAVOURA = [
  // ── Tratores ──────────────────────────────────────────────────────────────
  {
    modelo:'Valtra A110', marca:'Valtra',
    descricao:'Trator de entrada. Robusto, econômico e fácil de manter. Ideal para quem está começando na lavoura.',
    capacidade:30, racao_cap:0, preco:45000,
    foto_url:'/Valtra.jpg', tipo:'lavoura_trator',
  },
  {
    modelo:'John Deere 7J', marca:'John Deere',
    descricao:'Trator intermediário com motor de 150cv e transmissão CommandQuad. Dobra a produtividade no campo.',
    capacidade:70, racao_cap:0, preco:85000,
    foto_url:'/Johndeere.jpg', tipo:'lavoura_trator',
  },
  {
    modelo:'Fendt 900 Vario', marca:'Fendt',
    descricao:'O trator mais potente disponível. Transmissão CVT, 240cv e GPS integrado. Máximo rendimento por hectare.',
    capacidade:150, racao_cap:0, preco:130000,
    foto_url:'/fendt.jpg', tipo:'lavoura_trator',
  },
  // ── Plantadeiras ──────────────────────────────────────────────────────────
  {
    modelo:'Valtra SP-20', marca:'Valtra',
    descricao:'Plantadeira de 20 linhas para pequenas e médias propriedades. Simples, eficiente e de fácil regulagem.',
    capacidade:30, racao_cap:0, preco:28000,
    foto_url:'/valtra sp 20.jpg', tipo:'lavoura_plantadeira',
  },
  {
    modelo:'John Deere DB 40', marca:'John Deere',
    descricao:'Plantadeira de 36 linhas com dosagem eletrônica de sementes. Precisão milimétrica no plantio.',
    capacidade:70, racao_cap:0, preco:55000,
    foto_url:'/db 40.jpg', tipo:'lavoura_plantadeira',
  },
  {
    modelo:'Fendt Momentum 12.75', marca:'Fendt',
    descricao:'Plantadeira de alta velocidade com sistema de corte individual. A mais rápida e precisa do mercado.',
    capacidade:150, racao_cap:0, preco:95000,
    foto_url:'/momentum.jpg', tipo:'lavoura_plantadeira',
  },
  // ── Colheitadeiras ────────────────────────────────────────────────────────
  {
    modelo:'Valtra BC 6500', marca:'Valtra',
    descricao:'Colheitadeira compacta e ágil para propriedades menores. Plataforma de 25 pés com perda mínima.',
    capacidade:30, racao_cap:0, preco:52000,
    foto_url:'/valtra bc500.jpg', tipo:'lavoura_colheitadeira',
  },
  {
    modelo:'John Deere S550', marca:'John Deere',
    descricao:'Colheitadeira de 473cv com trilha axial. Processamento rápido e tanque de 14.000 litros.',
    capacidade:70, racao_cap:0, preco:95000,
    foto_url:'/s550.jpg', tipo:'lavoura_colheitadeira',
  },
  {
    modelo:'Fendt IDEAL 7T', marca:'Fendt',
    descricao:'A colheitadeira mais avançada do mundo. Dois rotores, 790cv e sistema IDEAL Drive. Zero perdas de grão.',
    capacidade:150, racao_cap:0, preco:145000,
    foto_url:'/fendt 7t.jpg', tipo:'lavoura_colheitadeira',
  },
]

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  // GET — estoque da concessionária
  if (req.method === 'GET') {
    const { tipo } = req.query

    // Seed caminhões se não existirem
    const { data: check } = await query(`SELECT id FROM concessionaria_estoque WHERE modelo = 'Van de Ração' LIMIT 1`, [])
    if (!check?.length) {
      for (const m of MODELOS_PADRAO) {
        await query(
          `INSERT INTO concessionaria_estoque (modelo, descricao, capacidade, racao_cap, preco, foto_url, tipo) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [m.modelo, m.descricao, m.capacidade, m.racao_cap||0, m.preco, m.foto_url, m.tipo||'gado']
        )
      }
    }

    // Seed maquinário de lavoura se não existirem
    const { data: checkLav } = await query(`SELECT id FROM concessionaria_estoque WHERE tipo LIKE 'lavoura_%' LIMIT 1`, [])
    if (!checkLav?.length) {
      for (const m of MAQUINAS_LAVOURA) {
        await query(
          `INSERT INTO concessionaria_estoque (modelo, descricao, capacidade, racao_cap, preco, foto_url, tipo) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [m.modelo, m.descricao, m.capacidade, m.racao_cap, m.preco, m.foto_url, m.tipo]
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

  // POST — jogador solicita compra
  if (req.method === 'POST') {
    const { modelo_id, comprovante, quantidade } = req.body
    const qty = Math.min(Math.max(parseInt(quantidade)||1, 1), 10)
    const { data: modelo } = await queryOne(`SELECT * FROM concessionaria_estoque WHERE id=$1`, [parseInt(modelo_id)])
    if (!modelo) return res.status(404).json({ error: 'Modelo não encontrado' })

    // Garante coluna quantidade na tabela
    await query(`CREATE TABLE IF NOT EXISTS pedidos_caminhao (
      id SERIAL PRIMARY KEY,
      jogador_id UUID, jogador_nome TEXT,
      modelo_id INTEGER, modelo_nome TEXT,
      valor NUMERIC(10,2), comprovante TEXT,
      quantidade INT DEFAULT 1,
      status TEXT DEFAULT 'pendente',
      criado_em TIMESTAMP DEFAULT now()
    )`, [])
    await query(`ALTER TABLE pedidos_caminhao ADD COLUMN IF NOT EXISTS quantidade INT DEFAULT 1`, [])

    const valorTotal = modelo.preco * qty
    const { data, error } = await queryOne(
      `INSERT INTO pedidos_caminhao (jogador_id, jogador_nome, modelo_id, modelo_nome, valor, comprovante, quantidade)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user.id, user.username, modelo_id, modelo.modelo, valorTotal, comprovante, qty]
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // PATCH — admin aprova pedido
  if (req.method === 'PATCH') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id, status } = req.body

    const { data: pedido } = await queryOne(`SELECT * FROM pedidos_caminhao WHERE id=$1`, [id])
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' })

    await query(`UPDATE pedidos_caminhao SET status=$1 WHERE id=$2`, [status, id])

    if (status === 'aprovado') {
      const { data: modelo } = await queryOne(`SELECT * FROM concessionaria_estoque WHERE id=$1`, [pedido.modelo_id])
      const qty = pedido.quantidade || 1

      if (modelo?.tipo?.startsWith('lavoura_')) {
        // ── Maquinário Lavoura → lavoura_garagem (loop qty) ────────────────
        const tipoMaq = modelo.tipo.replace('lavoura_', '')
        const marca = pedido.modelo_nome.split(' ')[0] === 'John'
          ? 'John Deere' : pedido.modelo_nome.split(' ')[0]
        for (let i = 0; i < qty; i++) {
          await queryOne(
            `INSERT INTO lavoura_garagem (jogador_id, tipo, marca, nome)
             VALUES ($1,$2,$3,$4) RETURNING id`,
            [pedido.jogador_id, tipoMaq, marca, pedido.modelo_nome]
          )
        }
        const label = qty > 1 ? `${qty}× ${pedido.modelo_nome}` : pedido.modelo_nome
        await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [pedido.jogador_id, '🚜 Máquina entregue!',
           `${label} chegou na sua garagem da Lavoura. Pronto para plantar!`])
        await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
          [user.username, 'Máquina lavoura entregue', `${pedido.jogador_nome} — ${label}`])
      } else {
        // ── Caminhão → caminhoes (loop qty) ───────────────────────────────
        const placas = []
        for (let i = 0; i < qty; i++) {
          const placa = `GV-${String(Math.floor(Math.random()*9000)+1000)}`
          placas.push(placa)
          await queryOne(
            `INSERT INTO caminhoes (jogador_id, jogador_nome, modelo, placa, capacidade, racao_cap, tipo, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'disponivel') RETURNING id`,
            [pedido.jogador_id, pedido.jogador_nome, pedido.modelo_nome, placa,
             modelo?.capacidade||60, modelo?.racao_cap||3000, modelo?.tipo||'gado']
          )
        }
        const label = qty > 1 ? `${qty}× ${pedido.modelo_nome}` : `${pedido.modelo_nome} (${placas[0]})`
        await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
          [pedido.jogador_id, '🚛 Caminhão entregue!',
           `${label} está na sua garagem. Pronto para fazer fretes!`])
        await query(`INSERT INTO admin_log (admin_nome, acao, detalhes) VALUES ($1,$2,$3)`,
          [user.username, 'Caminhão entregue', `${pedido.jogador_nome} — ${label}`])
      }
    }

    return res.json({ ok: true })
  }

  res.status(405).end()
}
