// v25 — animação mercado + simulador por fase + preços por fase
import { useState, useEffect, useCallback } from 'react'

const fmt = n => Number(n||0).toLocaleString('pt-BR')
const CAP_POR_HA = { bezerro: 3, garrote: 2, boi: 1, abatido: 1 }
const TIPOS_CUSTO = [
  { tipo:'cerca', label:'Reforma de Cerca', emoji:'🪨', urgente: false, desc:'Manutenção preventiva das cercas do pasto' },
  { tipo:'cerca_quebrada', label:'🔴 Cerca Quebrada', emoji:'🚨', urgente: true, desc:'URGENTE — risco de fuga do gado! Contratar peão para reparo imediato.' },
  { tipo:'energia', label:'🔴 Falta de Energia', emoji:'⚡', urgente: true, desc:'URGENTE — bebedouros parados, gado sem água. Chamar eletricista.' },
  { tipo:'alagamento', label:'🔴 Alagamento do Pasto', emoji:'🌊', urgente: true, desc:'URGENTE — pasto alagado, gado sem área. Providenciar drenagem.' },
  { tipo:'pragas', label:'🔴 Infestação de Pragas', emoji:'🐛', urgente: true, desc:'URGENTE — risco de doença no rebanho. Chamar veterinário imediato.' },
  { tipo:'poco_seco', label:'🔴 Poço Seco', emoji:'💧', urgente: true, desc:'URGENTE — sem água para o gado. Chamar perfurador de poço.' },
  { tipo:'vacina', label:'Vacinação', emoji:'💉', urgente: false, desc:'Aplicação preventiva de vacinas no rebanho' },
  { tipo:'pasto', label:'Limpeza de Pasto', emoji:'🌿', urgente: false, desc:'Roçagem e limpeza da área de pastagem' },
  { tipo:'bebedouro', label:'Reparo de Bebedouro', emoji:'🔧', urgente: false, desc:'Manutenção dos bebedouros' },
  { tipo:'vaqueiro', label:'Vaqueiro', emoji:'👨‍🌾', urgente: false, desc:'Contratação de vaqueiro (1 por 60 cabeças)' },
  { tipo:'veterinario', label:'Veterinário', emoji:'🩺', urgente: false, desc:'Visita veterinária ao rebanho' },
]

// ─── Capacity Calculator ──────────────────────────────────────────────────────
function calcCapacidade(lotes, tamanhoHa) {
  const usada = (lotes||[]).reduce((s,l) => {
    return s + (l.quantidade / (CAP_POR_HA[l.fase]||1))
  }, 0)
  const pct = Math.min((usada / tamanhoHa) * 100, 100)
  return { usada: Math.round(usada * 10)/10, total: tamanhoHa, pct, lotada: usada > tamanhoHa }
}

// ─── Frete Tracker ────────────────────────────────────────────────────────────
function FreteTracker({ frete, T, onChegou }) {
  const [segundos, setSegundos] = useState(0)
  const [chegou, setChegou] = useState(false)

  useEffect(() => {
    if (!frete) return
    const update = () => {
      const diff = Math.max(0, Math.ceil((new Date(frete.chega_em) - Date.now()) / 1000))
      setSegundos(diff)
      if (diff === 0 && !chegou) { setChegou(true); onChegou && onChegou() }
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [frete, chegou, onChegou])

  if (!frete) return null
  const mins = Math.floor(segundos / 60)
  const secs = segundos % 60
  const pct = frete ? Math.max(0, 100 - (segundos / 120) * 100) : 100

  return (
    <div style={{background:'#0a0818',border:'1px solid #3020a0',borderRadius:14,padding:18,marginBottom:16,overflow:'hidden',position:'relative'}}>
      <div style={{position:'absolute',top:0,left:0,height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,rgba(64,96,208,.15),rgba(128,64,192,.1))',transition:'width 1s linear'}}/>
      <div style={{position:'relative'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <span style={{fontSize:24,animation:chegou?'none':'pulse 1s infinite'}}>🚛</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:chegou?'#4ad4a0':'#a080ff'}}>
              {chegou ? '✓ Bezerros chegaram!' : 'Caminhão a caminho...'}
            </div>
            <div style={{fontSize:11,color:'#7060a0'}}>Transporte de bezerros — Gov. NPC</div>
          </div>
          {!chegou && <div style={{marginLeft:'auto',fontSize:22,fontWeight:800,color:'#a080ff',fontFamily:"'Playfair Display',serif"}}>
            {mins}:{String(secs).padStart(2,'0')}
          </div>}
        </div>
        <div style={{background:'rgba(255,255,255,.05)',borderRadius:6,height:6,overflow:'hidden'}}>
          <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,#4060d0,#8040c0)',borderRadius:6,transition:'width 1s linear'}}/>
        </div>
      </div>
    </div>
  )
}

// ─── Fazenda Card ─────────────────────────────────────────────────────────────
function FazendaCard({ fazenda, onClick, T, showBuy }) {
  const [hov, setHov] = useState(false)
  const disponivel = fazenda.status === 'disponivel'
  const tamanhoLabel = Number(fazenda.tamanho_ha) >= 100 ? 'Grande' : Number(fazenda.tamanho_ha) >= 50 ? 'Médio' : 'Pequena'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onClick && onClick(fazenda)}
      style={{
        background: T.card, border: `1px solid ${hov ? '#5030c0' : T.border}`,
        borderRadius: 16, overflow: 'hidden', cursor: onClick ? 'pointer' : 'default',
        transition: 'all .25s ease',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hov ? '0 16px 48px rgba(80,48,192,.25)' : '0 2px 12px rgba(0,0,0,.15)',
      }}
    >
      <div style={{ height: 160, overflow: 'hidden', position: 'relative', background: '#0a0802' }}>
        <img
          src={fazenda.foto_url} alt={fazenda.nome}
          style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(.8)', transition:'transform .4s', transform: hov ? 'scale(1.06)' : 'scale(1)' }}
          onError={e => e.target.style.display='none'}
        />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 50%)' }}/>
        <div style={{ position:'absolute', top:10, left:10, display:'flex', gap:6 }}>
          <span style={{ background:'rgba(10,8,24,.8)', border:'1px solid #3020a0', color:'#a080ff', fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>
            {fazenda.codigo}
          </span>
          <span style={{ background: disponivel ? 'rgba(10,42,26,.9)' : 'rgba(42,10,10,.9)', border: `1px solid ${disponivel ? '#1a6a4a' : '#6a1818'}`, color: disponivel ? '#4ad4a0' : '#e06060', fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>
            {disponivel ? '✓ Disponível' : fazenda.dono_nome ? `👤 ${fazenda.dono_nome}` : 'Ocupada'}
          </span>
        </div>
        <div style={{ position:'absolute', bottom:10, left:12, right:12 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#fff', fontFamily:"'Playfair Display',serif" }}>{fazenda.nome}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.6)' }}>{fazenda.regiao}</div>
        </div>
      </div>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
          <span style={{ background:T.inputBg, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11, padding:'3px 8px', color:T.textDim }}>
            📐 {fazenda.tamanho_ha} ha — {tamanhoLabel}
          </span>
          <span style={{ background:T.inputBg, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11, padding:'3px 8px', color:T.textDim }}>
            🐄 até {Number(fazenda.tamanho_ha) * 3} bezerros
          </span>
          {fazenda.tipologia && (
            <span style={{ background:T.inputBg, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11, padding:'3px 8px', color:T.textDim }}>
              🌾 {fazenda.tipologia}
            </span>
          )}
        </div>
        {fazenda.preco ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>
              ${fmt(fazenda.preco)}
            </div>
            {showBuy && disponivel && (
              <div style={{ fontSize:11, color:T.textMuted }}>Fale com o admin →</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize:12, color:T.textMuted, fontStyle:'italic' }}>Preço a definir</div>
        )}
      </div>
    </div>
  )
}

// ─── Fazenda Detail Modal ─────────────────────────────────────────────────────
function FazendaModal({ fazenda, onClose, T, user, api, notify, users }) {
  const [detalhe, setDetalhe] = useState(null)
  const [editPreco, setEditPreco] = useState(fazenda.preco || '')
  const [editNome, setEditNome] = useState(fazenda.nome || '')
  const [editDono, setEditDono] = useState(fazenda.dono_id || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/fazendas?id=${fazenda.id}`).then(r => r.json()).then(setDetalhe)
  }, [fazenda.id])

  async function salvar() {
    setSaving(true)
    const isAdmin = user?.role === 'admin'
    const donoUser = users?.find(u => u.id === editDono)
    const body = isAdmin ? {
      id: fazenda.id,
      preco: editPreco || null,
      nome: editNome,
      dono_id: editDono || null,
      dono_nome: donoUser?.username || null,
      status: editDono ? 'ocupada' : 'disponivel'
    } : {
      id: fazenda.id,
      nome: editNome  // owner can only edit name
    }
    const r = await api('/api/fazendas', {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
    setSaving(false)
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    notify('✓ Fazenda atualizada!')
    onClose(true)
  }

  const cap = detalhe ? calcCapacidade(detalhe.lotes, Number(fazenda.tamanho_ha)) : null

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
      <div style={{ background:T.card, border:'1px solid #3020a0', borderRadius:20, padding:32, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 30px 80px rgba(0,0,0,.5)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:T.text }}>{fazenda.nome}</h3>
            <div style={{ fontSize:12, color:T.textMuted }}>Código {fazenda.codigo} · {fazenda.regiao}</div>
          </div>
          <button onClick={() => onClose(false)} style={{ background:'none', border:'none', color:T.textMuted, fontSize:22, cursor:'pointer' }}>×</button>
        </div>

        {/* Foto */}
        <div style={{ height:180, borderRadius:12, overflow:'hidden', marginBottom:16 }}>
          <img src={fazenda.foto_url} alt={fazenda.nome} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'}/>
        </div>

        {/* Capacidade */}
        {cap && (
          <div style={{ background:T.inputBg, borderRadius:12, padding:16, marginBottom:16, border:`1px solid ${cap.lotada?'#6a1818':T.border}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
              <span style={{ color:T.textDim, fontWeight:600 }}>Capacidade usada</span>
              <span style={{ color: cap.lotada ? '#e06060' : T.gold, fontWeight:700 }}>{cap.usada}/{cap.total} ha equiv.</span>
            </div>
            <div style={{ background:T.border, borderRadius:6, height:8, overflow:'hidden' }}>
              <div style={{ width:`${cap.pct}%`, height:'100%', background: cap.lotada ? '#e06060' : 'linear-gradient(90deg,#4060d0,#8040c0)', borderRadius:6, transition:'width .5s' }}/>
            </div>
            {cap.lotada && <div style={{ fontSize:11, color:'#e06060', marginTop:6 }}>⚠ Fazenda superlotada! O dono precisa vender animais ou alugar pasto.</div>}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:12 }}>
              {['bezerro','garrote','boi'].map(f => (
                <div key={f} style={{ textAlign:'center', fontSize:11, color:T.textMuted }}>
                  <div style={{ fontWeight:600, color:T.text }}>{Number(fazenda.tamanho_ha) * CAP_POR_HA[f]}</div>
                  <div>{f === 'bezerro' ? 'Bezerros' : f === 'garrote' ? 'Garrotes' : 'Bois'} máx.</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit — admin or owner */}
        {(user?.role === 'admin' || String(user?.id) === String(fazenda.dono_id)) && (
          <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:16, marginTop:4 }}>
            <div style={{ fontSize:12, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.8px', marginBottom:12 }}>Editar fazenda</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:6 }}>Nome</label>
                <input value={editNome} onChange={e=>setEditNome(e.target.value)} style={{ width:'100%', background:T.inputBg, border:`1px solid ${T.border2}`, borderRadius:10, padding:'9px 12px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:6 }}>Preço ($)</label>
                <input type="number" value={editPreco} onChange={e=>setEditPreco(e.target.value)} placeholder="Deixe vazio se não definido" style={{ width:'100%', background:T.inputBg, border:`1px solid ${T.border2}`, borderRadius:10, padding:'9px 12px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:6 }}>Dono</label>
                <select value={editDono} onChange={e=>setEditDono(e.target.value)} style={{ width:'100%', background:T.inputBg, border:`1px solid ${T.border2}`, borderRadius:10, padding:'9px 12px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none' }}>
                  <option value="">— Sem dono (disponível) —</option>
                  {users?.filter(u=>u.role==='jogador'&&u.status==='aprovado').map(u => (
                    <option key={u.id} value={u.id}>{u.username}{u.fazenda ? ` — ${u.fazenda}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={salvar}
              disabled={saving}
              style={{ width:'100%', padding:12, background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        )}

        {/* Lotes on farm */}
        {detalhe?.lotes?.length > 0 && (
          <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:16, marginTop:16 }}>
            <div style={{ fontSize:12, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.8px', marginBottom:12 }}>Rebanho atual</div>
            {detalhe.lotes.map(l => (
              <div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                <div>
                  <span style={{ fontWeight:600, color:T.text }}>{l.codigo}</span>
                  <span style={{ color:T.textMuted, marginLeft:8 }}>{l.jogador_nome}</span>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ color:T.textDim }}>{l.quantidade} cab.</span>
                  <span style={{ background:'#0a0818', border:'1px solid #3020a0', color:'#a080ff', fontSize:10, padding:'2px 6px', borderRadius:8 }}>{l.fase}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Fazendas Page ────────────────────────────────────────────────────────────
export function FazendasPage({ T, user, api, notify, users }) {
  const [fazendas, setFazendas] = useState([])
  const [selected, setSelected] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch('/api/fazendas').then(r => r.json()).then(d => { setFazendas(d||[]); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const filtradas = fazendas.filter(f => {
    if (filtro === 'disponivel') return f.status === 'disponivel'
    if (filtro === 'ocupada') return f.status !== 'disponivel'
    return true
  })

  const disponiveis = fazendas.filter(f => f.status === 'disponivel').length

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:28, paddingBottom:16, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
          <span style={{ fontSize:24 }}>🏡</span>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:T.text }}>Fazendas</h1>
        </div>
        <p style={{ fontSize:13, color:T.textMuted, marginLeft:36 }}>Propriedades rurais disponíveis em Green Hills e Lake Ville</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Total', value:fazendas.length, icon:'🏡', color:T.text },
          { label:'Disponíveis', value:disponiveis, icon:'✓', color:'#4ad4a0' },
          { label:'Ocupadas', value:fazendas.length - disponiveis, icon:'👤', color:'#a080ff' },
          { label:'Hectares totais', value:fmt(fazendas.reduce((s,f)=>s+Number(f.tamanho_ha||0),0)), icon:'📐', color:T.gold },
        ].map(m => (
          <div key={m.label} style={{ background:T.inputBg, borderRadius:12, padding:'14px 16px', border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:10, color:T.textMuted, marginBottom:6, textTransform:'uppercase', letterSpacing:'1px', fontWeight:600 }}>{m.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:m.color, fontFamily:"'Playfair Display',serif" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['todas','Todas'],['disponivel','Disponíveis'],['ocupada','Ocupadas']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltro(v)} style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${filtro===v?'#5030c0':T.border}`, background:filtro===v?'rgba(80,48,192,.2)':'transparent', color:filtro===v?'#a080ff':T.textMuted, fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:filtro===v?600:400, transition:'all .15s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:T.textMuted }}>Carregando fazendas...</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
          {filtradas.map(f => (
            <FazendaCard key={f.id} fazenda={f} T={T} user={user} onClick={setSelected} showBuy/>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <FazendaModal
          fazenda={selected}
          T={T}
          user={user}
          api={api}
          notify={notify}
          users={users}
          onClose={(recarregar) => { setSelected(null); if(recarregar) load() }}
        />
      )}
    </div>
  )
}

// ─── Minha Fazenda Page ───────────────────────────────────────────────────────
// ─── Aluguel Pasto NPC ────────────────────────────────────────────────────────
function AluguelPastoNPC({ T, user, api, notify, fazenda }) {
  const [opcoes, setOpcoes] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api('/api/npc?tipo=pasto').then(setOpcoes)
  }, [api])

  async function alugar(op) {
    setLoading(true)
    const r = await api('/api/npc', {
      method: 'POST',
      body: JSON.stringify({ action:'alugar_pasto', fazenda_id: fazenda?.id, ha: op.ha })
    })
    setLoading(false)
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    notify(`✓ ${op.ha}ha de pasto alugado por 7 dias!`)
  }

  if (!opcoes) return null

  return (
    <div style={{ background:'rgba(42,10,10,.4)', border:'1px solid #6a1818', borderRadius:14, padding:18, marginBottom:16 }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:'#e06060', marginBottom:6 }}>
        🌿 Alugar pasto extra — NPC
      </div>
      <p style={{ fontSize:12, color:T.textMuted, marginBottom:14, lineHeight:1.6 }}>
        Sua fazenda está superlotada. Alugue pasto adicional do NPC por 1 semana para acomodar o rebanho enquanto aguarda os animais avançarem de fase.
      </p>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        {opcoes.opcoes.map(op => (
          <button key={op.ha} onClick={() => alugar(op)} disabled={loading}
            style={{ flex:1, minWidth:100, padding:'10px 8px', background:'rgba(10,42,10,.6)', border:'1px solid #2a5a12', borderRadius:10, color:'#4ad4a0', cursor:'pointer', fontFamily:'inherit', textAlign:'center' }}>
            <div style={{ fontSize:13, fontWeight:700 }}>{op.ha} ha</div>
            <div style={{ fontSize:11, color:T.textMuted, margin:'2px 0' }}>7 dias</div>
            <div style={{ fontSize:14, fontWeight:800, fontFamily:"'Playfair Display',serif" }}>${(op.valor).toLocaleString('pt-BR')}</div>
          </button>
        ))}
      </div>
      <div style={{ fontSize:11, color:T.textMuted, marginTop:10 }}>
        ${opcoes.preco_por_ha}/ha por semana · Pague no servidor e registre no admin
      </div>
    </div>
  )
}

// ─── Alertas Panel ────────────────────────────────────────────────────────────
function AlertasPanel({ minhasLotes, racao, cap, custos, T }) {
  const alertas = []

  // Ração crítica
  const consumoDiario = minhasLotes.filter(l => l.status === 'ativo')
    .reduce((s, l) => s + ({bezerro:3,garrote:5,boi:8,abatido:0}[l.fase]||0) * l.quantidade, 0)
  const diasRacao = racao?.kg_disponivel > 0 && consumoDiario > 0
    ? Math.floor(racao.kg_disponivel / consumoDiario) : null

  if (diasRacao !== null && diasRacao <= 7) {
    const urgente = diasRacao <= 2
    alertas.push({
      id:'racao', urgente,
      emoji: urgente ? '🚨' : '⚠',
      titulo: diasRacao === 0 ? 'RAÇÃO ZERADA — Gado sem comida!' : diasRacao <= 2 ? `Ração acaba em ${diasRacao} dia(s)!` : `Ração em ${diasRacao} dias`,
      desc: `Consumo: ${consumoDiario}kg/dia · Estoque: ${fmt(racao.kg_disponivel)}kg — vá ao Celeiro`,
      cor: urgente ? '#f87171' : '#c28c46',
    })
  }

  // Superlotada
  if (cap?.lotada) {
    alertas.push({
      id:'lotada', urgente: false,
      emoji:'🚜',
      titulo:'Fazenda superlotada',
      desc:`${cap.usada.toFixed(1)} ha usados de ${cap.total} ha disponíveis — venda animais ou alugue pasto`,
      cor:'#f87171',
    })
  }

  // Custos urgentes pendentes
  custos.filter(c => {
    const tipo = TIPOS_CUSTO.find(t => t.tipo === c.tipo)
    return tipo?.urgente && c.status === 'pendente'
  }).forEach(c => {
    const tipo = TIPOS_CUSTO.find(t => t.tipo === c.tipo)
    alertas.push({
      id:`custo_${c.id}`, urgente: true,
      emoji: tipo?.emoji || '⚠',
      titulo: tipo?.label || c.tipo,
      desc: tipo?.desc || c.descricao || 'Chamado urgente pendente',
      cor:'#f87171',
    })
  })

  // Fase iminente (< 24h)
  const iminentes = minhasLotes.filter(l => {
    if (!l.data_fase || l.fase === 'abatido') return false
    const dias = (new Date(l.data_fase) - Date.now()) / 86400000
    return dias >= 0 && dias <= 1
  })
  if (iminentes.length > 0) {
    alertas.push({
      id:'fase', urgente: false,
      emoji:'🐄',
      titulo:`${iminentes.length} lote(s) mudam de fase hoje`,
      desc: iminentes.map(l => `${l.codigo} (${l.fase})`).join(' · '),
      cor:'#4ade80',
    })
  }

  if (alertas.length === 0) return null

  return (
    <div style={{ marginBottom: 16 }}>
      {alertas.map(a => (
        <div key={a.id} style={{
          display:'flex', alignItems:'flex-start', gap:12,
          padding:'12px 16px', borderRadius:8, marginBottom:8,
          background:`${a.cor}0d`,
          border:`1px solid ${a.cor}44`,
          borderLeft:`3px solid ${a.cor}`,
          animation: a.urgente ? 'pulse 2s infinite' : 'none',
        }}>
          <span style={{ fontSize:20, flexShrink:0 }}>{a.emoji}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:a.cor, marginBottom:2, fontFamily:"'Playfair Display',serif" }}>{a.titulo}</div>
            <div style={{ fontSize:11, color:T.textDim, lineHeight:1.5 }}>{a.desc}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Contador Ração ───────────────────────────────────────────────────────────
function ContadorRacao({ racao, minhasLotes, T }) {
  const consumoDiario = minhasLotes.filter(l => l.status === 'ativo')
    .reduce((s, l) => s + ({bezerro:3,garrote:5,boi:8,abatido:0}[l.fase]||0) * l.quantidade, 0)

  if (consumoDiario === 0 || !racao) return null

  const diasLeft = racao.kg_disponivel > 0 ? Math.floor(racao.kg_disponivel / consumoDiario) : 0
  const kgLeft = racao.kg_disponivel || 0
  const cor = diasLeft <= 2 ? '#f87171' : diasLeft <= 5 ? '#c28c46' : '#4ade80'
  const emoji = diasLeft <= 2 ? '🚨' : diasLeft <= 5 ? '⚠' : '🌾'
  const dataFim = diasLeft > 0
    ? new Date(Date.now() + diasLeft * 86400000).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })
    : 'Hoje!'

  return (
    <div style={{
      background:T.card, border:`1px solid ${cor}44`,
      borderLeft:`4px solid ${cor}`, borderRadius:8,
      padding:'16px 20px', marginBottom:16,
      display:'flex', alignItems:'center', gap:20,
      boxShadow:'0 2px 12px rgba(0,0,0,.3)',
    }}>
      <div style={{ fontSize:36, flexShrink:0 }}>{emoji}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:2, marginBottom:4, fontFamily:"'DM Mono',monospace" }}>
          Estoque de Ração
        </div>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontSize:40, fontWeight:800, color:cor, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>
            {diasLeft}
          </span>
          <span style={{ fontSize:15, color:T.textDim }}>dias restantes</span>
        </div>
        <div style={{ fontSize:11, color:T.textMuted, marginTop:4, fontFamily:"'DM Mono',monospace" }}>
          {fmt(kgLeft)} kg · consumo {consumoDiario} kg/dia
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:10, color:T.textMuted, marginBottom:6, fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:1 }}>Acaba em</div>
        <div style={{ fontSize:18, fontWeight:700, color:cor, fontFamily:"'Playfair Display',serif" }}>{dataFim}</div>
        <div style={{ marginTop:10, height:4, width:80, background:T.border, borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:4, background:cor, width:`${Math.min(100, (diasLeft/30)*100)}%`, transition:'width .5s' }}/>
        </div>
      </div>
    </div>
  )
}

// ─── Agenda do Rebanho ────────────────────────────────────────────────────────
function AgendaRebanho({ lotes, T }) {
  const faseNext  = { bezerro:'Garrote', garrote:'Boi', boi:'Abate' }
  const faseCor   = { bezerro:'#7ab0e0', garrote:'#c28c46', boi:'#4ade80' }

  const ativos = lotes
    .filter(l => l.data_fase && l.fase !== 'abatido' && l.status === 'ativo')
    .sort((a, b) => new Date(a.data_fase) - new Date(b.data_fase))

  if (ativos.length === 0) return null

  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:18, marginBottom:16, boxShadow:'0 4px 20px rgba(0,0,0,.4)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
        <span style={{ fontSize:20 }}>📅</span>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:T.text }}>Agenda do Rebanho</div>
          <div style={{ fontSize:11, color:T.textMuted }}>Próximas mudanças de fase — ordenado por data</div>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {ativos.map(l => {
          const now     = Date.now()
          const end     = new Date(l.data_fase).getTime()
          const totalMs = 7 * 24 * 3600 * 1000
          const start   = end - totalMs
          const pct     = Math.max(0, Math.min(100, ((now - start) / totalMs) * 100))
          const diasMs  = end - now
          const dias    = Math.max(0, Math.ceil(diasMs / 86400000))
          const horas   = Math.max(0, Math.ceil(diasMs / 3600000))
          const cor     = faseCor[l.fase] || T.gold
          const urgente = dias === 0

          const label = urgente
            ? (horas <= 1 ? '⚡ AGORA' : `${horas}h`)
            : `${dias}d`

          return (
            <div key={l.id} style={{
              padding:'12px 14px', background:T.inputBg,
              borderRadius:8, border:`1px solid ${urgente ? cor+'66' : T.border}`,
              transition:'border-color .2s',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, color:T.text, fontSize:13, fontFamily:"'DM Mono',monospace" }}>{l.codigo}</span>
                  <span style={{ fontSize:11, color:T.textMuted }}>{l.quantidade} cab.</span>
                  <span style={{
                    fontSize:11, background:`${cor}18`, color:cor,
                    padding:'2px 8px', borderRadius:4, fontWeight:600,
                    border:`1px solid ${cor}44`, fontFamily:"'DM Mono',monospace",
                  }}>
                    {l.fase} → {faseNext[l.fase]}
                  </span>
                </div>
                <span style={{
                  fontSize:15, fontWeight:800,
                  color: urgente ? '#f87171' : dias <= 1 ? '#c28c46' : cor,
                  fontFamily:"'DM Mono',monospace",
                  animation: urgente ? 'pulse 1.2s infinite' : 'none',
                  flexShrink:0,
                }}>{label}</span>
              </div>
              {/* Progress bar — semana de 7 dias */}
              <div style={{ background:T.border, borderRadius:4, height:6, overflow:'hidden', marginBottom:6 }}>
                <div style={{
                  width:`${pct}%`, height:'100%', borderRadius:4,
                  background: dias <= 1
                    ? 'linear-gradient(90deg,#c28c46,#f87171)'
                    : `linear-gradient(90deg,${cor}66,${cor})`,
                  transition:'width 1s ease',
                }}/>
              </div>
              <div style={{ fontSize:10, color:T.textMuted, fontFamily:"'DM Mono',monospace" }}>
                Previsto: {new Date(l.data_fase).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} às {new Date(l.data_fase).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Minha Fazenda Page ───────────────────────────────────────────────────────
export function MinhaFazendaPage({ T, user, api, notify, lotes: lotesProp, mercado, racao }) {
  const [fazendas,   setFazendas]   = useState([])
  const [selectedFaz,setSelectedFaz]= useState(null)
  const [fretes,     setFretes]     = useState([])
  const [custos,     setCustos]     = useState([])
  const [lotesLocal, setLotesLocal] = useState(null) // null = ainda não carregou
  const [novoCusto, setNovoCusto]   = useState({ tipo:'cerca', descricao:'', valor:'', prestador_nome:'' })
  const [loading, setLoading]       = useState(true)

  const loadAll = useCallback(async () => {
    if (!user) return
    const token = localStorage.getItem('gvrpnl_token')
    const h = token ? { Authorization: `Bearer ${token}` } : {}
    const [fRes, frRes, lotesRes] = await Promise.all([
      fetch('/api/fazendas?minha=1', { headers: h }).then(r => r.json()),
      fetch(`/api/frete?jogador_id=${user.id}`, { headers: h }).then(r => r.json()).catch(()=>[]),
      fetch('/api/lotes', { headers: h }).then(r => r.json()).catch(()=>[]),
    ])
    const f = fRes || []
    setFazendas(f)
    setFretes(frRes || [])
    if (Array.isArray(lotesRes)) setLotesLocal(lotesRes)
    if (!selectedFaz) {
      const real = f.find(fz => !String(fz.id).startsWith('pasto_')) || f[0]
      if (real) setSelectedFaz(real)
    }
    setLoading(false)
  }, [user, selectedFaz])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (!selectedFaz) return
    api(`/api/custos?fazenda_id=${selectedFaz.id}`).then(setCustos)
  }, [selectedFaz, api])

  // ── TODOS os lotes ativos do jogador (independente de qual fazenda) ──
  // Prefere lotesLocal (fetch próprio) → fallback para prop do pai
  const minhasLotes = (lotesLocal ?? lotesProp ?? []).filter(l => l.status === 'ativo')

  // Mapa: fazenda_id real → objeto fazenda (exclui pasto_ fakes pois têm IDs fake)
  const fazMap = new Map(
    fazendas
      .filter(f => !String(f.id).startsWith('pasto_'))
      .map(f => [String(f.id), f])
  )

  // Agrupa lotes por fazenda_id → [{fazenda, lotes, cap}]
  const gruposMap = {}
  minhasLotes.forEach(l => {
    const key = String(l.fazenda_id ?? 'sem_fazenda')
    if (!gruposMap[key]) gruposMap[key] = []
    gruposMap[key].push(l)
  })
  const grupos = Object.entries(gruposMap).map(([fazId, gLotes]) => {
    const fazenda = fazMap.get(fazId) || null
    const gcap = fazenda ? calcCapacidade(gLotes, Number(fazenda.tamanho_ha)) : null
    return { fazId, fazenda, lotes: gLotes, cap: gcap }
  }).sort((a, b) => (a.fazenda ? 0 : 1) - (b.fazenda ? 0 : 1))

  // Verifica se alguma fazenda está superlotada (para AlertasPanel e AluguelPastoNPC)
  const algumaSuplertolada = grupos.find(g => g.cap?.lotada) || null

  // Somente fazendas reais (sem pasto_ fake) para o seletor de Serviços
  const realFazendas = fazendas.filter(f => !String(f.id).startsWith('pasto_'))
  const custosPend = custos.filter(c => c.status === 'pendente').length

  async function abrirChamado() {
    if (!selectedFaz || !novoCusto.tipo) return
    const r = await api('/api/custos', { method:'POST', body: JSON.stringify({ ...novoCusto, fazenda_id: selectedFaz.id }) })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    notify('✓ Chamado aberto!')
    api(`/api/custos?fazenda_id=${selectedFaz.id}`).then(setCustos)
    setNovoCusto({ tipo:'cerca', descricao:'', valor:'', prestador_nome:'' })
  }

  async function marcarPago(id) {
    const r = await api('/api/custos', { method:'PATCH', body: JSON.stringify({ id, status:'pago' }) })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    notify('✓ Serviço marcado como pago!')
    api(`/api/custos?fazenda_id=${selectedFaz.id}`).then(setCustos)
  }

  if (!user) return (
    <div style={{ textAlign:'center', padding:60 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🏡</div>
      <div style={{ fontSize:16, color:T.textMuted }}>Faça login para ver sua fazenda.</div>
    </div>
  )

  if (loading) return <div style={{ textAlign:'center', padding:60, color:T.textMuted }}>Carregando...</div>

  if (fazendas.length === 0) return (
    <div style={{ textAlign:'center', padding:60 }}>
      <div style={{ fontSize:64, marginBottom:16 }}>🏡</div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:T.text, marginBottom:10 }}>Você ainda não tem uma fazenda</h2>
      <p style={{ fontSize:14, color:T.textMuted, marginBottom:24, lineHeight:1.8, maxWidth:400, margin:'0 auto 24px' }}>
        Fale com o admin para adquirir uma das propriedades disponíveis em Green Hills ou Lake Ville. Após a compra, ela aparecerá aqui.
      </p>
      <div style={{ fontSize:13, color:T.textMuted }}>Veja as fazendas disponíveis na aba 🏡 Fazendas</div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:28, paddingBottom:16, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
          <span style={{ fontSize:24 }}>🌾</span>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:T.text }}>Minha Fazenda</h1>
        </div>
        <p style={{ fontSize:13, color:T.textMuted, marginLeft:36 }}>Gestão da sua propriedade rural · {minhasLotes.reduce((s,l)=>s+l.quantidade,0)} cabeças no total</p>
      </div>

      {/* Frete em andamento */}
      {fretes.filter(f => f.status === 'em_transito').map(fr => (
        <FreteTracker key={fr.id} frete={fr} T={T} onChegou={() => {
          notify('🐄 Seus bezerros chegaram!', 'success')
          api(`/api/frete`,{method:'PATCH',body:JSON.stringify({id:fr.id})})
          loadAll()
        }}/>
      ))}

      {/* Contador de Ração — todos os lotes */}
      <ContadorRacao racao={racao} minhasLotes={minhasLotes} T={T}/>

      {/* Alertas automáticos — todos os lotes */}
      <AlertasPanel
        minhasLotes={minhasLotes}
        racao={racao}
        cap={algumaSuplertolada?.cap || null}
        custos={custos}
        T={T}
      />

      {/* ═══ REBANHO POR FAZENDA/LOCALIZAÇÃO ═══ */}
      {grupos.map(grupo => {
        const { fazId, fazenda, lotes: gLotes, cap: gCap } = grupo
        const totalCab  = gLotes.reduce((s,l) => s + l.quantidade, 0)
        const consTotal = gLotes.reduce((s,l) => s + ({bezerro:3,garrote:5,boi:8,abatido:0}[l.fase]||0)*l.quantidade, 0)
        const valorEst  = gLotes.reduce((s,l) => s + l.quantidade*(mercado?.precos?.abate||0), 0)
        const nomeFaz   = fazenda?.nome || (fazId === 'sem_fazenda' ? 'Sem fazenda associada' : `Local #${fazId}`)
        const isPasto   = !fazenda

        return (
          <div key={fazId} style={{ marginBottom:16 }}>
            {/* Foto hero (só para fazendas reconhecidas com foto) */}
            {fazenda?.foto_url && (
              <div style={{ height:160, borderRadius:'12px 12px 0 0', overflow:'hidden', position:'relative' }}>
                <img src={fazenda.foto_url} alt={nomeFaz} style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(.6)' }} onError={e=>e.target.style.display='none'}/>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 55%)' }}/>
                <div style={{ position:'absolute', bottom:16, left:20 }}>
                  <div style={{ fontSize:18, fontWeight:800, color:'#fff', fontFamily:"'Playfair Display',serif" }}>{nomeFaz}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.7)' }}>{fazenda.codigo} · {fazenda.regiao} · {fazenda.tamanho_ha} ha</div>
                </div>
                {gCap?.lotada && (
                  <div style={{ position:'absolute', top:14, right:14, background:'rgba(200,50,50,.9)', color:'#fff', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>
                    ⚠ Superlotada
                  </div>
                )}
              </div>
            )}

            <div style={{
              background: T.card, border:`1px solid ${gCap?.lotada ? '#6a1818' : T.border}`,
              borderRadius: fazenda?.foto_url ? '0 0 12px 12px' : 12,
              padding:16,
            }}>
              {/* Cabeçalho de texto (quando não tem foto hero) */}
              {!fazenda?.foto_url && (
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:22 }}>{fazId==='sem_fazenda' ? '⚠️' : isPasto ? '🌿' : '🏡'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700, color: fazId==='sem_fazenda'?'#f87171':T.text, fontFamily:"'Playfair Display',serif" }}>{nomeFaz}</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>
                      {fazenda
                        ? `${fazenda.codigo} · ${fazenda.regiao} · ${fazenda.tamanho_ha} ha`
                        : fazId==='sem_fazenda'
                          ? 'Esses lotes não têm fazenda associada — fale com o admin para corrigir'
                          : 'Gado vinculado a este local'
                      }
                    </div>
                  </div>
                  {gCap?.lotada && (
                    <span style={{ background:'rgba(200,50,50,.2)', border:'1px solid #6a1818', color:'#f87171', fontSize:11, padding:'3px 10px', borderRadius:10, fontWeight:700 }}>⚠ Superlotada</span>
                  )}
                </div>
              )}

              {/* Resumo: cabeças / ração / valor */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom: gCap ? 12 : 0 }}>
                {[
                  { label:'Cabeças',    value: totalCab,           color: T.text },
                  { label:'Ração/dia',  value: `${consTotal}kg`,   color: T.textDim },
                  { label:'Valor Est.', value: `$${fmt(valorEst)}`, color: T.gold },
                ].map(m => (
                  <div key={m.label} style={{ background:T.inputBg, borderRadius:8, padding:'10px 12px', border:`1px solid ${T.border}`, textAlign:'center' }}>
                    <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>{m.label}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:m.color, fontFamily:"'DM Mono',monospace" }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Barra de capacidade */}
              {gCap && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:T.textMuted, marginBottom:4 }}>
                    <span>Capacidade</span>
                    <span style={{ fontWeight:600, color: gCap.lotada ? '#f87171' : T.gold }}>{gCap.usada} / {gCap.total} ha equiv.</span>
                  </div>
                  <div style={{ background:T.border, borderRadius:4, height:7, overflow:'hidden' }}>
                    <div style={{ width:`${gCap.pct}%`, height:'100%', borderRadius:4, background: gCap.lotada ? 'linear-gradient(90deg,#c84040,#f87171)' : 'linear-gradient(90deg,#4060d0,#8040c0)', transition:'width .6s' }}/>
                  </div>
                  {gCap.lotada && (
                    <div style={{ marginTop:8, fontSize:11, color:'#f87171', lineHeight:1.5 }}>
                      ⚠ Superlotada — venda animais ou alugue um pasto extra.
                    </div>
                  )}
                </div>
              )}

              {/* Lista de lotes */}
              {gLotes.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {gLotes.map(l => {
                    const cons = ({bezerro:3,garrote:5,boi:8,abatido:0}[l.fase]||0)*l.quantidade
                    const valorAbate = (mercado?.precos?.abate||0)*l.quantidade
                    return (
                      <div key={l.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 12px', background:T.inputBg, borderRadius:8, border:`1px solid ${T.border}`, flexWrap:'wrap' }}>
                        <div style={{ flex:1 }}>
                          <span style={{ fontWeight:700, color:T.text, fontSize:13, fontFamily:"'DM Mono',monospace" }}>{l.codigo}</span>
                          <span style={{ color:T.textMuted, fontSize:12, marginLeft:8 }}>{l.quantidade} cab. · {l.fase}</span>
                        </div>
                        {cons > 0 && <div style={{ fontSize:12, color:T.textMuted }}>{cons}kg/dia</div>}
                        <div style={{ fontWeight:600, color:T.gold, fontFamily:"'DM Mono',monospace" }}>${fmt(valorAbate)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Agenda do Rebanho — todos os lotes */}
      <AgendaRebanho lotes={minhasLotes} T={T}/>

      {/* Aluguel de pasto NPC — só se alguma fazenda estiver superlotada */}
      {algumaSuplertolada && (
        <AluguelPastoNPC T={T} user={user} api={api} notify={notify} fazenda={algumaSuplertolada.fazenda || selectedFaz}/>
      )}

      {/* ── Serviços / Custos ── */}
      {realFazendas.length > 0 && (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:16 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:T.text, marginBottom:6 }}>Serviços da fazenda</div>
          <p style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>Abra chamados para serviços que precisam ser realizados. Selecione quem vai fazer, acerte os detalhes e marque como pago após o RP.</p>

          {/* Seletor de fazenda (só fazendas reais) */}
          {realFazendas.length > 1 && (
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              {realFazendas.map(f => (
                <button key={f.id} onClick={() => setSelectedFaz(f)} style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${selectedFaz?.id===f.id?'#5030c0':T.border}`, background:selectedFaz?.id===f.id?'rgba(80,48,192,.2)':'transparent', color:selectedFaz?.id===f.id?'#a080ff':T.textMuted, fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:selectedFaz?.id===f.id?600:400 }}>
                  {f.codigo} — {f.nome}
                </button>
              ))}
            </div>
          )}

          {custosPend > 0 && (
            <div style={{ marginBottom:12, padding:'8px 14px', background:'rgba(200,50,50,.1)', border:'1px solid #6a1818', borderRadius:8, fontSize:12, color:'#f87171' }}>
              ⚠ {custosPend} serviço(s) pendente(s) em {selectedFaz?.nome}
            </div>
          )}

          {/* Novo chamado */}
          <div style={{ background:T.inputBg, borderRadius:12, padding:16, marginBottom:16, border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:12, fontWeight:600, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:12 }}>
              Novo chamado · {selectedFaz?.nome}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.6px' }}>Tipo</label>
                <select value={novoCusto.tipo} onChange={e=>setNovoCusto(c=>({...c,tipo:e.target.value}))} style={{ width:'100%', background:T.card, border:`1px solid ${T.border2||T.border}`, borderRadius:8, padding:'9px 10px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none' }}>
                  {TIPOS_CUSTO.map(t => <option key={t.tipo} value={t.tipo}>{t.emoji} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.6px' }}>Quem vai fazer</label>
                <input value={novoCusto.prestador_nome} onChange={e=>setNovoCusto(c=>({...c,prestador_nome:e.target.value}))} placeholder="NomeJogador" style={{ width:'100%', background:T.card, border:`1px solid ${T.border2||T.border}`, borderRadius:8, padding:'9px 10px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.6px' }}>Valor combinado ($)</label>
                <input type="number" value={novoCusto.valor} onChange={e=>setNovoCusto(c=>({...c,valor:e.target.value}))} placeholder="500" style={{ width:'100%', background:T.card, border:`1px solid ${T.border2||T.border}`, borderRadius:8, padding:'9px 10px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none' }}/>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.6px' }}>Descrição</label>
              <input value={novoCusto.descricao} onChange={e=>setNovoCusto(c=>({...c,descricao:e.target.value}))} placeholder="Ex: Reforma da cerca do pasto norte..." style={{ width:'100%', background:T.card, border:`1px solid ${T.border2||T.border}`, borderRadius:8, padding:'9px 10px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none' }}/>
            </div>
            <button onClick={abrirChamado} style={{ padding:'9px 18px', background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Abrir chamado
            </button>
          </div>

          {/* Lista de chamados */}
          {custos.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:T.textMuted, fontSize:13 }}>Nenhum chamado aberto</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {custos.map(c => {
                const tipo = TIPOS_CUSTO.find(t => t.tipo === c.tipo)
                return (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:T.inputBg, borderRadius:10, border:`1px solid ${c.status==='pago'?T.border:'#3020a0'}`, flexWrap:'wrap' }}>
                    <span style={{ fontSize:20 }}>{tipo?.emoji || '🔧'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{tipo?.label || c.tipo}</div>
                      {c.descricao && <div style={{ fontSize:11, color:T.textMuted }}>{c.descricao}</div>}
                      {c.prestador_nome && <div style={{ fontSize:11, color:'#a080ff' }}>👤 {c.prestador_nome}</div>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:700, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(c.valor)}</div>
                      <div style={{ fontSize:10, color:T.textMuted }}>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</div>
                    </div>
                    {c.status === 'pendente' ? (
                      <button onClick={() => marcarPago(c.id)} style={{ padding:'6px 12px', background:'rgba(80,48,192,.2)', border:'1px solid #3020a0', color:'#a080ff', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                        ✓ Marcar pago
                      </button>
                    ) : (
                      <span style={{ background:'rgba(10,42,26,.8)', border:'1px solid #1a6a4a', color:'#4ad4a0', fontSize:10, padding:'4px 10px', borderRadius:10, fontWeight:600 }}>✓ Pago</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Celeiro Page ─────────────────────────────────────────────────────────────
export function CeleiroPage({ T, user, api, notify, mercado, sounds }) {
  const [dados, setDados] = useState(null)
  const [kgSolicitado, setKgSolicitado] = useState('')
  const [comprovante, setComprovante] = useState('')
  const [step, setStep] = useState(1) // 1=cotação, 2=comprovante, 3=enviado

  const load = useCallback(async () => {
    if (!user) return
    const r = await api('/api/celeiro')
    setDados(r)
    if (r?.necessidade?.kgFaltando > 0) {
      setKgSolicitado(String(Math.ceil(r.necessidade.kgFaltando)))
    }
  }, [user, api])

  useEffect(() => { load() }, [load])

  const precoRacao = mercado?.precos?.precoRacao || 2
  const kgNum = parseFloat(kgSolicitado) || 0
  const valorRacao = Math.round(kgNum * precoRacao * 100) / 100
  const valorFrete = Math.round(kgNum * 0.5 * 100) / 100
  const valorTotal = valorRacao + valorFrete

  async function enviarPedido() {
    if (!comprovante) return notify('Cole o link do comprovante!', 'danger')
    const r = await api('/api/celeiro', {
      method: 'POST',
      body: JSON.stringify({ kg_solicitado: kgNum, comprovante, valor_total: valorTotal })
    })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    sounds?.coin()
    setStep(3)
    load()
  }

  if (!user) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏚</div>
      <div style={{ fontSize: 16, color: T.textMuted }}>Faça login para acessar o Celeiro.</div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 28, paddingBottom: 16, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 24 }}>🏚</span>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: T.text }}>Celeiro</h1>
        </div>
        <p style={{ fontSize: 13, color: T.textMuted, marginLeft: 36 }}>
          Compre ração para as fases Garrote e Boi — obrigatório para avançar o rebanho
        </p>
      </div>

      {/* Indicador de necessidade */}
      {dados?.necessidade && (
        <div style={{ background: dados.necessidade.kgFaltando > 0 ? 'rgba(42,16,0,.8)' : 'rgba(10,42,10,.6)', border: `1px solid ${dados.necessidade.kgFaltando > 0 ? '#8a4010' : T.greenDark || '#2a5a12'}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: "'Playfair Display',serif" }}>
              {dados.necessidade.kgFaltando > 0 ? '⚠ Ração insuficiente para completar o ciclo' : '✓ Estoque suficiente'}
            </div>
            <span style={{ background: dados.necessidade.kgFaltando > 0 ? 'rgba(200,80,20,.2)' : 'rgba(20,80,20,.2)', border: `1px solid ${dados.necessidade.kgFaltando > 0 ? '#8a4010' : '#2a5a12'}`, color: dados.necessidade.kgFaltando > 0 ? '#e09030' : '#4ad4a0', fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 600 }}>
              {dados.necessidade.kgDisponivel}kg em estoque
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'Necessário ciclo', value: `${dados.necessidade.kgNecessario}kg`, color: T.text },
              { label: 'Em estoque', value: `${dados.necessidade.kgDisponivel}kg`, color: '#4ad4a0' },
              { label: 'Falta comprar', value: `${dados.necessidade.kgFaltando}kg`, color: dados.necessidade.kgFaltando > 0 ? '#e09030' : '#4ad4a0' },
            ].map(m => (
              <div key={m.label} style={{ background: T.inputBg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${T.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.6px' }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: "'Playfair Display',serif" }}>{m.value}</div>
              </div>
            ))}
          </div>
          {dados.necessidade.detalhes?.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: T.textMuted, lineHeight: 1.8 }}>
              {dados.necessidade.detalhes.map((d, i) => (
                <span key={i} style={{ marginRight: 16 }}>
                  {d.fase === 'garrote' ? '🐄 Garrote' : '🐄 Boi'}: {d.kg}kg
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>

        {/* Solicitar ração */}
        {step === 3 ? (
          <div style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 14, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌾</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: '#4ad4a0', fontWeight: 700, marginBottom: 8 }}>Pedido enviado!</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20, lineHeight: 1.7 }}>O admin irá confirmar e a ração será creditada no seu estoque.</div>
            <button onClick={() => { setStep(1); setComprovante('') }} style={{ padding: '9px 20px', background: `linear-gradient(135deg,${T.goldDark||'#8a5e10'},${T.gold||'#c8922a'})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Novo pedido
            </button>
          </div>
        ) : (
          <div style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>
              {step === 1 ? '1. Quantidade' : '2. Comprovante'}
            </div>

            {step === 1 && (
              <>
                <div style={{ background: T.inputBg, borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid ${T.border}`, fontSize: 12, color: T.textMuted, lineHeight: 1.7 }}>
                  💡 A ração da compra de bezerros cobre só a fase 1. Compre aqui para as fases Garrote (35kg/cab) e Boi (56kg/cab).
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 6 }}>Quantidade (kg)</label>
                  <input
                    type="number"
                    value={kgSolicitado}
                    onChange={e => setKgSolicitado(e.target.value)}
                    style={{ width: '100%', background: T.inputBg, border: `1px solid ${T.border2}`, borderRadius: 10, padding: '10px 14px', fontSize: 20, color: T.text, fontFamily: "'Playfair Display',serif", fontWeight: 700, outline: 'none', textAlign: 'center' }}
                  />
                </div>
                {kgNum > 0 && (
                  <div style={{ background: T.inputBg, borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: T.textDim }}>
                      <span>Ração: {kgNum}kg × ${precoRacao}/kg</span>
                      <span>${fmt(Math.round(kgNum * precoRacao * 100)/100)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: T.textDim }}>
                      <span>Frete: {kgNum}kg × $0,50/kg</span>
                      <span>${fmt(Math.round(kgNum * 0.5 * 100)/100)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, fontFamily: "'Playfair Display',serif", borderTop:`1px solid ${T.border}`, paddingTop: 10 }}>
                      <span style={{ color: T.text }}>Total</span>
                      <span style={{ color: T.gold || '#c8922a' }}>${fmt(Math.round((kgNum * precoRacao + kgNum * 0.5) * 100)/100)}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setStep(2)}
                  disabled={!kgNum || kgNum <= 0}
                  style={{ width: '100%', padding: 12, background: kgNum > 0 ? `linear-gradient(135deg,${T.goldDark||'#8a5e10'},${T.gold||'#c8922a'})` : T.border, color: kgNum > 0 ? '#fff' : T.textMuted, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: kgNum > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                >
                  Pagar ${fmt(valorTotal)} no servidor →
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div style={{ background: T.inputBg, borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>
                    <span style={{ color: T.text }}>Total pago</span>
                    <span style={{ color: T.gold || '#c8922a' }}>${fmt(valorTotal)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>{kgNum}kg · ${precoRacao}/kg</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 6 }}>Link do comprovante (Discord)</label>
                  <input
                    value={comprovante}
                    onChange={e => setComprovante(e.target.value)}
                    placeholder="https://discord.com/channels/..."
                    style={{ width: '100%', background: T.inputBg, border: `1px solid ${T.border2}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: T.text, fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(1)} style={{ flex: 1, padding: 10, background: 'transparent', border: `1px solid ${T.border2}`, color: T.textDim, borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Voltar</button>
                  <button onClick={enviarPedido} style={{ flex: 2, padding: 10, background: `linear-gradient(135deg,${T.goldDark||'#8a5e10'},${T.gold||'#c8922a'})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Enviar pedido</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Meus pedidos */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 14 }}>Meus pedidos</div>
          {!dados?.pedidos?.length ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: T.textMuted, fontSize: 13 }}>Nenhum pedido ainda</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dados.pedidos.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: T.inputBg, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{p.kg_solicitado}kg</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>${fmt(p.valor_total)} · ${p.preco_kg}/kg</div>
                  </div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>{new Date(p.criado_em).toLocaleDateString('pt-BR')}</div>
                  <span style={{
                    background: p.status === 'entregue' ? 'rgba(10,42,10,.8)' : p.status === 'recusado' ? 'rgba(42,10,10,.8)' : 'rgba(42,24,0,.8)',
                    border: `1px solid ${p.status === 'entregue' ? '#2a5a12' : p.status === 'recusado' ? '#6a1818' : '#6a4010'}`,
                    color: p.status === 'entregue' ? '#4ad4a0' : p.status === 'recusado' ? '#e06060' : '#e09030',
                    fontSize: 10, padding: '3px 8px', borderRadius: 10, fontWeight: 600, whiteSpace: 'nowrap'
                  }}>
                    {p.status === 'entregue' ? '✓ Entregue' : p.status === 'recusado' ? '✗ Recusado' : '⏳ Pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fretes de ração em andamento — produtor vê aqui */}
      <FreteRacaoSection T={T} user={user} api={api} notify={notify} sounds={sounds}/>

      {/* Admin — pedidos pendentes */}
      {user?.role === 'admin' && dados?.pedidos?.filter(p => p.status === 'pendente').length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginTop: 16 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 14 }}>
            Pedidos pendentes — Admin
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dados.pedidos.filter(p => p.status === 'pendente').map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: T.inputBg, borderRadius: 10, border: `1px solid ${T.border2}`, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{p.jogador_nome}</div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>{p.kg_solicitado}kg · ${fmt(p.valor_total)} · ${p.preco_kg}/kg</div>
                  {p.comprovante && <a href={p.comprovante} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#4a90d0' }}>Ver comprovante →</a>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={async () => {
                    await api('/api/celeiro', { method: 'PATCH', body: JSON.stringify({ id: p.id, status: 'entregue' }) })
                    notify('✓ Ração entregue!')
                    load()
                  }} style={{ padding: '6px 14px', background: `linear-gradient(135deg,${T.greenDark||'#2a5a12'},${T.green||'#4a8a20'})`, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✓ Confirmar entrega
                  </button>
                  <button onClick={async () => {
                    await api('/api/celeiro', { method: 'PATCH', body: JSON.stringify({ id: p.id, status: 'recusado' }) })
                    notify('Pedido recusado.')
                    load()
                  }} style={{ padding: '6px 10px', background: '#3a0808', color: '#e06060', border: '1px solid #6a1818', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Frete Tracker 2-step ─────────────────────────────────────────────────────
export function FreteTracker2({ frete, T, onUpdate }) {
  const [fase, setFase] = useState('buscar') // buscar | fazenda | entregue
  const [segundos, setSegundos] = useState(0)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    if (!frete) return
    const update = () => {
      const agora = Date.now()
      const buscaEm = frete.busca_em ? new Date(frete.busca_em).getTime() : agora + 30*60*1000
      const chegaEm = new Date(frete.chega_em).getTime()
      const total = chegaEm - (buscaEm - 30*60*1000)

      if (agora < buscaEm) {
        // Fase 1: indo buscar
        setFase('buscar')
        const diff = Math.max(0, Math.ceil((buscaEm - agora) / 1000))
        setSegundos(diff)
        const elapsed = agora - (buscaEm - 30*60*1000)
        setPct(Math.min(50, (elapsed / total) * 100))
      } else if (agora < chegaEm) {
        // Fase 2: gado a caminho
        setFase('fazenda')
        const diff = Math.max(0, Math.ceil((chegaEm - agora) / 1000))
        setSegundos(diff)
        const elapsed = agora - buscaEm
        setPct(50 + Math.min(50, (elapsed / (30*60*1000)) * 50))
      } else {
        setFase('entregue')
        setPct(100)
      }
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [frete, onUpdate])

  if (!frete) return null

  const mins = Math.floor(segundos / 60)
  const secs = segundos % 60
  const entregue = fase === 'entregue'

  const fases = [
    { id:'buscar', label:'🚛 Indo buscar', done: fase !== 'buscar' || entregue },
    { id:'fazenda', label:'🐄 Gado a caminho', done: entregue },
    { id:'entregue', label:'✅ Entregue', done: entregue },
  ]

  return (
    <div style={{background:'#0a0818',border:'1px solid #3020a0',borderRadius:14,padding:18,marginBottom:16,overflow:'hidden',position:'relative'}}>
      <div style={{position:'absolute',top:0,left:0,height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,rgba(64,96,208,.12),rgba(128,64,192,.08))',transition:'width 1s linear'}}/>
      <div style={{position:'relative'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:entregue?'#4ad4a0':'#a080ff'}}>
              {entregue ? '✓ Bezerros chegaram!' : fase === 'buscar' ? '🚛 Caminhão indo buscar o gado...' : '🐄 Gado a caminho da fazenda!'}
            </div>
            <div style={{fontSize:11,color:'#7060a0',marginTop:2}}>Transporte Gov. NPC</div>
          </div>
          {!entregue && (
            <div style={{fontSize:24,fontWeight:800,color:'#a080ff',fontFamily:"'Playfair Display',serif"}}>
              {mins}:{String(secs).padStart(2,'0')}
            </div>
          )}
        </div>

        {/* Steps */}
        <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:12}}>
          {fases.map((f, i) => (
            <div key={f.id} style={{display:'flex',alignItems:'center',flex:i<fases.length-1?1:'auto'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,background:f.done||f.id===fase?'rgba(80,48,192,.4)':'rgba(255,255,255,.05)',border:`2px solid ${f.done||f.id===fase?'#8060d0':'#2a1a50'}`,transition:'all .3s'}}>
                  {f.done ? '✓' : f.id === fase ? '●' : '○'}
                </div>
                <div style={{fontSize:10,color:f.done||f.id===fase?'#a080ff':'#4a3060',whiteSpace:'nowrap',fontWeight:f.id===fase?600:400}}>{f.label}</div>
              </div>
              {i < fases.length-1 && (
                <div style={{flex:1,height:2,background:f.done?'#6040c0':'rgba(255,255,255,.05)',margin:'0 8px',marginBottom:20,transition:'background .5s'}}/>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{background:'rgba(255,255,255,.05)',borderRadius:6,height:6,overflow:'hidden'}}>
          <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,#4060d0,#8040c0)',borderRadius:6,transition:'width 1s linear'}}/>
        </div>
      </div>
    </div>
  )
}

// ─── Transportadora Page ──────────────────────────────────────────────────────
export function TransportadoraPage({ T, user, api, notify, sounds }) {
  const [fretes, setFretes] = useState([])
  const [meusFretes, setMeusFretes] = useState([])
  const [caminhoes, setCaminhoes] = useState([])
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('disponivel') // disponivel | garagem | historico
  const [aceitando, setAceitando] = useState(null)
  const [caminhaoSel, setCaminhaoSel] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    const [f, mf, c, s] = await Promise.all([
      api('/api/transportadora?tipo=disponiveis'),
      api('/api/transportadora?tipo=meus'),
      api('/api/transportadora?tipo=caminhoes'),
      api('/api/transportadora?tipo=stats'),
    ])
    setFretes(Array.isArray(f) ? f : [])
    setMeusFretes(Array.isArray(mf) ? mf : [])
    setCaminhoes(Array.isArray(c) ? c : [])
    setStats(s)
  }, [user, api])

  useEffect(() => { load() }, [load])

  // Poll fretes disponíveis a cada 10s
  useEffect(() => {
    if (!user) return
    const iv = setInterval(() => { if(!document.hidden) api('/api/transportadora?tipo=disponiveis').then(f => setFretes(Array.isArray(f)?f:[])) }, 15000)
    return () => clearInterval(iv)
  }, [user, api])

  async function aceitarFrete() {
    if (!caminhaoSel) return notify('Selecione um caminhão!', 'danger')
    const r = await api('/api/transportadora', {
      method: 'POST',
      body: JSON.stringify({
        frete_id: aceitando.id,
        caminhao_id: parseInt(caminhaoSel),
        blocos_ids: aceitando.blocos_ids || [aceitando.id]
      })
    })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    sounds?.success()
    notify('✓ Frete aceito! Caminhão em rota.')
    setAceitando(null)
    load()
  }

  const caminhoesLivres = caminhoes.filter(c => c.status === 'disponivel')
  const emRota = meusFretes.filter(f => ['em_rota_buscar','em_rota_fazenda'].includes(f.status))
  const pendPagamento = meusFretes.filter(f => f.status === 'entregue' && !f.pago)

  return (
    <div>
      <div style={{ marginBottom:28, paddingBottom:16, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
            <span style={{ fontSize:24 }}>🚛</span>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:T.text }}>Transportadora</h1>
          </div>
          <p style={{ fontSize:13, color:T.textMuted, marginLeft:36 }}>Aceite fretes, gerencie sua frota e receba por cada entrega</p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={async()=>{if(!confirm('Resetar toda a transportadora? Fretes serão apagados e caminhões liberados.')) return; const r=await api('/api/transportadora',{method:'DELETE'}); if(r.ok){notify('✓ Transportadora resetada!');load()}}} style={{ padding:'7px 14px', background:'#3a0808', color:'#e06060', border:'1px solid #6a1818', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            🗑 Resetar transportadora
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
          {[
            { label:'Total fretes', value:stats.total_fretes, icon:'📦', color:T.text },
            { label:'Total ganho', value:`$${fmt(stats.total_ganho)}`, icon:'💰', color:T.gold||'#c8922a' },
            { label:'Aguard. pagamento', value:pendPagamento.length, icon:'⏳', color:pendPagamento.length>0?'#e09030':T.text },
            { label:'Caminhões livres', value:caminhoesLivres.length, icon:'🚛', color:caminhoesLivres.length>0?'#4ad4a0':'#e06060' },
          ].map(m => (
            <div key={m.label} style={{ background:T.inputBg, borderRadius:12, padding:'14px 16px', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, color:T.textMuted, marginBottom:6, textTransform:'uppercase', letterSpacing:'1px', fontWeight:600 }}>{m.icon} {m.label}</div>
              <div style={{ fontSize:20, fontWeight:700, color:m.color, fontFamily:"'Playfair Display',serif" }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Fretes de ração aguardando ação do transportador */}
      {meusFretes.filter(f=>f.tipo_carga==='racao'&&['liberado','retirado'].includes(f.status)).map(f=>(
        <FreteRacaoCard key={f.id} frete={f} T={T} user={user} api={api} notify={notify} sounds={sounds} onReload={load}/>
      ))}

      {/* Fretes em andamento */}
      {emRota.length > 0 && (
        <div style={{ marginBottom:16 }}>
          {emRota.map(f => (
            <div key={f.id} style={{ background:'#0a0818', border:'1px solid #3020a0', borderRadius:14, padding:18, marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#a080ff' }}>{f.lote_codigo} — {f.quantidade} cab.</div>
                  <div style={{ fontSize:11, color:'#7060a0' }}>{f.origem} → {f.destino}</div>
                </div>
                <div style={{ fontSize:18, fontWeight:800, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(f.valor)}</div>
              </div>
              <FreteEmAndamento frete={f} T={T} api={api} onEntregue={() => { sounds?.coin(); load() }}/>
            </div>
          ))}
        </div>
      )}

      {/* Pendentes de pagamento */}
      {pendPagamento.length > 0 && (
        <div style={{ background:'rgba(42,24,0,.6)', border:'1px solid #8a4010', borderRadius:14, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#e09030', marginBottom:10 }}>⏳ Aguardando pagamento do admin</div>
          {pendPagamento.map(f => (
            <div key={f.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:`1px solid rgba(255,255,255,.05)` }}>
              <span style={{ color:T.textDim }}>{f.lote_codigo} · {f.quantidade} cab.</span>
              <span style={{ color:'#e09030', fontWeight:700, fontFamily:"'Playfair Display',serif" }}>${fmt(f.valor)}</span>
            </div>
          ))}
          <div style={{ fontSize:11, color:T.textMuted, marginTop:8 }}>Total pendente: <strong style={{color:'#e09030'}}>${fmt(pendPagamento.reduce((s,f)=>s+Number(f.valor),0))}</strong></div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {([['disponivel','🚛 Fretes disponíveis'],['garagem','🏚 Minha garagem'],['historico','📋 Histórico'],...(user?.role==='admin'?[['admin','⚙️ Admin']]:[])]).map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${tab===v?'#5030c0':T.border}`, background:tab===v?'rgba(80,48,192,.2)':'transparent', color:tab===v?'#a080ff':T.textMuted, fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:tab===v?600:400, transition:'all .15s', position:'relative' }}>
            {l}
            {v==='disponivel'&&fretes.length>0&&<span style={{ position:'absolute', top:-5, right:-5, background:'#e06060', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{fretes.length}</span>}
          </button>
        ))}
      </div>

      {/* Fretes disponíveis */}
      {tab === 'disponivel' && (
        <>
          {fretes.length === 0 ? (
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:48, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🚛</div>
              <div style={{ fontSize:16, color:T.textMuted }}>Nenhum frete disponível no momento</div>
              <div style={{ fontSize:12, color:T.textMuted, marginTop:6 }}>Quando alguém comprar gado você será notificado!</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <FretesBlocos fretes={fretes} T={T} caminhoesLivres={caminhoesLivres} onAceitar={(blocos,cam)=>{setAceitando({...blocos[0],blocos_ids:blocos.map(b=>b.id),totalQtd:blocos.reduce((s,b)=>s+b.quantidade,0),totalValor:blocos.reduce((s,b)=>s+Number(b.valor),0),numBlocos:blocos.length});setCaminhaoSel(cam?.id?.toString()||'')}}/>
            </div>
          )}
        </>
      )}

      {/* Garagem */}
      {tab === 'garagem' && (
        <>
          {caminhoes.length === 0 ? (
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:48, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🏚</div>
              <div style={{ fontSize:16, color:T.textMuted }}>Garagem vazia</div>
              <div style={{ fontSize:12, color:T.textMuted, marginTop:6 }}>Compre um caminhão na Concessionária!</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
              {caminhoes.map(c => (
                <CaminhaoCard key={c.id} caminhao={c} T={T} api={api} notify={notify} onReload={load}/>
              ))}
            </div>
          )}
        </>
      )}

      {/* Histórico */}
      {tab === 'historico' && (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:18 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:T.text, marginBottom:14 }}>Histórico de fretes</div>
          {meusFretes.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:T.textMuted, fontSize:13 }}>Nenhum frete realizado ainda</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {meusFretes.map((f,i) => (
                <div key={f.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:i<meusFretes.length-1?`1px solid ${T.border}`:'none', flexWrap:'wrap' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{f.lote_codigo} · {f.quantidade} cab.</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>{f.origem} → {f.destino}</div>
                    <div style={{ fontSize:10, color:T.textMuted }}>{new Date(f.criado_em).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div style={{ fontWeight:700, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(f.valor)}</div>
                  <span style={{ background:f.pago?'rgba(10,42,10,.8)':f.status==='entregue'?'rgba(42,24,0,.8)':'rgba(10,8,24,.8)', border:`1px solid ${f.pago?'#2a5a12':f.status==='entregue'?'#8a4010':'#3020a0'}`, color:f.pago?'#4ad4a0':f.status==='entregue'?'#e09030':'#a080ff', fontSize:10, padding:'3px 8px', borderRadius:10, fontWeight:600 }}>
                    {f.pago?'✓ Pago':f.status==='entregue'?'⏳ Aguard. pgto':f.status==='em_rota_buscar'?'🚛 Buscando':'🐄 Entregando'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Panel */}
      {tab === 'admin' && user?.role === 'admin' && <AdminTransportadoraPanel T={T} api={api} notify={notify} sounds={sounds} onReload={load}/>}

      {/* Modal aceitar frete */}
      {aceitando && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
          <div style={{ background:T.card, border:'1px solid #3020a0', borderRadius:20, padding:32, width:'100%', maxWidth:400, boxShadow:'0 30px 80px rgba(0,0,0,.5)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:T.text }}>Aceitar Frete</h3>
              <button onClick={() => setAceitando(null)} style={{ background:'none', border:'none', color:T.textMuted, fontSize:22, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ background:T.inputBg, borderRadius:12, padding:16, marginBottom:16, border:`1px solid ${T.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:8 }}>
                <span style={{ color:T.textMuted }}>Carga</span>
                <span style={{ fontWeight:700, color:T.text }}>{aceitando.totalQtd||aceitando.quantidade} {aceitando.tipo_carga==='racao'?'kg de ração':'bezerros'} {aceitando.numBlocos>1&&<span style={{fontSize:11,color:'#a080ff'}}>({aceitando.numBlocos} blocos)</span>}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:8 }}>
                <span style={{ color:T.textMuted }}>Rota</span>
                <span style={{ color:T.textDim, fontSize:12 }}>{aceitando.origem} → {aceitando.destino}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:8 }}>
                <span style={{ color:T.textMuted }}>Duração</span>
                <span style={{ color:T.textDim }}>{aceitando.numBlocos > 1 ? `1h${(aceitando.numBlocos-1)*15}min` : '1h'} total</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:18, fontWeight:800, fontFamily:"'Playfair Display',serif", paddingTop:8, borderTop:`1px solid ${T.border}` }}>
                <span style={{ color:T.text }}>Ganho</span>
                <span style={{ color:'#a080ff' }}>${fmt(aceitando.totalValor||aceitando.valor)}</span>
              </div>
            </div>
            {caminhoesLivres.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:8 }}>Selecionar caminhão</label>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {caminhoesLivres.map(c => {
                    const insuf = c.capacidade < aceitando.quantidade
                    const caminhoeNec = Math.ceil(aceitando.quantidade / c.capacidade)
                    return (
                      <button key={c.id} onClick={() => !insuf && setCaminhaoSel(c.id.toString())} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:insuf?'rgba(42,10,10,.3)':caminhaoSel===c.id.toString()?'rgba(80,48,192,.2)':T.inputBg, border:`1px solid ${insuf?'#6a1818':caminhaoSel===c.id.toString()?'#5030c0':T.border}`, borderRadius:10, cursor:insuf?'not-allowed':'pointer', fontFamily:'inherit', transition:'all .15s', textAlign:'left', opacity:insuf?.6:1 }}>
                        <span style={{ fontSize:20 }}>🚛</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:insuf?'#e06060':T.text }}>{c.modelo}</div>
                          <div style={{ fontSize:11, color:T.textMuted }}>Placa {c.placa} · {c.capacidade} cab. máx</div>
                          {insuf && <div style={{ fontSize:10, color:'#e06060', marginTop:2 }}>⚠ Insuficiente — precisaria de {caminhoeNec} caminhões deste modelo</div>}
                        </div>
                        {!insuf && caminhaoSel===c.id.toString()&&<span style={{ marginLeft:'auto', color:'#a080ff', fontSize:16 }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setAceitando(null)} style={{ flex:1, padding:10, background:'transparent', border:`1px solid ${T.border2}`, color:T.textDim, borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
              <button onClick={aceitarFrete} style={{ flex:2, padding:10, background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>🚛 Aceitar — ${fmt(aceitando.valor)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Frete em andamento (mini tracker) ───────────────────────────────────────
function FreteEmAndamento({ frete, T, onEntregue, api }) {
  const [fase, setFase] = useState('buscar')
  const [segundos, setSegundos] = useState(0)
  const [pct, setPct] = useState(0)
  const [liberando, setLiberando] = useState(false)

  useEffect(() => {
    if (!frete) return
    const update = () => {
      const agora = Date.now()
      const chegaEm = new Date(frete.entrega_em || frete.chegada_fazenda_em || frete.chega_em).getTime()
      const inicio = chegaEm - 60*60*1000
      const meio = inicio + 30*60*1000

      if (agora < meio) {
        setFase('buscar')
        setPct(Math.min(50, ((agora-inicio)/(30*60*1000))*50))
        setSegundos(Math.max(0, Math.ceil((meio-agora)/1000)))
      } else if (agora < chegaEm) {
        setFase('fazenda')
        setPct(50 + Math.min(50, ((agora-meio)/(30*60*1000))*50))
        setSegundos(Math.max(0, Math.ceil((chegaEm-agora)/1000)))
      } else {
        setFase('entregue')
        setPct(100)
        setSegundos(0)
      }
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [frete])

  async function liberar() {
    setLiberando(true)
    await api('/api/transportadora', { method:'PATCH', body: JSON.stringify({ id: frete.id, status:'entregue' }) })
    onEntregue && onEntregue()
    setLiberando(false)
  }

  const mins = Math.floor(segundos/60)
  const secs = segundos%60
  const zerou = fase === 'entregue'

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12, color:'#7060a0', marginBottom:6 }}>
        <span>{zerou ? '✅ Entregue — libere o caminhão' : fase==='buscar'?'🚛 Indo buscar o gado...':'🐄 Gado indo para fazenda...'}</span>
        {zerou ? (
          <button onClick={liberar} disabled={liberando} style={{ padding:'4px 12px', background:'linear-gradient(135deg,#1a4a10,#2a7a18)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {liberando ? '...' : '✓ Liberar caminhão'}
          </button>
        ) : (
          <span style={{ color:'#a080ff', fontWeight:600 }}>{mins}:{String(secs).padStart(2,'0')}</span>
        )}
      </div>
      <div style={{ background:'rgba(255,255,255,.05)', borderRadius:4, height:6, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background: zerou?'linear-gradient(90deg,#2a7a18,#4ad4a0)':'linear-gradient(90deg,#4060d0,#8040c0)', borderRadius:4, transition:'width 1s linear' }}/>
      </div>
    </div>
  )
}

// ─── Concessionaria Page ──────────────────────────────────────────────────────
const CONCE_TABS = [
  { v:'caminhoes',      l:'🚛 Caminhões',      fn: m => !m.tipo?.startsWith('lavoura_') },
  { v:'tratores',       l:'🚜 Tratores',       fn: m => m.tipo === 'lavoura_trator' },
  { v:'implementos',    l:'🌱 Implementos',    fn: m => m.tipo === 'lavoura_plantadeira' },
  { v:'colheitadeiras', l:'⚙️ Colheitadeiras', fn: m => m.tipo === 'lavoura_colheitadeira' },
  { v:'alugar',         l:'🤝 Alugar',         fn: null },
]
const CAP_ALUG = { trator:'🚜', plantadeira:'🌱', colheitadeira:'⚙️' }
const TIPO_LABEL = { trator:'Trator', plantadeira:'Plantadeira', colheitadeira:'Colheitadeira' }

export function ConcessionariaPage({ T, user, api, notify, sounds }) {
  const [modelos,    setModelos]   = useState([])
  const [pedidos,    setPedidos]   = useState([])
  const [alugPend,   setAlugPend]  = useState([]) // admin: alugueis pendentes
  const [dispAlug,   setDispAlug]  = useState([]) // tab alugar: máquinas disponíveis
  const [comprovante,setComprovante]=useState('')
  const [modeloSel,  setModeloSel] = useState(null)
  const [step,       setStep]      = useState(1)   // 1=catálogo 2=form 3=ok
  const [qty,        setQty]       = useState(1)
  const [tabCat,     setTabCat]    = useState('caminhoes')
  // aba alugar
  const [maqSel,     setMaqSel]    = useState(null) // máquina selecionada p/ alugar
  const [diasAlug,   setDiasAlug]  = useState(3)
  const [compAlug,   setCompAlug]  = useState('')
  const [stepAlug,   setStepAlug]  = useState(1)   // 1=lista 2=form 3=ok

  const load = useCallback(async () => {
    const m = await fetch('/api/concessionaria').then(r=>r.json())
    setModelos(Array.isArray(m)?m:[])
    if (user?.role === 'admin') {
      const [p, a] = await Promise.all([
        api('/api/concessionaria?tipo=pedidos'),
        api('/api/lavoura/alugueis?tipo=pendentes'),
      ])
      setPedidos(Array.isArray(p)?p:[])
      setAlugPend(Array.isArray(a)?a:[])
    }
  }, [user, api])

  const loadDisponiveis = useCallback(async () => {
    const d = await api('/api/lavoura/alugueis?tipo=disponiveis')
    setDispAlug(Array.isArray(d)?d:[])
  }, [api])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (tabCat==='alugar') loadDisponiveis() }, [tabCat, loadDisponiveis])

  async function comprarModelo() {
    if (!comprovante) return notify('Cole o comprovante!', 'danger')
    const r = await api('/api/concessionaria', {
      method: 'POST',
      body: JSON.stringify({ modelo_id: modeloSel.id, comprovante, quantidade: qty })
    })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    sounds?.coin(); setStep(3); load()
  }

  async function solicitarAluguel() {
    if (!compAlug) return notify('Cole o comprovante!', 'danger')
    const r = await api('/api/lavoura/alugueis', {
      method: 'POST',
      body: JSON.stringify({ maquina_id: maqSel.id, dias: diasAlug, comprovante: compAlug })
    })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    sounds?.coin(); setStepAlug(3)
  }

  const pedidosPend = pedidos.filter(p => p.status === 'pendente')
  const totalPend   = pedidosPend.length + alugPend.length
  const tabInfo     = CONCE_TABS.find(t => t.v === tabCat) || CONCE_TABS[0]
  const modelosFiltrados = tabInfo.fn ? modelos.filter(tabInfo.fn) : []
  const isLavoura   = modeloSel?.tipo?.startsWith('lavoura_')
  const tipoEmoji   = isLavoura
    ? { lavoura_trator:'🚜', lavoura_plantadeira:'🌱', lavoura_colheitadeira:'⚙️' }[modeloSel?.tipo] || '🚜'
    : '🚛'

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20, paddingBottom:14, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:2 }}>
          <span style={{ fontSize:22 }}>🏢</span>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:T.text }}>Concessionária</h1>
        </div>
        <p style={{ fontSize:12, color:T.textMuted, marginLeft:34 }}>Compre ou alugue caminhões, tratores e implementos</p>
      </div>

      {/* Admin: pedidos pendentes (compra + aluguel) */}
      {user?.role === 'admin' && totalPend > 0 && (
        <div style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:14, padding:16, marginBottom:18 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700, color:T.text, marginBottom:12 }}>
            Pedidos pendentes <Badge type="amber">{totalPend}</Badge>
          </div>
          {/* Compras */}
          {pedidosPend.length > 0 && (
            <>
              <div style={{ fontSize:10, color:T.textMuted, letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>Compras</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:alugPend.length?14:0 }}>
                {pedidosPend.map(p => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:T.inputBg, borderRadius:10, border:`1px solid ${T.border2}`, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:140 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{p.jogador_nome}</div>
                      <div style={{ fontSize:11, color:T.textMuted }}>
                        {p.quantidade > 1 ? `${p.quantidade}× ` : ''}{p.modelo_nome} · ${fmt(p.valor)}
                      </div>
                      {p.comprovante && <a href={p.comprovante} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#4a90d0' }}>Ver comprovante →</a>}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={async()=>{await api('/api/concessionaria',{method:'PATCH',body:JSON.stringify({id:p.id,status:'aprovado'})});sounds?.success();notify('✓ Entregue!');load()}} style={{ padding:'6px 14px', background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✓ Entregar</button>
                      <button onClick={async()=>{await api('/api/concessionaria',{method:'PATCH',body:JSON.stringify({id:p.id,status:'recusado'})});notify('Recusado.');load()}} style={{ padding:'6px 10px', background:'#3a0808', color:'#e06060', border:'1px solid #6a1818', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>✗</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Alugueis */}
          {alugPend.length > 0 && (
            <>
              <div style={{ fontSize:10, color:T.textMuted, letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>Aluguéis</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {alugPend.map(a => (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:T.inputBg, borderRadius:10, border:'1px solid rgba(167,139,250,.25)', flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:140 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{a.locatario_nome}</div>
                      <div style={{ fontSize:11, color:T.textMuted }}>
                        {a.maquina_nome} · {a.dias}d · ${fmt(a.valor_total)}
                        <span style={{ color:'#9a80d0', marginLeft:6 }}>de {a.dono_nome}</span>
                      </div>
                      {a.comprovante && <a href={a.comprovante} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#4a90d0' }}>Ver comprovante →</a>}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={async()=>{await api('/api/lavoura/alugueis',{method:'PATCH',body:JSON.stringify({action:'aprovar',id:a.id})});sounds?.success();notify('✓ Aluguel aprovado!');load()}} style={{ padding:'6px 14px', background:'linear-gradient(135deg,#206040,#40a060)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✓ Aprovar</button>
                      <button onClick={async()=>{await api('/api/lavoura/alugueis',{method:'PATCH',body:JSON.stringify({action:'recusar',id:a.id})});notify('Recusado.');load()}} style={{ padding:'6px 10px', background:'#3a0808', color:'#e06060', border:'1px solid #6a1818', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>✗</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: confirmação compra */}
      {step === 3 ? (
        <div style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:14, padding:40, textAlign:'center', maxWidth:440, margin:'0 auto' }}>
          <div style={{ fontSize:52, marginBottom:14 }}>{tipoEmoji}</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'#a080ff', marginBottom:8 }}>Pedido enviado!</h2>
          <p style={{ fontSize:13, color:T.textMuted, lineHeight:1.8, marginBottom:18 }}>O admin irá verificar seu comprovante e entregar na sua garagem.</p>
          <button onClick={()=>{setStep(1);setModeloSel(null);setComprovante('');setQty(1)}} style={{ padding:'9px 20px', background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Ver outro modelo</button>
        </div>

      /* Step 2: form compra */
      ) : step === 2 && modeloSel ? (
        <div style={{ maxWidth:460, margin:'0 auto' }}>
          <div style={{ background:T.card, border:'1px solid #3020a0', borderRadius:14, padding:22 }}>
            {/* Preview */}
            <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:36 }}>{tipoEmoji}</span>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:T.text }}>{modeloSel.modelo}</div>
                <div style={{ fontSize:12, color:T.textMuted }}>
                  {isLavoura ? `${modeloSel.capacidade} ha/dia` : `${modeloSel.capacidade} cab.`} · ${fmt(modeloSel.preco)} / unid.
                </div>
              </div>
            </div>
            {/* Quantidade */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:7 }}>Quantidade</label>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.border2}`, background:T.inputBg, color:T.text, fontSize:18, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                <span style={{ fontSize:20, fontWeight:800, color:'#a080ff', fontFamily:"'Playfair Display',serif", minWidth:24, textAlign:'center' }}>{qty}</span>
                <button onClick={()=>setQty(q=>Math.min(10,q+1))} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.border2}`, background:T.inputBg, color:T.text, fontSize:18, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                <span style={{ fontSize:12, color:T.textMuted, marginLeft:4 }}>= <strong style={{ color:T.text }}>${fmt(modeloSel.preco * qty)}</strong></span>
              </div>
            </div>
            {/* Comprovante */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:7 }}>Link do comprovante (Discord)</label>
              <input value={comprovante} onChange={e=>setComprovante(e.target.value)} placeholder="https://discord.com/channels/..." style={{ width:'100%', boxSizing:'border-box', background:T.inputBg, border:`1px solid ${T.border2}`, borderRadius:10, padding:'10px 14px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none' }}/>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{setStep(1);setQty(1)}} style={{ flex:1, padding:10, background:'transparent', border:`1px solid ${T.border2}`, color:T.textDim, borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Voltar</button>
              <button onClick={comprarModelo} style={{ flex:2, padding:10, background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Comprar{qty>1?` ${qty}×`:''} — ${fmt(modeloSel.preco * qty)}
              </button>
            </div>
          </div>
        </div>

      /* Catálogo / Alugar */
      ) : (
        <>
          {/* Tabs — scrollável no mobile */}
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', marginBottom:18, paddingBottom:4 }}>
            <div style={{ display:'flex', gap:8, minWidth:'max-content' }}>
              {CONCE_TABS.map(t => {
                const cnt = t.fn ? modelos.filter(t.fn).length : dispAlug.length
                const ativo = tabCat === t.v
                const isAlug = t.v === 'alugar'
                return (
                  <button key={t.v} onClick={()=>{setTabCat(t.v);setStepAlug(1);setMaqSel(null)}} style={{
                    padding:'8px 16px', borderRadius:22,
                    border:`1px solid ${ativo?(isAlug?'#2a6040':' #5030c0'):T.border}`,
                    background: ativo?(isAlug?'rgba(40,96,64,.22)':'rgba(80,48,192,.22)'):'transparent',
                    color: ativo?(isAlug?'#4ad4a0':'#a080ff'):T.textMuted,
                    fontSize:13, cursor:'pointer', fontFamily:'inherit',
                    fontWeight: ativo?700:400, whiteSpace:'nowrap', transition:'all .15s',
                    display:'flex', alignItems:'center', gap:6,
                  }}>
                    {t.l}
                    {cnt > 0 && <span style={{ background: ativo?(isAlug?'rgba(74,212,160,.2)':'rgba(160,128,255,.25)'):T.inputBg, color: ativo?(isAlug?'#4ad4a0':'#a080ff'):T.textMuted, fontSize:11, fontWeight:700, borderRadius:10, padding:'1px 7px', border:`1px solid ${ativo?(isAlug?'#2a6040':'#5030c0'):T.border}` }}>{cnt}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Aba: Compra ── */}
          {tabCat !== 'alugar' && (
            modelosFiltrados.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:T.textMuted, fontSize:13 }}>Nenhum modelo disponível.</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
                {modelosFiltrados.map(m => {
                  const isLav = m.tipo?.startsWith('lavoura_')
                  return (
                    <div key={m.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:'hidden', transition:'all .22s', cursor:'pointer' }}
                      onMouseEnter={e=>{e.currentTarget.style.border='1px solid #5030c0';e.currentTarget.style.transform='translateY(-3px)'}}
                      onMouseLeave={e=>{e.currentTarget.style.border=`1px solid ${T.border}`;e.currentTarget.style.transform='translateY(0)'}}>
                      <div style={{ height:150, overflow:'hidden', background:'#0a0a0a', position:'relative' }}>
                        <img src={m.foto_url} alt={m.modelo} style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(.75)' }} onError={e=>e.target.style.display='none'}/>
                        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.7),transparent 50%)' }}/>
                        <div style={{ position:'absolute', bottom:9, left:12 }}>
                          {isLav
                            ? <span style={{ background:'rgba(10,24,8,.9)', border:'1px solid #2a5a12', color:'#4ade80', fontSize:11, padding:'3px 10px', borderRadius:10, fontWeight:600 }}>🌿 {m.capacidade} ha/dia</span>
                            : <span style={{ background:'rgba(10,8,24,.9)', border:'1px solid #3020a0', color:'#a080ff', fontSize:11, padding:'3px 10px', borderRadius:10, fontWeight:600 }}>🐄 {m.capacidade>0?`${m.capacidade} cab.`:'Ração'}</span>
                          }
                        </div>
                      </div>
                      <div style={{ padding:'14px 16px' }}>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:T.text, marginBottom:3 }}>{m.modelo}</div>
                        <div style={{ fontSize:12, color:T.textMuted, marginBottom:8, lineHeight:1.6 }}>{m.descricao}</div>
                        <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                          {isLav ? (
                            <>
                              <span style={{ background:'rgba(42,90,18,.15)', border:'1px solid #2a5a12', color:'#4ade80', fontSize:11, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>🌿 {m.capacidade} ha/dia</span>
                              <span style={{ background:'rgba(60,40,10,.2)', border:'1px solid #6a4010', color:'#c28c46', fontSize:11, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>{{lavoura_trator:'🚜 Trator',lavoura_plantadeira:'🌱 Plantadeira',lavoura_colheitadeira:'⚙️ Colheitadeira'}[m.tipo]||m.tipo}</span>
                            </>
                          ) : (
                            <>
                              {m.capacidade>0 && <span style={{ background:'rgba(80,48,192,.1)', border:'1px solid #3020a0', color:'#a080ff', fontSize:11, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>🐄 {m.capacidade} cab.</span>}
                              {(m.racao_cap||0)>0 && <span style={{ background:'rgba(200,146,42,.1)', border:`1px solid ${T.border2}`, color:T.gold||'#c8922a', fontSize:11, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>🌾 {fmt(m.racao_cap)}kg</span>}
                            </>
                          )}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div style={{ fontSize:20, fontWeight:800, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(m.preco)}</div>
                          <button onClick={()=>{setModeloSel(m);setQty(1);setStep(2)}} style={{ padding:'8px 16px', background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Comprar</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* ── Aba: Alugar ── */}
          {tabCat === 'alugar' && (
            stepAlug === 3 ? (
              <div style={{ background:T.card, border:'1px solid rgba(74,212,160,.25)', borderRadius:14, padding:40, textAlign:'center', maxWidth:440, margin:'0 auto' }}>
                <div style={{ fontSize:52, marginBottom:14 }}>🤝</div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'#4ad4a0', marginBottom:8 }}>Pedido enviado!</h2>
                <p style={{ fontSize:13, color:T.textMuted, lineHeight:1.8, marginBottom:18 }}>O admin irá verificar o comprovante e liberar a máquina na sua garagem.</p>
                <button onClick={()=>{setStepAlug(1);setMaqSel(null);setCompAlug('');loadDisponiveis()}} style={{ padding:'9px 20px', background:'linear-gradient(135deg,#206040,#40a060)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Ver outras</button>
              </div>

            ) : stepAlug === 2 && maqSel ? (
              <div style={{ maxWidth:460, margin:'0 auto' }}>
                <div style={{ background:T.card, border:'1px solid rgba(74,212,160,.3)', borderRadius:14, padding:22 }}>
                  <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16 }}>
                    <span style={{ fontSize:36 }}>{CAP_ALUG[maqSel.tipo]||'🚜'}</span>
                    <div>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:T.text }}>{maqSel.nome}</div>
                      <div style={{ fontSize:12, color:T.textMuted }}>{maqSel.marca} · dono: {maqSel.dono_nome}</div>
                    </div>
                  </div>
                  {/* Dias */}
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:7 }}>Dias de aluguel</label>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <button onClick={()=>setDiasAlug(d=>Math.max(1,d-1))} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.border2}`, background:T.inputBg, color:T.text, fontSize:18, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                      <span style={{ fontSize:20, fontWeight:800, color:'#4ad4a0', fontFamily:"'Playfair Display',serif", minWidth:24, textAlign:'center' }}>{diasAlug}</span>
                      <button onClick={()=>setDiasAlug(d=>Math.min(30,d+1))} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.border2}`, background:T.inputBg, color:T.text, fontSize:18, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                      <span style={{ fontSize:12, color:T.textMuted, marginLeft:4 }}>= <strong style={{ color:'#4ad4a0' }}>${fmt((maqSel.preco_aluguel_dia||0) * diasAlug)}</strong></span>
                    </div>
                    <div style={{ fontSize:11, color:T.textMuted, marginTop:5 }}>${fmt(maqSel.preco_aluguel_dia||0)}/dia</div>
                  </div>
                  {/* Comprovante */}
                  <div style={{ marginBottom:16 }}>
                    <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:7 }}>Link do comprovante (Discord)</label>
                    <input value={compAlug} onChange={e=>setCompAlug(e.target.value)} placeholder="https://discord.com/channels/..." style={{ width:'100%', boxSizing:'border-box', background:T.inputBg, border:`1px solid ${T.border2}`, borderRadius:10, padding:'10px 14px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none' }}/>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={()=>setStepAlug(1)} style={{ flex:1, padding:10, background:'transparent', border:`1px solid ${T.border2}`, color:T.textDim, borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Voltar</button>
                    <button onClick={solicitarAluguel} style={{ flex:2, padding:10, background:'linear-gradient(135deg,#206040,#40a060)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      Alugar por {diasAlug}d — ${fmt((maqSel.preco_aluguel_dia||0)*diasAlug)}
                    </button>
                  </div>
                </div>
              </div>

            ) : dispAlug.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🤝</div>
                <div style={{ fontSize:14, color:T.textMuted, marginBottom:6 }}>Nenhuma máquina disponível para aluguel no momento.</div>
                <div style={{ fontSize:12, color:T.textMuted }}>Dono de máquinas pode ativá-las na aba <strong style={{ color:T.text }}>Lavoura → Garagem</strong>.</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
                {dispAlug.map(m => (
                  <div key={m.id} style={{ background:T.card, border:'1px solid rgba(74,212,160,.2)', borderRadius:14, padding:18, cursor:'pointer', transition:'all .2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.border='1px solid rgba(74,212,160,.5)';e.currentTarget.style.transform='translateY(-2px)'}}
                    onMouseLeave={e=>{e.currentTarget.style.border='1px solid rgba(74,212,160,.2)';e.currentTarget.style.transform='translateY(0)'}}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <span style={{ fontSize:28 }}>{CAP_ALUG[m.tipo]||'🚜'}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:T.text, fontFamily:"'Playfair Display',serif" }}>{m.nome}</div>
                        <div style={{ fontSize:11, color:T.textMuted }}>{m.marca} · {TIPO_LABEL[m.tipo]||m.tipo}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:'#9a80d0', marginBottom:10 }}>👤 {m.dono_nome}</div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ fontSize:18, fontWeight:800, color:'#4ad4a0', fontFamily:"'Playfair Display',serif" }}>${fmt(m.preco_aluguel_dia)}<span style={{ fontSize:11, color:T.textMuted, fontWeight:400 }}>/dia</span></div>
                      <button onClick={()=>{setMaqSel(m);setDiasAlug(3);setStepAlug(2)}} style={{ padding:'7px 14px', background:'linear-gradient(135deg,#206040,#40a060)', color:'#fff', border:'none', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Alugar</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}

function Badge({ type, children }) {
  const s = { amber:['#3a2000','#e09030','#6a3800'], ok:['#0a2010','#4ad4a0','#1a5a30'] }[type]||['#2a2018','#9a8060','#4a3020']
  return <span style={{ background:s[0], color:s[1], border:`1px solid ${s[2]}`, fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600, marginLeft:8 }}>{children}</span>
}

// ─── Admin Transportadora Panel ───────────────────────────────────────────────
function AdminTransportadoraPanel({ T, api, notify, sounds, onReload }) {
  const [fretes, setFretes] = useState([])
  const [caminhoes, setCaminhoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null) // caminhao id

  const load = useCallback(async () => {
    setLoading(true)
    const [f, c] = await Promise.all([
      api('/api/transportadora?tipo=todos'),
      api('/api/admin/caminhoes'),
    ])
    setFretes(Array.isArray(f) ? f : [])
    setCaminhoes(Array.isArray(c) ? c : [])
    setLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  async function deleteCaminhao(id) {
    const r = await api('/api/admin/caminhoes', { method: 'DELETE', body: JSON.stringify({ id }) })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    sounds?.success()
    notify('✓ Caminhão removido!')
    setConfirmDelete(null)
    load()
    onReload && onReload()
  }

  async function marcarPago(id) {
    const r = await api('/api/transportadora', { method: 'PATCH', body: JSON.stringify({ id, pago: true }) })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    sounds?.coin()
    notify('✓ Frete marcado como pago!')
    load()
  }

  async function resetarTudo() {
    if (!confirm('Resetar TODA a transportadora? Apaga fretes e caminhões.')) return
    await api('/api/transportadora', { method: 'DELETE' })
    notify('✓ Transportadora resetada!')
    load()
    onReload && onReload()
  }

  // Agrupar caminhões por dono
  const frotas = caminhoes.reduce((acc, c) => {
    const nome = c.jogador_nome || 'Desconhecido'
    if (!acc[nome]) acc[nome] = []
    acc[nome].push(c)
    return acc
  }, {})

  const fretesEmRota = fretes.filter(f => ['em_rota_buscar','em_rota_fazenda'].includes(f.status))
  const fretesAguardando = fretes.filter(f => f.status === 'entregue' && !f.pago)
  const fretesDisponiveis = fretes.filter(f => f.status === 'disponivel')

  if (loading) return <div style={{ textAlign:'center', padding:40, color:T.textMuted }}>Carregando painel admin...</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Resumo */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12 }}>
        {[
          { label:'Caminhões total', value:caminhoes.length, icon:'🚛', color:T.text },
          { label:'Em rota agora', value:fretesEmRota.length, icon:'🔄', color:fretesEmRota.length>0?'#a080ff':T.text },
          { label:'Aguard. pagamento', value:fretesAguardando.length, icon:'💰', color:fretesAguardando.length>0?'#e09030':T.text },
          { label:'Fretes disponíveis', value:fretesDisponiveis.length, icon:'📦', color:T.text },
          { label:'Frotas ativas', value:Object.keys(frotas).length, icon:'👥', color:T.gold||'#c8922a' },
        ].map(m => (
          <div key={m.label} style={{ background:T.inputBg, borderRadius:12, padding:'14px 16px', border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:10, color:T.textMuted, marginBottom:6, textTransform:'uppercase', letterSpacing:'1px', fontWeight:600 }}>{m.icon} {m.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:m.color, fontFamily:"'Playfair Display',serif" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Aguardando pagamento */}
      {fretesAguardando.length > 0 && (
        <div style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:16, padding:20 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:T.text, marginBottom:6 }}>
            💰 Aguardando addmoney
          </div>
          <p style={{ fontSize:12, color:T.textMuted, marginBottom:14 }}>Faça o addmoney no servidor para cada transportador, depois marque como pago.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {fretesAguardando.map(f => (
              <div key={f.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:T.inputBg, borderRadius:12, border:`1px solid #6a4010`, flexWrap:'wrap' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{f.transportador_nome}</div>
                  <div style={{ fontSize:12, color:T.textMuted }}>Frete {f.lote_codigo} · {f.quantidade} cab. · {f.origem} → {f.destino}</div>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>
                    Entregue em {new Date(f.aceito_em||f.criado_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'#4ad4a0', fontFamily:"'Playfair Display',serif" }}>${fmt(f.valor)}</div>
                  <div style={{ fontSize:10, color:T.textMuted }}>a receber</div>
                </div>
                <button onClick={() => marcarPago(f.id)} style={{ padding:'8px 16px', background:'linear-gradient(135deg,#1a4a10,#2a7a18)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  ✓ Addmoney feito
                </button>
              </div>
            ))}
            <div style={{ fontSize:13, color:T.textMuted, textAlign:'right', paddingTop:4 }}>
              Total a pagar: <strong style={{ color:'#4ad4a0', fontFamily:"'Playfair Display',serif" }}>${fmt(fretesAguardando.reduce((s,f)=>s+Number(f.valor),0))}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Em rota agora */}
      {fretesEmRota.length > 0 && (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:T.text, marginBottom:14 }}>
            🔄 Fretes em andamento agora
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {fretesEmRota.map(f => {
              const chegaEm = new Date(f.chegada_fazenda_em || f.entrega_em)
              const mins = Math.max(0, Math.ceil((chegaEm - Date.now()) / 60000))
              return (
                <div key={f.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:T.inputBg, borderRadius:12, border:'1px solid #3020a0', flexWrap:'wrap' }}>
                  <div style={{ fontSize:24 }}>🚛</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{f.transportador_nome}</div>
                    <div style={{ fontSize:12, color:T.textMuted }}>{f.lote_codigo} · {f.quantidade} cab. · {f.origem} → {f.destino}</div>
                    <div style={{ fontSize:11, color:'#a080ff', marginTop:2 }}>
                      {f.status==='em_rota_buscar'?'🚛 Indo buscar o gado...':'🐄 Gado a caminho da fazenda...'}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:16, fontWeight:700, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(f.valor)}</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>~{mins} min restantes</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Frotas por jogador */}
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:T.text, marginBottom:14 }}>
          👥 Frotas por jogador
        </div>
        {Object.keys(frotas).length === 0 ? (
          <div style={{ textAlign:'center', padding:'20px 0', color:T.textMuted, fontSize:13 }}>Nenhum caminhão cadastrado</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {Object.entries(frotas).map(([nome, cams]) => (
              <div key={nome} style={{ background:T.inputBg, borderRadius:12, padding:'14px 16px', border:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, flexWrap:'wrap', gap:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{nome}</div>
                    <div style={{ fontSize:12, color:T.textMuted }}>{cams.length} caminhão(ões) · capacidade total: {cams.reduce((s,c)=>s+c.capacidade,0)} cab.</div>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ background:'rgba(10,42,10,.6)', border:'1px solid #2a5a12', color:'#4ad4a0', fontSize:11, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>
                      {cams.filter(c=>c.status==='disponivel').length} livre(s)
                    </span>
                    <span style={{ background:'rgba(10,8,24,.6)', border:'1px solid #3020a0', color:'#a080ff', fontSize:11, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>
                      {cams.filter(c=>c.status==='em_rota').length} em rota
                    </span>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {cams.map(c => (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:T.card, borderRadius:8, border:`1px solid ${T.border}` }}>
                      <span style={{ fontSize:16 }}>🚛</span>
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{c.modelo}</span>
                        <span style={{ fontSize:11, color:T.textMuted, marginLeft:8 }}>Placa {c.placa} · {c.capacidade} cab.</span>
                      </div>
                      <span style={{ background:c.status==='disponivel'?'rgba(10,42,10,.6)':'rgba(10,8,24,.6)', border:`1px solid ${c.status==='disponivel'?'#2a5a12':'#3020a0'}`, color:c.status==='disponivel'?'#4ad4a0':'#a080ff', fontSize:10, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>
                        {c.status==='disponivel'?'Livre':'Em rota'}
                      </span>
                      {confirmDelete === c.id ? (
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => deleteCaminhao(c.id)} style={{ padding:'4px 10px', background:'#3a0808', color:'#e06060', border:'1px solid #6a1818', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Confirmar</button>
                          <button onClick={() => setConfirmDelete(null)} style={{ padding:'4px 8px', background:'transparent', color:T.textMuted, border:`1px solid ${T.border}`, borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(c.id)} style={{ padding:'4px 10px', background:'#3a0808', color:'#e06060', border:'1px solid #6a1818', borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>✕ Apagar</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico completo */}
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:T.text, marginBottom:14 }}>
          📋 Todos os fretes
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr>{['Lote','Transportador','Carga','Valor','Status','Pago'].map(h=>(
                <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:10, fontWeight:600, color:T.textMuted, borderBottom:`1px solid ${T.border}`, textTransform:'uppercase', letterSpacing:'.5px', whiteSpace:'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {fretes.length === 0 && <tr><td colSpan={6} style={{ padding:24, textAlign:'center', color:T.textMuted }}>Nenhum frete registrado</td></tr>}
              {fretes.map(f => (
                <tr key={f.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                  <td style={{ padding:'10px 12px', color:T.text, fontWeight:600 }}>{f.lote_codigo||'—'}</td>
                  <td style={{ padding:'10px 12px', color:T.textDim }}>{f.transportador_nome||<span style={{color:T.textMuted,fontStyle:'italic'}}>Aguardando</span>}</td>
                  <td style={{ padding:'10px 12px', color:T.textDim }}>{f.quantidade} cab.</td>
                  <td style={{ padding:'10px 12px', color:'#a080ff', fontWeight:700, fontFamily:"'Playfair Display',serif" }}>${fmt(f.valor)}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ background:f.status==='entregue'?'rgba(10,42,10,.6)':f.status==='disponivel'?'rgba(42,24,0,.6)':'rgba(10,8,24,.6)', border:`1px solid ${f.status==='entregue'?'#2a5a12':f.status==='disponivel'?'#8a4010':'#3020a0'}`, color:f.status==='entregue'?'#4ad4a0':f.status==='disponivel'?'#e09030':'#a080ff', fontSize:10, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>
                      {f.status==='entregue'?'Entregue':f.status==='disponivel'?'Disponível':f.status==='em_rota_buscar'?'Buscando':'Entregando'}
                    </span>
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    {f.status==='entregue' && !f.pago ? (
                      <button onClick={() => marcarPago(f.id)} style={{ padding:'4px 10px', background:'linear-gradient(135deg,#1a4a10,#2a7a18)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✓ Pagar</button>
                    ) : f.pago ? (
                      <span style={{ color:'#4ad4a0', fontSize:11, fontWeight:600 }}>✓ Pago</span>
                    ) : <span style={{ color:T.textMuted, fontSize:11 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botão reset geral */}
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button onClick={resetarTudo} style={{ padding:'9px 18px', background:'#3a0808', color:'#e06060', border:'1px solid #6a1818', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          🗑 Resetar toda a transportadora
        </button>
      </div>

    </div>
  )
}

// ─── Caminhao Card com edição de nome ────────────────────────────────────────
function CaminhaoCard({ caminhao: c, T, api, notify, onReload }) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(c.nome_transportadora || '')
  const [saving, setSaving] = useState(false)

  async function salvarNome() {
    setSaving(true)
    const r = await api('/api/admin/caminhoes', {
      method: 'PATCH',
      body: JSON.stringify({ id: c.id, nome_transportadora: nome })
    })
    setSaving(false)
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    notify('✓ Nome salvo!')
    setEditando(false)
    onReload && onReload()
  }

  return (
    <div style={{ background:T.card, border:`1px solid ${c.status==='disponivel'?T.border:'#3020a0'}`, borderRadius:14, padding:18 }}>
      <div style={{ fontSize:32, marginBottom:10 }}>🚛</div>
      {editando ? (
        <div style={{ marginBottom:10 }}>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Transportadora Silva"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && salvarNome()}
            style={{ width:'100%', background:T.inputBg, border:`1px solid #5030c0`, borderRadius:8, padding:'8px 10px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none', marginBottom:6 }}
          />
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={salvarNome} disabled={saving} style={{ flex:1, padding:'6px 0', background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {saving ? '...' : 'Salvar'}
            </button>
            <button onClick={() => { setEditando(false); setNome(c.nome_transportadora||'') }} style={{ padding:'6px 10px', background:'transparent', border:`1px solid ${T.border}`, color:T.textMuted, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
            <div style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:"'Playfair Display',serif" }}>
              {c.nome_transportadora || c.modelo}
            </div>
            <button onClick={() => setEditando(true)} style={{ background:'none', border:'none', color:T.textMuted, cursor:'pointer', fontSize:13, padding:0 }}>✏</button>
          </div>
          {c.nome_transportadora && <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>{c.modelo}</div>}
        </div>
      )}
      <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Placa {c.placa}</div>
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
        {(c.tipo||'gado') !== 'racao' && <span style={{ background:'rgba(80,48,192,.1)', border:'1px solid #3020a0', color:'#a080ff', fontSize:10, padding:'2px 8px', borderRadius:6, fontWeight:600 }}>🐄 {c.capacidade} cab.</span>}
        {(c.racao_cap||0) > 0 && <span style={{ background:'rgba(200,146,42,.1)', border:`1px solid ${T.border}`, color:T.gold||'#c8922a', fontSize:10, padding:'2px 8px', borderRadius:6, fontWeight:600 }}>🌾 {fmt(c.racao_cap)}kg</span>}
        {(c.tipo||'gado') === 'racao' && <span style={{ background:'rgba(100,160,80,.1)', border:'1px solid #4a8a30', color:'#6ab840', fontSize:10, padding:'2px 8px', borderRadius:6, fontWeight:600 }}>Somente ração</span>}
      </div>
      <span style={{ background:c.status==='disponivel'?'rgba(10,42,10,.8)':'rgba(10,8,24,.8)', border:`1px solid ${c.status==='disponivel'?'#2a5a12':'#3020a0'}`, color:c.status==='disponivel'?'#4ad4a0':'#a080ff', fontSize:11, padding:'3px 10px', borderRadius:10, fontWeight:600 }}>
        {c.status==='disponivel'?'✓ Disponível':'🚛 Em rota'}
      </span>
    </div>
  )
}

// ─── Fretes por blocos — UI de seleção ───────────────────────────────────────
function FretesBlocos({ fretes, T, caminhoesLivres, onAceitar }) {
  const [selecionados, setSelecionados] = useState([])
  const [camSel, setCamSel] = useState('')

  // Agrupar por lote
  const porLote = fretes.reduce((acc, f) => {
    const key = f.lote_id || f.lote_codigo || f.id
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})

  function toggleBloco(f) {
    setSelecionados(prev => {
      const jatem = prev.find(x => x.id === f.id)
      if (jatem) return prev.filter(x => x.id !== f.id)
      return [...prev, f]
    })
  }

  const totalQtd = selecionados.reduce((s, f) => s + f.quantidade, 0)
  const totalValor = selecionados.reduce((s, f) => s + Number(f.valor), 0)
  const camLivre = caminhoesLivres.find(c => c.id.toString() === camSel)
  const cabacidade = camLivre?.capacidade || 0
  const blocosQueCapaz = cabacidade > 0 ? Math.floor(cabacidade / 30) : 0

  if (fretes.length === 0) return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:48, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🚛</div>
      <div style={{ fontSize:16, color:T.textMuted }}>Nenhum frete disponível no momento</div>
      <div style={{ fontSize:12, color:T.textMuted, marginTop:6 }}>Quando alguém comprar gado você será notificado!</div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Instrução */}
      <div style={{ background:T.inputBg, borderRadius:12, padding:'12px 16px', border:`1px solid ${T.border}`, fontSize:13, color:T.textDim, lineHeight:1.6 }}>
        💡 Selecione os blocos que quer transportar. {fretes[0]?.tipo_carga==='racao'?'Blocos de 1.500kg de ração.':'Blocos de 30 cabeças.'} 1 bloco = 1h · cada bloco extra +15min.
      </div>

      {/* Blocos por lote */}
      {Object.entries(porLote).map(([loteKey, blocos]) => (
        <div key={loteKey} style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, fontFamily:"'Playfair Display',serif" }}>
                {blocos[0].lote_codigo} — {blocos.reduce((s,b)=>s+b.quantidade,0)} {blocos[0].tipo_carga==='racao'?'kg total':'cabeças total'}
              </div>
              <div style={{ fontSize:12, color:T.textMuted }}>{blocos[0].origem} → {blocos[0].destino}</div>
            </div>
            <div style={{ fontSize:12, color:T.textMuted }}>{blocos.length} bloco(s)</div>
          </div>
          <div style={{ padding:'12px 18px', display:'flex', flexDirection:'column', gap:8 }}>
            {blocos.map((b, i) => {
              const sel = !!selecionados.find(x => x.id === b.id)
              return (
                <div key={b.id} onClick={() => toggleBloco(b)} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:sel?'rgba(80,48,192,.15)':T.inputBg, border:`1px solid ${sel?'#5030c0':T.border}`, borderRadius:10, cursor:'pointer', transition:'all .15s' }}>
                  <div style={{ width:22, height:22, borderRadius:6, background:sel?'#6030c0':T.border, border:`2px solid ${sel?'#8060e0':T.border2}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, color:'#fff' }}>
                    {sel?'✓':''}
                  </div>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:T.text }}>Bloco {b.bloco_num||i+1}/{b.bloco_total||blocos.length}</span>
                    <span style={{ fontSize:12, color:T.textMuted, marginLeft:8 }}>{b.quantidade} {b.tipo_carga==='racao'?'kg':'cab.'}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(b.valor)}</div>
                  <div style={{ fontSize:11, color:T.textMuted, fontStyle:'italic' }}>+15min</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Painel de confirmação */}
      {selecionados.length > 0 && (
        <div style={{ background:'rgba(80,48,192,.1)', border:'1px solid #5030c0', borderRadius:14, padding:'16px 18px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#a080ff', marginBottom:12 }}>
            {selecionados.length} bloco(s) selecionado(s) — {totalQtd} cabeças
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            <div style={{ background:T.inputBg, borderRadius:8, padding:'8px 10px', textAlign:'center', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, color:T.textMuted, marginBottom:2 }}>DURAÇÃO</div>
              <div style={{ fontSize:14, fontWeight:700, color:T.text }}>
                {selecionados.length === 1 ? '1h' : `${Math.floor((60+(selecionados.length-1)*15)/60)}h${(60+(selecionados.length-1)*15)%60>0?`${(60+(selecionados.length-1)*15)%60}min`:''}`}
              </div>
            </div>
            <div style={{ background:T.inputBg, borderRadius:8, padding:'8px 10px', textAlign:'center', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, color:T.textMuted, marginBottom:2 }}>CARGA</div>
              <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{totalQtd} {selecionados[0]?.tipo_carga==='racao'?'kg':'cab.'}</div>
            </div>
            <div style={{ background:T.inputBg, borderRadius:8, padding:'8px 10px', textAlign:'center', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, color:T.textMuted, marginBottom:2 }}>GANHO</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#a080ff' }}>${fmt(totalValor)}</div>
            </div>
          </div>
          {caminhoesLivres.length > 0 ? <>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:6 }}>Selecionar caminhão</label>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {caminhoesLivres.map(c => {
                  const isRacao = selecionados[0]?.tipo_carga === 'racao'
                  const maxBlocos = isRacao ? Math.floor((c.racao_cap||0) / 1500) : Math.floor(c.capacidade / 30)
                  const insuf = selecionados.length > maxBlocos || (isRacao && (c.racao_cap||0) === 0)
                  return (
                    <button key={c.id} onClick={() => !insuf && setCamSel(c.id.toString())} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:camSel===c.id.toString()?'rgba(80,48,192,.2)':T.inputBg, border:`1px solid ${insuf?'#6a1818':camSel===c.id.toString()?'#5030c0':T.border}`, borderRadius:8, cursor:insuf?'not-allowed':'pointer', fontFamily:'inherit', opacity:insuf?.5:1 }}>
                      <span>🚛</span>
                      <div style={{ flex:1, textAlign:'left' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:insuf?'#e06060':T.text }}>{c.modelo} — {c.capacidade} cab.</div>
                        <div style={{ fontSize:10, color:T.textMuted }}>{isRacao ? `🌾 ${fmt(c.racao_cap||0)}kg ração` : `🐄 ${c.capacidade} cab.`} · até {maxBlocos} bloco(s){insuf?' — insuficiente':''}</div>
                      </div>
                      {camSel===c.id.toString()&&<span style={{color:'#a080ff'}}>✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
            <button
              onClick={() => { if(camSel) { const cam=caminhoesLivres.find(c=>c.id.toString()===camSel); onAceitar(selecionados,cam); setSelecionados([]); setCamSel('') }}}
              disabled={!camSel}
              style={{ width:'100%', padding:11, background:camSel?'linear-gradient(135deg,#3020a0,#6030c0)':'rgba(80,48,192,.2)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:camSel?'pointer':'not-allowed', fontFamily:'inherit', opacity:camSel?1:.6 }}
            >
              🚛 Aceitar {selecionados.length} bloco(s) — ${fmt(totalValor)}
            </button>
          </> : <div style={{ fontSize:13, color:'#e06060', textAlign:'center', padding:'8px 0' }}>Sem caminhão livre — compre um na Concessionária</div>}
        </div>
      )}
    </div>
  )
}

// ─── Frete Ração Card ─────────────────────────────────────────────────────────
export function FreteRacaoCard({ frete, T, user, api, notify, sounds, onReload }) {
  const [loading, setLoading] = useState(false)
  const [vans, setVans] = useState([])
  const [vanSel, setVanSel] = useState('')

  useEffect(() => {
    if (user?.role === 'admin' && frete.status === 'aguardando_liberacao') {
      api('/api/transportadora?tipo=vans_disponiveis').then(d => setVans(Array.isArray(d)?d:[]))
    }
  }, [user, frete.status, api])

  const STATUS = {
    aguardando_liberacao: { label:'⏳ Aguardando liberação', color:'#e09030', bg:'rgba(42,24,0,.6)', border:'#8a4010' },
    liberado:             { label:'✅ Liberado no armazém', color:'#a080ff', bg:'rgba(10,8,24,.6)', border:'#3020a0' },
    retirado:             { label:'🚐 A caminho do produtor', color:'#4a90d0', bg:'rgba(10,20,40,.6)', border:'#1a4080' },
    entregue:             { label:'✓ Entregue', color:'#4ad4a0', bg:'rgba(10,42,10,.6)', border:'#2a5a12' },
  }

  const s = STATUS[frete.status] || STATUS.aguardando_liberacao
  const isAdmin = user?.role === 'admin'
  const isTransportador = String(frete.transportador_id) === String(user?.id)
  const isProdutor = String(frete.comprador_id) === String(user?.id)

  async function avancar(novoStatus, extra={}) {
    setLoading(true)
    const r = await api('/api/transportadora', {
      method: 'PATCH',
      body: JSON.stringify({ id: frete.id, status: novoStatus, ...extra })
    })
    setLoading(false)
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    sounds?.success()
    onReload && onReload()
  }

  return (
    <div style={{ background:T.card, border:`1px solid ${s.border}`, borderRadius:14, padding:18 }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:12 }}>
        <div style={{ fontSize:28, flexShrink:0 }}>🌾</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.text, fontFamily:"'Playfair Display',serif" }}>
            {frete.lote_codigo} — {frete.quantidade}kg de ração
          </div>
          <div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>
            {frete.origem} → {frete.destino}
          </div>
          {frete.transportador_nome && (
            <div style={{ fontSize:11, color:'#a080ff', marginTop:2 }}>🚐 {frete.transportador_nome}</div>
          )}
          {frete.bloco_total > 1 && (
            <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>
              Bloco {frete.bloco_num}/{frete.bloco_total}
            </div>
          )}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:18, fontWeight:800, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>
            ${fmt(frete.valor)}
          </div>
          <span style={{ background:s.bg, border:`1px solid ${s.border}`, color:s.color, fontSize:10, padding:'2px 8px', borderRadius:8, fontWeight:600, display:'inline-block', marginTop:4 }}>
            {s.label}
          </span>
        </div>
      </div>

      {/* Steps visual */}
      <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:14 }}>
        {[
          { k:'aguardando_liberacao', label:'Admin libera' },
          { k:'liberado', label:'Transportador retira' },
          { k:'retirado', label:'Produtor confirma' },
          { k:'entregue', label:'Entregue' },
        ].map((step, i) => {
          const steps = ['aguardando_liberacao','liberado','retirado','entregue']
          const idx = steps.indexOf(frete.status)
          const done = steps.indexOf(step.k) <= idx
          return (
            <div key={step.k} style={{ display:'flex', alignItems:'center', flex: i < 3 ? 1 : 'auto' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:done?'rgba(80,48,192,.5)':'rgba(255,255,255,.05)', border:`2px solid ${done?'#8060d0':'#2a1a50'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:done?'#c0a0ff':'#4a3060', fontWeight:700 }}>
                  {done ? '✓' : i+1}
                </div>
                <div style={{ fontSize:9, color:done?'#a080ff':T.textMuted, whiteSpace:'nowrap', textAlign:'center' }}>{step.label}</div>
              </div>
              {i < 3 && <div style={{ flex:1, height:2, background:done?'#5030a0':'rgba(255,255,255,.05)', margin:'0 4px', marginBottom:16 }}/>}
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:8 }}>
        {/* Admin atribui van e libera */}
        {isAdmin && frete.status === 'aguardando_liberacao' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
            {vans.length === 0 ? (
              <div style={{ fontSize:12, color:'#e06060', padding:'8px 12px', background:'rgba(42,10,10,.4)', borderRadius:8, border:'1px solid #6a1818' }}>
                ⚠ Nenhuma van disponível — aguarde um transportador ficar livre
              </div>
            ) : (
              <>
                <select value={vanSel} onChange={e=>setVanSel(e.target.value)} style={{ width:'100%', background:T.inputBg, border:`1px solid ${T.border2}`, borderRadius:8, padding:'8px 10px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none' }}>
                  <option value="">— Selecionar van —</option>
                  {vans.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.nome_transportadora||v.modelo} · {v.dono} · {fmt(v.racao_cap)}kg cap.
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (!vanSel) return notify('Selecione uma van!','danger')
                    const van = vans.find(v=>v.id.toString()===vanSel)
                    avancar('atribuir', {
                      transportador_id: van.jogador_id,
                      transportador_nome: van.dono,
                      caminhao_id: parseInt(vanSel)
                    })
                  }}
                  disabled={loading||!vanSel}
                  style={{ padding:'9px 0', background:vanSel?'linear-gradient(135deg,#3020a0,#6030c0)':'rgba(80,48,192,.2)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:vanSel?'pointer':'not-allowed', fontFamily:'inherit' }}
                >
                  {loading ? '...' : '✅ Atribuir e liberar'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Transportador retira */}
        {isTransportador && frete.status === 'liberado' && (
          <button onClick={() => avancar('retirado')} disabled={loading} style={{ flex:1, padding:'9px 0', background:'linear-gradient(135deg,#1a3a8a,#2a60d0)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {loading ? '...' : '🚐 Retirei no armazém'}
          </button>
        )}

        {/* Produtor confirma */}
        {isProdutor && frete.status === 'retirado' && (
          <button onClick={() => avancar('entregue')} disabled={loading} style={{ flex:1, padding:'9px 0', background:'linear-gradient(135deg,#1a4a10,#2a7a18)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {loading ? '...' : '✓ Recebi a ração!'}
          </button>
        )}

        {frete.status === 'entregue' && !frete.pago && isAdmin && (
          <button onClick={() => avancar('pago')} disabled={loading} style={{ flex:1, padding:'9px 0', background:'linear-gradient(135deg,#3a2000,#8a5010)', color:'#e09030', border:'1px solid #8a5010', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {loading ? '...' : '💰 Addmoney feito'}
          </button>
        )}
      </div>

      {/* Mensagens de instrução */}
      {frete.status === 'aguardando_liberacao' && isAdmin && (
        <div style={{ fontSize:11, color:T.textMuted, marginTop:8, fontStyle:'italic' }}>Após o transportador estar no armazém no jogo, libere a carga.</div>
      )}
      {frete.status === 'liberado' && isTransportador && (
        <div style={{ fontSize:11, color:'#a080ff', marginTop:8 }}>Vá ao armazém no jogo e retire a carga. Depois clique em "Retirei".</div>
      )}
      {frete.status === 'retirado' && isProdutor && (
        <div style={{ fontSize:11, color:'#4a90d0', marginTop:8 }}>Aguarde o transportador chegar até você no jogo. Só confirme quando receber fisicamente.</div>
      )}
    </div>
  )
}

// ─── Frete Ração Section ─────────────────────────────────────────────────────
function FreteRacaoSection({ T, user, api, notify, sounds }) {
  const [fretes, setFretes] = useState([])

  const load = useCallback(async () => {
    if (!user) return
    // Admin sees all ração fretes, others see their own
    const tipo = user.role === 'admin' ? 'todos' : 'meus'
    const r = await api(`/api/transportadora?tipo=${tipo}`)
    const todos = Array.isArray(r) ? r : []
    // Filter only ração fretes not yet delivered/paid
    const racaoAtivos = todos.filter(f =>
      f.tipo_carga === 'racao' &&
      !['entregue_pago','pago'].includes(f.status)
    )
    setFretes(racaoAtivos)
  }, [user, api])

  useEffect(() => { load() }, [load])

  // Also show fretes where user is the comprador (produtor)
  const [fretesProdutor, setFretesProdutor] = useState([])
  useEffect(() => {
    if (!user || user.role === 'admin') return
    fetch('/api/transportadora?tipo=todos', {
      headers: { Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('gvrpnl_token') : ''}` }
    }).then(r => r.json()).then(d => {
      if (!Array.isArray(d)) return
      const meus = d.filter(f => f.tipo_carga === 'racao' && String(f.comprador_id) === String(user.id) && f.status !== 'pago')
      setFretesProdutor(meus)
    }).catch(() => {})
  }, [user])

  const todosFretes = user?.role === 'admin'
    ? fretes
    : [...fretes.filter(f => String(f.transportador_id) === String(user?.id)), ...fretesProdutor.filter(f => !fretes.find(x => x.id === f.id))]

  if (todosFretes.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:T.text, marginBottom:14 }}>
        🌾 Fretes de ração em andamento
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {todosFretes.map(f => (
          <FreteRacaoCard key={f.id} frete={f} T={T} user={user} api={api} notify={notify} sounds={sounds} onReload={load}/>
        ))}
      </div>
    </div>
  )
}

// ─── Fretes NPC Section ───────────────────────────────────────────────────────
export function FretesNPCPage({ T, user, api, notify, sounds }) {
  const [fretes, setFretes] = useState([])
  const [meusFretes, setMeusFretes] = useState([])
  const [caminhoes, setCaminhoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [aceitando, setAceitando] = useState(null)
  const [camSel, setCamSel] = useState('')
  const [tab, setTab] = useState('disponivel')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [f, mf, c] = await Promise.all([
      api('/api/npc?tipo=fretes'),
      api('/api/npc?tipo=meus_fretes'),
      api('/api/transportadora?tipo=caminhoes'),
    ])
    setFretes(Array.isArray(f)?f:[])
    setMeusFretes(Array.isArray(mf)?mf:[])
    setCaminhoes(Array.isArray(c)?c:[])
    setLoading(false)
  }, [user, api])

  useEffect(() => { load() }, [load])

  async function aceitar() {
    if (!camSel) return notify('Selecione um caminhão!', 'danger')
    const r = await api('/api/npc', { method:'POST', body: JSON.stringify({ action:'aceitar_frete', frete_id: aceitando.id, caminhao_id: parseInt(camSel) }) })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    sounds?.success()
    notify('✓ Frete NPC aceito! 45 minutos de rota.')
    setAceitando(null)
    load()
  }

  const caminhoesLivres = caminhoes.filter(c => c.status === 'disponivel')
  const emRota = meusFretes.filter(f => f.status === 'em_rota')
  const total = fretes.length

  if (!user) return <div style={{textAlign:'center',padding:60,color:T.textMuted}}>Faça login para ver os fretes NPC.</div>

  return (
    <div>
      <div style={{ marginBottom:28, paddingBottom:16, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
            <span style={{ fontSize:24 }}>🤖</span>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:T.text }}>Fretes NPC</h1>
          </div>
          <p style={{ fontSize:13, color:T.textMuted, marginLeft:36 }}>12 cargas por dia — pagam 60% do valor normal. Resetam à meia-noite.</p>
        </div>
        <div style={{ background:'rgba(80,48,192,.1)', border:'1px solid #3020a0', borderRadius:12, padding:'10px 16px', textAlign:'center' }}>
          <div style={{ fontSize:10, color:'#7060a0', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', marginBottom:4 }}>Disponíveis hoje</div>
          <div style={{ fontSize:24, fontWeight:800, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>{fretes.filter(f=>f.status==='disponivel').length}/12</div>
        </div>
      </div>

      {/* Em rota agora */}
      {emRota.length > 0 && (
        <div style={{ marginBottom:16 }}>
          {emRota.map(f => (
            <div key={f.id} style={{ background:'#0a0818', border:'1px solid #3020a0', borderRadius:14, padding:18, marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#a080ff' }}>{f.tipo_carga==='racao'?'🌾':'🚛'} NPC — {f.quantidade} {f.tipo_carga==='racao'?'kg':'cab.'}</div>
                  <div style={{ fontSize:11, color:'#7060a0' }}>{f.origem} → {f.destino}</div>
                </div>
                <div style={{ fontSize:18, fontWeight:800, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(f.valor)}</div>
              </div>
              <FreteNPCTracker frete={f} T={T} api={api} onEntregue={() => { sounds?.coin(); notify(`✓ Frete NPC entregue! +$${fmt(f.valor)}`); load() }}/>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['disponivel','📦 Disponíveis'],['historico','📋 Histórico']].map(([v,l]) => (
          <button key={v} onClick={()=>setTab(v)} style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${tab===v?'#5030c0':T.border}`, background:tab===v?'rgba(80,48,192,.2)':'transparent', color:tab===v?'#a080ff':T.textMuted, fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:tab===v?600:400 }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'disponivel' && (
        loading ? <div style={{textAlign:'center',padding:40,color:T.textMuted}}>Carregando...</div> :
        fretes.filter(f=>f.status==='disponivel').length === 0 ? (
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:48, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🤖</div>
            <div style={{ fontSize:16, color:T.textMuted }}>Nenhum frete NPC disponível agora</div>
            <div style={{ fontSize:12, color:T.textMuted, marginTop:6 }}>Resetam toda meia-noite</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* Info */}
            <div style={{ background:'rgba(42,24,0,.4)', border:'1px solid #4a3010', borderRadius:12, padding:'12px 16px', fontSize:12, color:'#a08040', marginBottom:4 }}>
              ⚠ Fretes NPC pagam <strong>60% do valor normal</strong>. Tempo varia pelo valor: 30min base + 10min a cada $200. Use quando não tiver frete de jogador disponível.
            </div>
            {fretes.filter(f=>f.status==='disponivel').map(f => (
              <div key={f.id} style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:14, padding:18, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                <div style={{ fontSize:28 }}>{f.tipo_carga==='racao'?'🌾':'🐄'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:T.text, fontFamily:"'Playfair Display',serif" }}>
                    {f.quantidade} {f.tipo_carga==='racao'?'kg de ração':'cabeças de gado'}
                  </div>
                  <div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>{f.origem} → {f.destino}</div>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>⏱ {Math.round(30 + Math.floor(f.valor/200)*10)} min · NPC</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(f.valor)}</div>
                  <div style={{ fontSize:10, color:'#6a5030', marginTop:2 }}>60% do normal</div>
                </div>
                <button onClick={() => { setAceitando(f); setCamSel(caminhoesLivres[0]?.id?.toString()||'') }} disabled={caminhoesLivres.length===0}
                  style={{ padding:'9px 16px', background:caminhoesLivres.length>0?'linear-gradient(135deg,#3020a0,#6030c0)':'rgba(80,48,192,.2)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:caminhoesLivres.length>0?'pointer':'not-allowed', fontFamily:'inherit', opacity:caminhoesLivres.length>0?1:.5 }}>
                  {caminhoesLivres.length>0?'Aceitar':'Sem caminhão'}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'historico' && (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:18 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:T.text, marginBottom:14 }}>Histórico de fretes NPC</div>
          {meusFretes.length===0 ? <div style={{textAlign:'center',padding:'20px 0',color:T.textMuted,fontSize:13}}>Nenhum frete NPC realizado ainda</div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {meusFretes.map((f,i) => (
                <div key={f.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:i<meusFretes.length-1?`1px solid ${T.border}`:'none', flexWrap:'wrap' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{f.tipo_carga==='racao'?'🌾':'🐄'} {f.quantidade} {f.tipo_carga==='racao'?'kg':'cab.'}</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>{f.origem} → {f.destino} · {new Date(f.criado_em).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div style={{ fontWeight:700, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(f.valor)}</div>
                  <span style={{ background:f.status==='entregue'?'rgba(10,42,10,.8)':'rgba(10,8,24,.8)', border:`1px solid ${f.status==='entregue'?'#2a5a12':'#3020a0'}`, color:f.status==='entregue'?'#4ad4a0':'#a080ff', fontSize:10, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>
                    {f.status==='entregue'?'✓ Entregue':'🚛 Em rota'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal aceitar */}
      {aceitando && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
          <div style={{ background:T.card, border:'1px solid #3020a0', borderRadius:20, padding:32, width:'100%', maxWidth:400, boxShadow:'0 30px 80px rgba(0,0,0,.5)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:T.text }}>🤖 Aceitar Frete NPC</h3>
              <button onClick={()=>setAceitando(null)} style={{ background:'none', border:'none', color:T.textMuted, fontSize:22, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ background:T.inputBg, borderRadius:12, padding:16, marginBottom:16, border:`1px solid ${T.border}` }}>
              {[
                ['Carga', `${aceitando.quantidade} ${aceitando.tipo_carga==='racao'?'kg de ração':'cabeças'}`],
                ['Rota', `${aceitando.origem} → ${aceitando.destino}`],
                ['Duração', `${Math.round(30 + Math.floor(aceitando.valor/200)*10)} minutos`],
                ['Ganho', `$${fmt(aceitando.valor)}`],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:8 }}>
                  <span style={{ color:T.textMuted }}>{l}</span>
                  <span style={{ fontWeight:l==='Ganho'?800:400, color:l==='Ganho'?'#a080ff':T.text, fontFamily:l==='Ganho'?"'Playfair Display',serif":'inherit' }}>{v}</span>
                </div>
              ))}
            </div>
            {caminhoesLivres.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:8 }}>Selecionar caminhão</label>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {caminhoesLivres.map(c => {
                    const insuf = aceitando.tipo_carga==='racao' ? (c.racao_cap||0)<aceitando.quantidade : c.capacidade<aceitando.quantidade
                    return (
                      <button key={c.id} onClick={()=>!insuf&&setCamSel(c.id.toString())} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:camSel===c.id.toString()?'rgba(80,48,192,.2)':T.inputBg, border:`1px solid ${insuf?'#6a1818':camSel===c.id.toString()?'#5030c0':T.border}`, borderRadius:8, cursor:insuf?'not-allowed':'pointer', fontFamily:'inherit', opacity:insuf?.5:1 }}>
                        <span>🚛</span>
                        <div style={{ flex:1, textAlign:'left' }}>
                          <div style={{ fontSize:12, fontWeight:600, color:insuf?'#e06060':T.text }}>{c.modelo}</div>
                          <div style={{ fontSize:10, color:T.textMuted }}>{insuf?'Insuficiente':'Disponível'} · {aceitando.tipo_carga==='racao'?`${fmt(c.racao_cap||0)}kg ração`:`${c.capacidade} cab.`}</div>
                        </div>
                        {camSel===c.id.toString()&&<span style={{color:'#a080ff'}}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setAceitando(null)} style={{ flex:1, padding:10, background:'transparent', border:`1px solid ${T.border2}`, color:T.textDim, borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
              <button onClick={aceitar} disabled={!camSel} style={{ flex:2, padding:10, background:camSel?'linear-gradient(135deg,#3020a0,#6030c0)':'rgba(80,48,192,.2)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:camSel?'pointer':'not-allowed', fontFamily:'inherit' }}>
                🤖 Aceitar — ${fmt(aceitando.valor)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Mini tracker para frete NPC
function FreteNPCTracker({ frete, T, api, onEntregue }) {
  const [segundos, setSegundos] = useState(0)
  const [pct, setPct] = useState(0)
  const [liberando, setLiberando] = useState(false)
  const [zerou, setZerou] = useState(false)

  useEffect(() => {
    if (!frete?.entrega_em) return
    const update = () => {
      const agora = Date.now()
      const chegaEm = new Date(frete.entrega_em).getTime()
      const inicio = new Date(frete.aceito_em).getTime()
      const diff = Math.max(0, Math.ceil((chegaEm - agora) / 1000))
      const elapsed = agora - inicio
      const total = chegaEm - inicio
      setPct(Math.min(100, (elapsed / total) * 100))
      setSegundos(diff)
      if (diff === 0) setZerou(true)
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [frete])

  async function liberar() {
    setLiberando(true)
    await api('/api/npc', { method:'POST', body: JSON.stringify({ action:'entregar_frete', frete_id: frete.id }) })
    onEntregue && onEntregue()
    setLiberando(false)
  }

  const mins = Math.floor(segundos/60)
  const secs = segundos%60

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12, color:'#7060a0', marginBottom:6 }}>
        <span>{zerou ? '✅ Entregue — confirme!' : '🤖 NPC em rota...'}</span>
        {zerou ? (
          <button onClick={liberar} disabled={liberando} style={{ padding:'4px 12px', background:'linear-gradient(135deg,#1a4a10,#2a7a18)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {liberando?'...':'✓ Confirmar entrega'}
          </button>
        ) : (
          <span style={{ color:'#a080ff', fontWeight:600 }}>{mins}:{String(secs).padStart(2,'0')}</span>
        )}
      </div>
      <div style={{ background:'rgba(255,255,255,.05)', borderRadius:4, height:5, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:zerou?'linear-gradient(90deg,#2a7a18,#4ad4a0)':'linear-gradient(90deg,#5040b0,#a080ff)', borderRadius:4, transition:'width 1s linear' }}/>
      </div>
    </div>
  )
}

// ─── Oferta NPC em anúncio ────────────────────────────────────────────────────
export function BotaoOfertaNPC({ anuncio, T, api, notify, sounds, onVendido }) {
  const [oferta, setOferta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  async function solicitar() {
    setLoading(true)
    const r = await api('/api/npc', { method:'POST', body: JSON.stringify({ action:'oferta_npc', anuncio_id: anuncio.id }) })
    setLoading(false)
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    setOferta(r)
  }

  async function aceitar() {
    setConfirmando(true)
    const r = await api('/api/npc', { method:'POST', body: JSON.stringify({ action:'aceitar_oferta_npc', anuncio_id: anuncio.id, valor: oferta.oferta }) })
    setConfirmando(false)
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    sounds?.coin()
    notify(`✓ Vendido ao NPC por $${oferta.oferta}! Aguarde addmoney do admin.`)
    setOferta(null)
    onVendido && onVendido()
  }

  if (oferta) return (
    <div style={{ background:'rgba(10,42,10,.4)', border:'1px solid #2a5a12', borderRadius:10, padding:12, marginTop:8 }}>
      <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Oferta do Frigorífico NPC:</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:'#4ad4a0', fontFamily:"'Playfair Display',serif" }}>${(oferta.oferta).toLocaleString('pt-BR')}</div>
          <div style={{ fontSize:10, color:T.textMuted }}>{oferta.desconto_pct}% abaixo do mercado · {oferta.quantidade} cab.</div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => setOferta(null)} style={{ padding:'6px 10px', background:'transparent', border:`1px solid ${T.border}`, color:T.textMuted, borderRadius:8, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>Recusar</button>
          <button onClick={aceitar} disabled={confirmando} style={{ padding:'6px 12px', background:'linear-gradient(135deg,#1a4a10,#2a7a18)', color:'#fff', border:'none', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {confirmando?'...':'✓ Aceitar'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <button onClick={solicitar} disabled={loading} style={{ padding:'6px 12px', background:'rgba(10,42,10,.3)', border:'1px solid #2a5a12', color:'#4ad4a0', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
      {loading ? '...' : '🤖 Pedir oferta NPC'}
    </button>
  )
}

// ─── Pastagem Page ────────────────────────────────────────────────────────────
export function PastagemPage({ T, user, api, notify, sounds }) {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alugando, setAlugando] = useState(null)
  const [abaAdmin, setAbaAdmin] = useState('campos') // 'campos' | 'faturas'

  const load = useCallback(async () => {
    setLoading(true)
    const [r, jogadores] = await Promise.all([
      api('/api/pastagem').catch(()=>({})),
      user?.role==='admin' ? api('/api/admin/usuarios').catch(()=>[]) : Promise.resolve([])
    ])
    setDados({ ...r, jogadores: Array.isArray(jogadores) ? jogadores.filter(u=>u.role==='jogador'&&u.status==='aprovado') : [] })
    setLoading(false)
  }, [user, api])

  useEffect(() => { load() }, [load])

  async function alugar(campo) {
    if (!user) return notify('Faça login primeiro!', 'danger')
    const r = await api('/api/pastagem', { method:'POST', body: JSON.stringify({ campo_id: campo.id }) })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    sounds?.success()
    notify(`✓ ${campo.nome} reservado! Pague $${fmt(campo.preco_semana)} ao admin para confirmar.`)
    setAlugando(null)
    load()
  }

  if (loading) return <div style={{textAlign:'center',padding:60,color:T.textMuted}}>Carregando...</div>

  const campos = dados?.campos || []
  const meus = dados?.meus || []
  const todos = dados?.todos || []
  const pendentes = todos.filter(a => a.status_pagamento === 'pendente')

  // ── FOTOS por campo_id ──────────────────────────────────────────────────────
  const FOTOS = {
    1:'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=600&q=80',
    2:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
    3:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80',
    4:'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=600&q=80',
    5:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
    6:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:24 }}>🌿</span>
            <div>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:T.text }}>Aluguel de Pasto</h1>
              <p style={{ fontSize:12, color:T.textMuted }}>Campos extras para rebanhos superlotados — 7 dias por contrato</p>
            </div>
          </div>
          {user?.role === 'admin' && (
            <div style={{ display:'flex', gap:8 }}>
              {['campos','faturas'].map(a => (
                <button key={a} onClick={()=>setAbaAdmin(a)} style={{
                  padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  background: abaAdmin===a ? T.gold : 'transparent',
                  color: abaAdmin===a ? '#fff' : T.textMuted,
                  border: `1px solid ${abaAdmin===a ? T.gold : T.border}`
                }}>
                  {a==='campos' ? '🗺 Campos' : `💰 Faturas ${pendentes.length>0?`(${pendentes.length} pend.)`:''}` }
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ABA FATURAS (admin) ────────────────────────────────────────────── */}
      {user?.role==='admin' && abaAdmin==='faturas' && (
        <div>
          {todos.length === 0 ? (
            <div style={{ textAlign:'center', padding:48, color:T.textMuted, fontSize:13 }}>Nenhum pasto alugado no momento.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {todos.map(a => {
                const campo = campos.find(c => c.id === a.campo_id)
                const pago = a.status_pagamento === 'pago'
                return (
                  <div key={a.id} style={{
                    background: T.card, border: `1px solid ${pago ? '#2a5a12' : '#6a3800'}`,
                    borderRadius:14, padding:'16px 20px',
                    display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12
                  }}>
                    <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                      <img src={FOTOS[a.campo_id]} alt="" style={{ width:56, height:56, borderRadius:10, objectFit:'cover', filter:'brightness(.7)' }} onError={e=>e.target.style.display='none'}/>
                      <div>
                        <div style={{ fontWeight:700, color:T.text, fontSize:14 }}>{a.campo_nome}</div>
                        <div style={{ fontSize:12, color:T.textMuted }}>{a.ha_alugado}ha · {a.jogador_nome}</div>
                        <div style={{ fontSize:11, color:T.textMuted }}>Vence: {new Date(a.valido_ate).toLocaleDateString('pt-BR')}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:18, fontWeight:800, color:'#6ab840', fontFamily:"'Playfair Display',serif" }}>${fmt(a.valor_semana||campo?.preco_semana||0)}</div>
                        <div style={{ fontSize:10, color:T.textMuted }}>por semana</div>
                      </div>
                      {pago ? (
                        <span style={{ background:'#0a2a1a', color:'#4ad4a0', border:'1px solid #1a6a4a', fontSize:11, padding:'4px 12px', borderRadius:20, fontWeight:600 }}>✓ Pago</span>
                      ) : (
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={async()=>{
                            await api('/api/pastagem',{method:'PATCH',body:JSON.stringify({action:'quitar',aluguel_id:a.id})})
                            sounds?.coin()
                            notify(`✓ ${a.jogador_nome} — pagamento confirmado!`)
                            load()
                          }} style={{ padding:'6px 14px', background:'linear-gradient(135deg,#1a4a10,#3a7a20)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                            ✓ Quitar
                          </button>
                          <button onClick={async()=>{
                            await api('/api/pastagem',{method:'PATCH',body:JSON.stringify({action:'desassociar',campo_id:a.campo_id})})
                            notify('Campo liberado.')
                            load()
                          }} style={{ padding:'6px 10px', background:'rgba(100,20,20,.3)', color:'#e06060', border:'1px solid #6a1818', borderRadius:8, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
                            Liberar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA CAMPOS ─────────────────────────────────────────────────────── */}
      {(user?.role !== 'admin' || abaAdmin === 'campos') && (<>

        {/* Meus aluguéis ativos (jogador) */}
        {meus.length > 0 && user?.role !== 'admin' && (
          <div style={{ background:T.card, border:'1px solid #2a5a12', borderRadius:14, padding:18, marginBottom:20 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:'#4ad4a0', marginBottom:12 }}>Seus pastos ativos</div>
            {meus.map(a => (
              <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                <div>
                  <div style={{ fontWeight:600, color:T.text }}>{a.campo_nome}</div>
                  <div style={{ fontSize:11, color:T.textMuted }}>{a.ha_alugado}ha · válido até {new Date(a.valido_ate).toLocaleDateString('pt-BR')}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <span style={{ color:'#6ab840', fontWeight:700, fontFamily:"'Playfair Display',serif" }}>${fmt(a.valor_semana||0)}</span>
                  <span style={{
                    fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600,
                    background: a.status_pagamento==='pago' ? '#0a2a1a' : '#3a1800',
                    color: a.status_pagamento==='pago' ? '#4ad4a0' : '#d08020',
                    border: `1px solid ${a.status_pagamento==='pago'?'#1a6a4a':'#6a3800'}`
                  }}>{a.status_pagamento==='pago' ? '✓ Pago' : '⏳ Pagamento pendente'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div style={{ background:'rgba(42,24,0,.3)', border:`1px solid ${T.border}`, borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:12, color:'#a08040', lineHeight:1.7 }}>
          💡 Reserve o campo e pague ao admin no servidor. Contrato: 7 dias. Capacidade: 3 bezerros/ha, 2 garrotes/ha, 1 boi/ha.
        </div>

        {/* Grid campos */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {campos.map(c => {
            const meuCampo = meus.find(a => a.campo_id === c.id)
            const borderColor = c.meu ? '#2a5a12' : c.ocupado ? T.border : '#2a3a18'
            return (
              <div key={c.id} style={{ background:T.card, border:`1px solid ${borderColor}`, borderRadius:16, overflow:'hidden', transition:'all .25s' }}
                onMouseEnter={e=>{if(!c.ocupado&&!c.meu)e.currentTarget.style.borderColor='#4a6a28'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=borderColor}}>
                <div style={{ height:150, overflow:'hidden', position:'relative', background:'#0a1208' }}>
                  <img src={FOTOS[c.id]} alt={c.nome} style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(.65)', transition:'transform .4s' }}
                    onMouseEnter={e=>e.target.style.transform='scale(1.06)'}
                    onMouseLeave={e=>e.target.style.transform='scale(1)'}
                    onError={e=>e.target.style.display='none'}/>
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.7),transparent 50%)' }}/>
                  <div style={{ position:'absolute', top:10, left:10, display:'flex', gap:6, flexWrap:'wrap' }}>
                    <span style={{ background:'rgba(10,18,8,.85)', border:'1px solid #2a4a18', color:'#6ab840', fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>{c.ha}ha</span>
                    {c.meu && <span style={{ background:'rgba(10,42,10,.9)', border:'1px solid #2a5a12', color:'#4ad4a0', fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>✓ Seu</span>}
                    {c.meu && c.meu_pagamento==='pendente' && <span style={{ background:'rgba(60,30,0,.9)', border:'1px solid #6a3800', color:'#d08020', fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>⏳ Pag. pendente</span>}
                    {c.meu && c.meu_pagamento==='pago' && <span style={{ background:'rgba(10,42,10,.9)', border:'1px solid #1a6a4a', color:'#4ad4a0', fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>✓ Pago</span>}
                    {c.ocupado && !c.meu && <span style={{ background:'rgba(42,10,10,.9)', border:'1px solid #6a1818', color:'#e06060', fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>Ocupado</span>}
                  </div>
                  <div style={{ position:'absolute', bottom:10, left:12, right:12 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#fff', fontFamily:"'Playfair Display',serif" }}>{c.nome}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.6)' }}>{c.regiao}</div>
                  </div>
                </div>
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                    {[['🐄',`${c.cap_bezerros} bzerr.`],['🐂',`${c.cap_garrotes} garr.`],['🐃',`${c.cap_bois} bois`]].map(([e,v])=>(
                      <div key={v} style={{ background:T.inputBg, borderRadius:8, padding:'6px 4px', textAlign:'center', border:`1px solid ${T.border}` }}>
                        <div style={{ fontSize:14 }}>{e}</div>
                        <div style={{ fontSize:10, color:T.textMuted }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:20, fontWeight:800, color:'#6ab840', fontFamily:"'Playfair Display',serif" }}>${fmt(c.preco_semana)}</div>
                      <div style={{ fontSize:10, color:T.textMuted }}>por semana</div>
                    </div>
                    {user?.role === 'admin' ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {c.ocupado && (
                          <div style={{ fontSize:11, color:T.textMuted, marginBottom:2 }}>
                            🔒 {c.inquilino}
                            {c.status_pagamento === 'pendente' && <span style={{ color:'#d08020', marginLeft:6 }}>⏳ pend.</span>}
                            {c.status_pagamento === 'pago' && <span style={{ color:'#4ad4a0', marginLeft:6 }}>✓ pago</span>}
                          </div>
                        )}
                        <select onChange={async e => {
                          if (!e.target.value) return
                          await api('/api/pastagem', { method:'PATCH', body: JSON.stringify({
                            action:'associar', campo_id: c.id,
                            jogador_id: e.target.value,
                            jogador_nome: e.target.options[e.target.selectedIndex].text
                          })})
                          notify(`✓ Campo associado! Fatura pendente gerada.`)
                          sounds?.success()
                          load()
                          e.target.value = ''
                        }} style={{ fontSize:11, padding:'5px 8px', background:T.inputBg, border:`1px solid ${T.border}`, borderRadius:8, color:T.text, cursor:'pointer', fontFamily:'inherit' }}>
                          <option value="">Associar jogador...</option>
                          {(dados?.jogadores||[]).map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                        </select>
                        {c.ocupado && (
                          <button onClick={async()=>{
                            await api('/api/pastagem',{method:'PATCH',body:JSON.stringify({action:'desassociar',campo_id:c.id})})
                            notify('Campo liberado.')
                            load()
                          }} style={{ padding:'4px 10px', background:'rgba(100,20,20,.4)', border:'1px solid #6a1818', color:'#e06060', borderRadius:8, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
                            Desassociar
                          </button>
                        )}
                      </div>
                    ) : c.meu ? (
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:11, color:'#4ad4a0', fontWeight:600 }}>Válido até {new Date(meuCampo?.valido_ate).toLocaleDateString('pt-BR')}</div>
                      </div>
                    ) : c.ocupado ? (
                      <div style={{ fontSize:12, color:T.textMuted, fontStyle:'italic' }}>🔒 {c.inquilino || 'Indisponível'}</div>
                    ) : (
                      <button onClick={()=>setAlugando(c)} style={{ padding:'8px 16px', background:'linear-gradient(135deg,#1a4a10,#3a7a20)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                        Reservar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </>)}

      {/* Modal confirmar aluguel */}
      {alugando && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
          <div style={{ background:T.card, border:'1px solid #2a5a12', borderRadius:20, padding:32, width:'100%', maxWidth:400, boxShadow:'0 30px 80px rgba(0,0,0,.5)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:T.text }}>🌿 Reservar pasto</h3>
              <button onClick={()=>setAlugando(null)} style={{ background:'none', border:'none', color:T.textMuted, fontSize:22, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ background:T.inputBg, borderRadius:12, padding:16, marginBottom:20, border:`1px solid ${T.border}` }}>
              {[
                ['Campo',      alugando.nome],
                ['Região',     alugando.regiao],
                ['Área',       `${alugando.ha} hectares`],
                ['Capacidade', `${alugando.cap_garrotes} garrotes / ${alugando.cap_bois} bois`],
                ['Duração',    '7 dias'],
                ['Valor',      `$${fmt(alugando.preco_semana)}`],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:8 }}>
                  <span style={{ color:T.textMuted }}>{l}</span>
                  <span style={{ fontWeight:l==='Valor'?800:400, color:l==='Valor'?'#6ab840':T.text, fontFamily:l==='Valor'?"'Playfair Display',serif":'inherit' }}>{v}</span>
                </div>
              ))}
              <div style={{ fontSize:11, color:'#a08040', marginTop:8, padding:'8px 0', borderTop:`1px solid ${T.border}` }}>
                ⚠ Após reservar, pague ao admin no servidor para ativar o contrato.
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setAlugando(null)} style={{ flex:1, padding:10, background:'transparent', border:`1px solid ${T.border2}`, color:T.textDim, borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
              <button onClick={()=>alugar(alugando)} style={{ flex:2, padding:10, background:'linear-gradient(135deg,#1a4a10,#3a7a20)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                ✓ Reservar campo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
