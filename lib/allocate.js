import { query } from './db'

/**
 * Capacidade em cabeças por hectare, por fase.
 *   bezerro: 3  · garrote: 2  · boi/abatido: 1
 *
 * Isto é o "custo" em ha-equivalente de cada cabeça já alocada.
 */
export const CAP_POR_HA = { bezerro: 3, garrote: 2, boi: 1, abatido: 1 }

/** Soma de hectares-equivalente ocupados por uma lista de lotes. */
export function calcHaUsada(lotes = []) {
  return (lotes || []).reduce(
    (s, l) => s + Number(l.quantidade || 0) / (CAP_POR_HA[l.fase] || 1),
    0
  )
}

/**
 * Aloca um lote recém-comprado na PRIMEIRA fazenda do jogador que
 * comporte todas as cabeças. Bezerros consomem 1/3 ha por cabeça
 * (i.e. quantidade/3 hectares).
 *
 * Ordem de avaliação:
 *   1. A fazenda "preferida" (vinda da UI / solicitação), se houver.
 *   2. Demais fazendas do jogador em ordem de id ASC
 *      (estável — a "primeira com espaço" é sempre a mesma).
 *
 * @param {string|number}  jogadorId
 * @param {number}         quantidade          cabeças do lote a criar
 * @param {string|number?} preferredFazendaId  fazenda escolhida na UI (opcional)
 * @param {string}         fase                fase do lote entrando (default 'bezerro')
 * @returns {Promise<{
 *   fazenda: object|null,         // fazenda escolhida
 *   fazendas: object[],           // todas as fazendas do jogador
 *   ocupacao: Record<string,{usada:number,total:number,livre:number}>,
 *   necessarioHa: number,
 *   redirecionada: boolean,       // true se caiu numa fazenda diferente da preferida
 *   semEspaco: boolean,
 * }>}
 */
export async function allocateFarm(jogadorId, quantidade, preferredFazendaId = null, fase = 'bezerro') {
  const qNum = Number(quantidade || 0)
  const necessarioHa = qNum / (CAP_POR_HA[fase] || 1)

  const { data: fazendas } = await query(
    `SELECT * FROM fazendas WHERE dono_id = $1 ORDER BY id ASC`,
    [jogadorId]
  )

  const lista = fazendas || []
  if (lista.length === 0) {
    return { fazenda: null, fazendas: [], ocupacao: {}, necessarioHa, redirecionada: false, semEspaco: true }
  }

  // Ordem: preferida primeiro, depois id ASC.
  const candidatas = [...lista]
  if (preferredFazendaId) {
    const idx = candidatas.findIndex(f => String(f.id) === String(preferredFazendaId))
    if (idx > 0) { const [fav] = candidatas.splice(idx, 1); candidatas.unshift(fav) }
  }

  // Puxa lotes ativos de todas as fazendas numa query só.
  const ids = lista.map(f => Number(f.id)).filter(Number.isFinite)
  const { data: lotesAtivos } = await query(
    `SELECT fazenda_id, fase, quantidade
       FROM lotes
      WHERE fazenda_id = ANY($1::int[])
        AND status NOT IN ('pago','vendido')`,
    [ids]
  )

  const porFazenda = new Map()
  ;(lotesAtivos || []).forEach(l => {
    const k = String(l.fazenda_id)
    if (!porFazenda.has(k)) porFazenda.set(k, [])
    porFazenda.get(k).push(l)
  })

  const ocupacao = {}
  lista.forEach(f => {
    const usada = calcHaUsada(porFazenda.get(String(f.id)))
    const total = Number(f.tamanho_ha || 0)
    ocupacao[String(f.id)] = {
      usada: Math.round(usada * 10) / 10,
      total,
      livre: Math.round((total - usada) * 10) / 10,
    }
  })

  // Primeira fazenda com espaço para o lote inteiro.
  const escolhida = candidatas.find(f => {
    const o = ocupacao[String(f.id)]
    return o && o.usada + necessarioHa <= o.total
  }) || null

  return {
    fazenda: escolhida,
    fazendas: lista,
    ocupacao,
    necessarioHa: Math.round(necessarioHa * 10) / 10,
    redirecionada: !!(escolhida && preferredFazendaId && String(escolhida.id) !== String(preferredFazendaId)),
    semEspaco: !escolhida,
  }
}
