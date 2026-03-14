import { query } from '../../lib/db'
import { verifyToken, getTokenFromReq } from '../../lib/auth'

const FAZENDAS = [
  { codigo:'0324', nome:'Porto Aurora 2', regiao:'Green Hills', tamanho_ha:25, tipologia:'Mista - Grãos e Gado', foto_url:'/fazenda_0324.png' },
  { codigo:'0325', nome:'Porto Aurora 1', regiao:'Green Hills', tamanho_ha:40, tipologia:'Mista - Grãos e Gado', foto_url:'/fazenda_0325.png' },
  { codigo:'0326', nome:'Fazenda 0326', regiao:'Green Hills', tamanho_ha:35, tipologia:'Mista - Grãos e Gado', foto_url:'/fazenda_0326.png' },
  { codigo:'0327', nome:'Fazenda 0327', regiao:'Green Hills', tamanho_ha:50, tipologia:'Mista - Grãos e Gado', foto_url:'/fazenda_0327.png' },
  { codigo:'0328', nome:'Fazenda 0328', regiao:'Green Hills', tamanho_ha:65, tipologia:'Grãos', foto_url:'/fazenda_0328.png' },
  { codigo:'0329', nome:'Fazenda 0329', regiao:'Green Hills Talhões', tamanho_ha:25, tipologia:'Grãos', foto_url:'/fazenda_0329.png' },
  { codigo:'0330', nome:'Fazenda 0330', regiao:'Green Hills Talhões', tamanho_ha:40, tipologia:'Grãos', foto_url:'/fazenda_0330.png' },
  { codigo:'0331', nome:'Fazenda 0331', regiao:'Green Hills', tamanho_ha:150, tipologia:'Mista', foto_url:'/fazenda_0331.png' },
  { codigo:'0332', nome:'Fazenda 0332', regiao:'Green Hills Talhões', tamanho_ha:30, tipologia:'Grãos', foto_url:'/fazenda_0332.png' },
  { codigo:'0333', nome:'Fazenda 0333', regiao:'Lake Ville Talhões', tamanho_ha:50, tipologia:'Grãos', foto_url:'/fazenda_0333.png' },
  { codigo:'0403', nome:'Fazenda 0403', regiao:'Lake Ville', tamanho_ha:40, tipologia:'Mista', foto_url:'/fazenda_0403.png' },
]

export default async function handler(req, res) {
  const token = getTokenFromReq(req)
  const user = token ? verifyToken(token) : null
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' })
  if (req.method !== 'POST') return res.status(405).end()

  // Wipe and re-seed
  await query(`DELETE FROM fazendas WHERE dono_id IS NULL`, [])

  for (const f of FAZENDAS) {
    const { data: existing } = await query(`SELECT id FROM fazendas WHERE codigo = $1`, [f.codigo])
    if (existing?.length) continue // skip if exists
    await query(
      `INSERT INTO fazendas (codigo, nome, regiao, tamanho_ha, tipologia, foto_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,'disponivel')`,
      [f.codigo, f.nome, f.regiao, f.tamanho_ha, f.tipologia, f.foto_url]
    )
  }

  const { data } = await query(`SELECT * FROM fazendas ORDER BY codigo ASC`, [])
  return res.json({ ok: true, total: data?.length, fazendas: data })
}
