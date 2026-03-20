import { query, queryOne } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

// 6 campos de pasto NPC com tamanhos e preços variados
const CAMPOS_PASTO = [
  { id:1, nome:'Campo Verde Norte', regiao:'Green Hills Norte', ha:20, preco_semana:10500, foto_url:'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=600&q=80', disponivel:true },
  { id:2, nome:'Pastagem Rio Claro', regiao:'Green Hills Sul', ha:35, preco_semana:17400, foto_url:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80', disponivel:true },
  { id:3, nome:'Campo Dourado Oeste', regiao:'Lake Ville', ha:50, preco_semana:22500, foto_url:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80', disponivel:true },
  { id:4, nome:'Pasto Serra Alta', regiao:'Green Hills Talhões', ha:25, preco_semana:12600, foto_url:'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=600&q=80', disponivel:true },
  { id:5, nome:'Retiro Bela Vista', regiao:'Lake Ville Talhões', ha:40, preco_semana:18600, foto_url:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80', disponivel:true },
  { id:6, nome:'Campo Novo Horizonte', regiao:'Green Hills', ha:70, preco_semana:31500, foto_url:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80', disponivel:true },
]

const CAP_POR_HA = { bezerro:3, garrote:2, boi:1 }

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null

  // Create table if not exists
  await query(`CREATE TABLE IF NOT EXISTS alugueis_pasto (
    id SERIAL PRIMARY KEY,
    jogador_id UUID NOT NULL,
    jogador_nome TEXT,
    campo_id INTEGER NOT NULL,
    campo_nome TEXT,
    ha_alugado INTEGER,
    valor_pago NUMERIC(10,2),
    valido_ate TIMESTAMP,
    status TEXT DEFAULT 'ativo',
    criado_em TIMESTAMP DEFAULT now()
  )`, [])

  if (req.method === 'GET') {
    // Listar campos + status de ocupação
    const { data: ativos } = await query(
      `SELECT campo_id, jogador_nome, valido_ate FROM alugueis_pasto
       WHERE status='ativo' AND valido_ate > NOW()`, []
    )
    const ocupados = new Map((ativos||[]).map(a => [a.campo_id, a]))

    // Meus aluguéis ativos
    let meusAlugueis = []
    if (user) {
      const { data } = await query(
        `SELECT * FROM alugueis_pasto WHERE jogador_id=$1 AND status='ativo' AND valido_ate>NOW() ORDER BY criado_em DESC`,
        [user.id]
      )
      meusAlugueis = data || []
    }

    const campos = CAMPOS_PASTO.map(c => ({
      ...c,
      cap_bezerros: c.ha * CAP_POR_HA.bezerro,
      cap_garrotes: c.ha * CAP_POR_HA.garrote,
      cap_bois: c.ha * CAP_POR_HA.boi,
      ocupado: ocupados.has(c.id),
      inquilino: ocupados.get(c.id)?.jogador_nome || null,
      meu: meusAlugueis.some(a => a.campo_id === c.id),
      valido_ate: meusAlugueis.find(a => a.campo_id === c.id)?.valido_ate || null,
    }))

    return res.json({ campos, meus: meusAlugueis })
  }

  if (!user) return res.status(401).json({ error: 'Não autorizado' })

  if (req.method === 'POST') {
    const { campo_id } = req.body
    const campo = CAMPOS_PASTO.find(c => c.id === parseInt(campo_id))
    if (!campo) return res.status(404).json({ error: 'Campo não encontrado' })

    // Verificar se já está ocupado
    const { data: ocupado } = await queryOne(
      `SELECT id FROM alugueis_pasto WHERE campo_id=$1 AND status='ativo' AND valido_ate>NOW()`,
      [campo_id]
    )
    if (ocupado) return res.status(400).json({ error: 'Campo já está alugado por outro jogador' })

    // Verificar se jogador já tem esse campo
    const { data: jatem } = await queryOne(
      `SELECT id FROM alugueis_pasto WHERE campo_id=$1 AND jogador_id=$2 AND status='ativo' AND valido_ate>NOW()`,
      [campo_id, user.id]
    )
    if (jatem) return res.status(400).json({ error: 'Você já alugou este campo' })

    const validoAte = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const { data, error } = await queryOne(
      `INSERT INTO alugueis_pasto (jogador_id, jogador_nome, campo_id, campo_nome, ha_alugado, valor_pago, valido_ate)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user.id, user.username, campo.id, campo.nome, campo.ha, campo.preco_semana, validoAte.toISOString()]
    )
    if (error) return res.status(500).json({ error: error.message })

    await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
      [user.id, '🌿 Pasto alugado!',
       `${campo.nome} — ${campo.ha}ha por 7 dias. Pague $${campo.preco_semana} ao admin.`])

    return res.json(data)
  }

  if (req.method === 'PATCH') {
    // Admin associa/desassocia jogador a campo + disponível/indisponível
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { campo_id, action, jogador_id, jogador_nome, disponivel } = req.body

    if (action === 'associar') {
      // Encerra aluguel anterior se existir
      await query(`UPDATE alugueis_pasto SET status='encerrado' WHERE campo_id=$1 AND status='ativo'`, [campo_id])
      // Cria novo aluguel associado pelo admin (sem validade, admin controla)
      const validoAte = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias default
      const campo = CAMPOS_PASTO.find(c => c.id === parseInt(campo_id))
      await queryOne(
        `INSERT INTO alugueis_pasto (jogador_id, jogador_nome, campo_id, campo_nome, ha_alugado, valor_pago, valido_ate, status)
         VALUES ($1,$2,$3,$4,$5,0,$6,'ativo')`,
        [jogador_id, jogador_nome, campo_id, campo?.nome, campo?.ha, validoAte.toISOString()]
      )
      await query(`INSERT INTO notificacoes (jogador_id, titulo, mensagem) VALUES ($1,$2,$3)`,
        [jogador_id, '🌿 Pasto associado!', `O admin associou o ${campo?.nome} à sua conta. Agora aparece em Fazendas!`])
      return res.json({ ok: true })
    }

    if (action === 'desassociar') {
      await query(`UPDATE alugueis_pasto SET status='encerrado' WHERE campo_id=$1 AND status='ativo'`, [campo_id])
      return res.json({ ok: true })
    }

    if (action === 'disponibilidade') {
      // Marca campo como disponível ou indisponível (sem aluguel)
      await query(`CREATE TABLE IF NOT EXISTS campos_status (campo_id INTEGER PRIMARY KEY, disponivel BOOLEAN DEFAULT true)`, [])
      await query(
        `INSERT INTO campos_status (campo_id, disponivel) VALUES ($1,$2)
         ON CONFLICT (campo_id) DO UPDATE SET disponivel=$2`,
        [campo_id, disponivel]
      )
      return res.json({ ok: true })
    }

    return res.status(400).json({ error: 'Ação inválida' })
  }

  if (req.method === 'DELETE') {
    // Admin encerra aluguel
    if (user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
    const { id } = req.body
    await query(`UPDATE alugueis_pasto SET status='encerrado' WHERE id=$1`, [id])
    return res.json({ ok: true })
  }

  res.status(405).end()
}
