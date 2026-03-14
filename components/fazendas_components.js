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
    const donoUser = users?.find(u => u.id === editDono)
    const r = await api('/api/fazendas', {
      method: 'PATCH',
      body: JSON.stringify({
        id: fazenda.id,
        preco: editPreco || null,
        nome: editNome,
        dono_id: editDono || null,
        dono_nome: donoUser?.username || null,
        status: editDono ? 'ocupada' : 'disponivel'
      })
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

        {/* Admin Edit */}
        {user?.role === 'admin' && (
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
export function MinhaFazendaPage({ T, user, api, notify, lotes, mercado }) {
  const [fazendas, setFazendas] = useState([])
  const [selectedFaz, setSelectedFaz] = useState(null)
  const [fretes, setFretes] = useState([])
  const [custos, setCustos] = useState([])
  const [novoCusto, setNovoCusto] = useState({ tipo:'cerca', descricao:'', valor:'', prestador_nome:'' })
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    if (!user) return
    const token = localStorage.getItem('gvrpnl_token')
    const h = token ? { Authorization: `Bearer ${token}` } : {}
    const [fRes, frRes] = await Promise.all([
      fetch('/api/fazendas?minha=1', { headers: h }).then(r => r.json()),
      fetch(`/api/frete?jogador_id=${user.id}`, { headers: h }).then(r => r.json()),
    ])
    const f = fRes || []
    setFazendas(f)
    setFretes(frRes || [])
    if (f.length && !selectedFaz) setSelectedFaz(f[0])
    setLoading(false)
  }, [user, selectedFaz])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (!selectedFaz) return
    api(`/api/custos?fazenda_id=${selectedFaz.id}`).then(setCustos)
  }, [selectedFaz, api])

  const minhasLotes = (lotes||[]).filter(l => l.fazenda_id === selectedFaz?.id)
  const cap = selectedFaz ? calcCapacidade(minhasLotes, Number(selectedFaz.tamanho_ha)) : null
  const vaqueirosNec = Math.floor(minhasLotes.reduce((s,l)=>s+l.quantidade,0) / 60)
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
      <div style={{ marginBottom:28, paddingBottom:16, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
          <span style={{ fontSize:24 }}>🌾</span>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:T.text }}>Minha Fazenda</h1>
        </div>
        <p style={{ fontSize:13, color:T.textMuted, marginLeft:36 }}>Gestão da sua propriedade rural</p>
      </div>

      {/* Frete em andamento */}
      {fretes.filter(f => f.status === 'em_transito').map(fr => (
        <FreteTracker key={fr.id} frete={fr} T={T} onChegou={() => {
          notify('🐄 Seus bezerros chegaram!', 'success')
          api(`/api/frete`,{method:'PATCH',body:JSON.stringify({id:fr.id})})
          loadAll()
        }}/>
      ))}

      {/* Selector se tem mais de 1 fazenda */}
      {fazendas.length > 1 && (
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {fazendas.map(f => (
            <button key={f.id} onClick={() => setSelectedFaz(f)} style={{ padding:'7px 14px', borderRadius:10, border:`1px solid ${selectedFaz?.id===f.id?'#5030c0':T.border}`, background:selectedFaz?.id===f.id?'rgba(80,48,192,.2)':'transparent', color:selectedFaz?.id===f.id?'#a080ff':T.textMuted, fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:selectedFaz?.id===f.id?600:400 }}>
              {f.codigo} — {f.nome}
            </button>
          ))}
        </div>
      )}

      {selectedFaz && (
        <>
          {/* Foto hero da fazenda */}
          <div style={{ height:200, borderRadius:16, overflow:'hidden', marginBottom:20, position:'relative' }}>
            <img src={selectedFaz.foto_url} alt={selectedFaz.nome} style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(.7)' }} onError={e=>e.target.style.display='none'}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.8) 0%,transparent 50%)' }}/>
            <div style={{ position:'absolute', bottom:20, left:24 }}>
              <div style={{ fontSize:22, fontWeight:800, color:'#fff', fontFamily:"'Playfair Display',serif" }}>{selectedFaz.nome}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.7)' }}>Código {selectedFaz.codigo} · {selectedFaz.regiao} · {selectedFaz.tamanho_ha} ha</div>
            </div>
            {custosPend > 0 && (
              <div style={{ position:'absolute', top:16, right:16, background:'rgba(200,50,50,.9)', color:'#fff', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>
                ⚠ {custosPend} serviço(s) pendente(s)
              </div>
            )}
          </div>

          {/* Capacidade */}
          {cap && (
            <div style={{ background: cap.lotada ? 'rgba(42,10,10,.8)' : T.card, border:`1px solid ${cap.lotada?'#6a1818':T.border}`, borderRadius:14, padding:18, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, fontFamily:"'Playfair Display',serif" }}>Capacidade da fazenda</div>
                <span style={{ background: cap.lotada?'rgba(42,10,10,.9)':'rgba(10,42,26,.9)', border:`1px solid ${cap.lotada?'#6a1818':'#1a6a4a'}`, color:cap.lotada?'#e06060':'#4ad4a0', fontSize:11, padding:'3px 10px', borderRadius:10, fontWeight:600 }}>
                  {cap.lotada ? '⚠ Superlotada' : '✓ Normal'}
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted, marginBottom:8 }}>
                <span>Capacidade usada</span>
                <span style={{ fontWeight:600, color: cap.lotada?'#e06060':T.gold }}>{cap.usada} / {cap.total} ha equiv.</span>
              </div>
              <div style={{ background:T.border, borderRadius:6, height:10, overflow:'hidden', marginBottom:12 }}>
                <div style={{ width:`${cap.pct}%`, height:'100%', background: cap.lotada?'linear-gradient(90deg,#c84040,#e06060)':'linear-gradient(90deg,#4060d0,#8040c0)', borderRadius:6, transition:'width .6s ease' }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[['bezerro','🐄 Bezerros','info'],['garrote','🐄 Garrotes','warn'],['boi','🐄 Bois adultos','gold']].map(([f,l,c]) => {
                  const maxCap = Number(selectedFaz.tamanho_ha) * CAP_POR_HA[f]
                  const atual = minhasLotes.filter(lot=>lot.fase===f).reduce((s,lot)=>s+lot.quantidade,0)
                  return (
                    <div key={f} style={{ background:T.inputBg, borderRadius:10, padding:'10px 12px', border:`1px solid ${T.border}`, textAlign:'center' }}>
                      <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>{l}</div>
                      <div style={{ fontSize:16, fontWeight:700, color:atual>maxCap?'#e06060':T.text }}>{atual}</div>
                      <div style={{ fontSize:10, color:T.textMuted }}>máx {maxCap}</div>
                    </div>
                  )
                })}
              </div>
              {cap.lotada && (
                <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(200,64,64,.1)', borderRadius:10, border:'1px solid #6a1818', fontSize:12, color:'#e06060', lineHeight:1.6 }}>
                  ⚠ Sua fazenda está superlotada! À medida que o gado avança de fase, você precisará vender animais. Garrote suporta 2/ha e boi adulto apenas 1/ha.
                </div>
              )}
              {vaqueirosNec > 0 && (
                <div style={{ marginTop:10, padding:'10px 14px', background:'rgba(80,48,192,.1)', borderRadius:10, border:'1px solid #3020a0', fontSize:12, color:'#a080ff', lineHeight:1.6 }}>
                  👨‍🌾 Seu rebanho exige <strong>{vaqueirosNec} vaqueiro(s)</strong> contratado(s). Abra um chamado de serviço abaixo.
                </div>
              )}
            </div>
          )}

          {/* Lotes na fazenda */}
          {minhasLotes.length > 0 && (
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:16 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:T.text, marginBottom:14 }}>Rebanho nesta fazenda</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {minhasLotes.map(l => {
                  const cons = ({bezerro:3,garrote:5,boi:8,abatido:0}[l.fase]||0)*l.quantidade
                  const valorAbate = ((mercado?.precos?.abate||0)*l.quantidade)
                  return (
                    <div key={l.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:T.inputBg, borderRadius:10, border:`1px solid ${T.border}`, flexWrap:'wrap' }}>
                      <div style={{ flex:1 }}>
                        <span style={{ fontWeight:700, color:T.text, fontSize:13 }}>{l.codigo}</span>
                        <span style={{ color:T.textMuted, fontSize:12, marginLeft:8 }}>{l.quantidade} cab. · {l.fase}</span>
                      </div>
                      <div style={{ fontSize:12, color:T.textMuted }}>{cons > 0 ? `${cons}kg ração/dia` : ''}</div>
                      <div style={{ fontWeight:600, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(valorAbate)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Serviços/Custos */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:16 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:T.text, marginBottom:6 }}>Serviços da fazenda</div>
            <p style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>Abra chamados para serviços que precisam ser realizados. Selecione quem vai fazer, acerte os detalhes e marque como pago após o RP.</p>

            {/* Novo chamado */}
            <div style={{ background:T.inputBg, borderRadius:12, padding:16, marginBottom:16, border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:12 }}>Novo chamado de serviço</div>
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
        </>
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
  const valorTotal = Math.round(kgNum * precoRacao * 100) / 100

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
                      <span>{kgNum}kg × ${precoRacao}/kg</span>
                      <span style={{ fontWeight: 600 }}>${fmt(valorTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>
                      <span style={{ color: T.text }}>Total</span>
                      <span style={{ color: T.gold || '#c8922a' }}>${fmt(valorTotal)}</span>
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
        onUpdate && onUpdate()
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
    const iv = setInterval(() => api('/api/transportadora?tipo=disponiveis').then(f => setFretes(Array.isArray(f)?f:[])), 10000)
    return () => clearInterval(iv)
  }, [user, api])

  async function aceitarFrete() {
    if (!caminhaoSel) return notify('Selecione um caminhão!', 'danger')
    const r = await api('/api/transportadora', {
      method: 'POST',
      body: JSON.stringify({ frete_id: aceitando.id, caminhao_id: parseInt(caminhaoSel) })
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
              <FreteEmAndamento frete={f} T={T} onEntregue={() => { sounds?.coin(); load() }}/>
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
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['disponivel','🚛 Fretes disponíveis'],['garagem','🏚 Minha garagem'],['historico','📋 Histórico']].map(([v,l]) => (
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
              {fretes.map(f => (
                <div key={f.id} style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:14, padding:18, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                  <div style={{ fontSize:32 }}>🐄</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:"'Playfair Display',serif" }}>{f.quantidade} cabeças</div>
                    <div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>{f.origem} → {f.destino}</div>
                    <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>⏱ 1 hora de rota</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:22, fontWeight:800, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(f.valor)}</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>${10}/cab</div>
                  </div>
                  <button
                    onClick={() => { setAceitando(f); setCaminhaoSel(caminhoesLivres[0]?.id?.toString() || '') }}
                    disabled={caminhoesLivres.length === 0}
                    style={{ padding:'10px 20px', background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:caminhoesLivres.length>0?'pointer':'not-allowed', fontFamily:'inherit', opacity:caminhoesLivres.length>0?1:.5 }}
                  >
                    {caminhoesLivres.length > 0 ? 'Aceitar frete' : 'Sem caminhão livre'}
                  </button>
                </div>
              ))}
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
                <div key={c.id} style={{ background:T.card, border:`1px solid ${c.status==='disponivel'?T.border:'#3020a0'}`, borderRadius:14, padding:18 }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>🚛</div>
                  <div style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:"'Playfair Display',serif" }}>{c.modelo}</div>
                  <div style={{ fontSize:12, color:T.textMuted, marginBottom:8 }}>Placa {c.placa} · {c.capacidade} cab. máx</div>
                  <span style={{ background:c.status==='disponivel'?'rgba(10,42,10,.8)':'rgba(10,8,24,.8)', border:`1px solid ${c.status==='disponivel'?'#2a5a12':'#3020a0'}`, color:c.status==='disponivel'?'#4ad4a0':'#a080ff', fontSize:11, padding:'3px 10px', borderRadius:10, fontWeight:600 }}>
                    {c.status==='disponivel'?'✓ Disponível':'🚛 Em rota'}
                  </span>
                </div>
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
                <span style={{ fontWeight:700, color:T.text }}>{aceitando.quantidade} bezerros</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:8 }}>
                <span style={{ color:T.textMuted }}>Rota</span>
                <span style={{ color:T.textDim, fontSize:12 }}>{aceitando.origem} → {aceitando.destino}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:8 }}>
                <span style={{ color:T.textMuted }}>Duração</span>
                <span style={{ color:T.textDim }}>1 hora (30min + 30min)</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:18, fontWeight:800, fontFamily:"'Playfair Display',serif", paddingTop:8, borderTop:`1px solid ${T.border}` }}>
                <span style={{ color:T.text }}>Ganho</span>
                <span style={{ color:'#a080ff' }}>${fmt(aceitando.valor)}</span>
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
function FreteEmAndamento({ frete, T, onEntregue }) {
  const [fase, setFase] = useState('buscar')
  const [segundos, setSegundos] = useState(0)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    if (!frete) return
    const update = () => {
      const agora = Date.now()
      const chegaEm = new Date(frete.entrega_em || frete.chega_em).getTime()
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
        onEntregue && onEntregue()
      }
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [frete, onEntregue])

  const mins = Math.floor(segundos/60)
  const secs = segundos%60

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#7060a0', marginBottom:6 }}>
        <span>{fase==='buscar'?'🚛 Indo buscar o gado...':'🐄 Gado indo para fazenda...'}</span>
        <span style={{ color:'#a080ff', fontWeight:600 }}>{mins}:{String(secs).padStart(2,'0')}</span>
      </div>
      <div style={{ background:'rgba(255,255,255,.05)', borderRadius:4, height:6, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,#4060d0,#8040c0)', borderRadius:4, transition:'width 1s linear' }}/>
      </div>
    </div>
  )
}

// ─── Concessionaria Page ──────────────────────────────────────────────────────
export function ConcessionariaPage({ T, user, api, notify, sounds }) {
  const [modelos, setModelos] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [meusPedidos, setMeusPedidos] = useState([])
  const [comprovante, setComprovante] = useState('')
  const [modeloSel, setModeloSel] = useState(null)
  const [step, setStep] = useState(1)

  const load = useCallback(async () => {
    const m = await fetch('/api/concessionaria').then(r=>r.json())
    setModelos(Array.isArray(m)?m:[])
    if (user?.role === 'admin') {
      const p = await api('/api/concessionaria?tipo=pedidos')
      setPedidos(Array.isArray(p)?p:[])
    }
  }, [user, api])

  useEffect(() => { load() }, [load])

  async function comprarCaminhao() {
    if (!comprovante) return notify('Cole o comprovante!', 'danger')
    const r = await api('/api/concessionaria', {
      method: 'POST',
      body: JSON.stringify({ modelo_id: modeloSel.id, comprovante })
    })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    sounds?.coin()
    setStep(3); load()
  }

  const pedidosPend = pedidos.filter(p => p.status === 'pendente')

  return (
    <div>
      <div style={{ marginBottom:28, paddingBottom:16, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
          <span style={{ fontSize:24 }}>🏢</span>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:T.text }}>Concessionária</h1>
        </div>
        <p style={{ fontSize:13, color:T.textMuted, marginLeft:36 }}>Compre seu caminhão e entre no mercado de fretes</p>
      </div>

      {user?.role === 'admin' && pedidosPend.length > 0 && (
        <div style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:14, padding:18, marginBottom:20 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:T.text, marginBottom:14 }}>
            Pedidos pendentes <Badge type="amber">{pedidosPend.length}</Badge>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {pedidosPend.map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:T.inputBg, borderRadius:10, border:`1px solid ${T.border2}`, flexWrap:'wrap' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{p.jogador_nome}</div>
                  <div style={{ fontSize:12, color:T.textMuted }}>{p.modelo_nome} · ${fmt(p.valor)}</div>
                  {p.comprovante && <a href={p.comprovante} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#4a90d0' }}>Ver comprovante →</a>}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={async()=>{await api('/api/concessionaria',{method:'PATCH',body:JSON.stringify({id:p.id,status:'aprovado'})});sounds?.success();notify('✓ Caminhão entregue!');load()}} style={{ padding:'6px 14px', background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✓ Entregar</button>
                  <button onClick={async()=>{await api('/api/concessionaria',{method:'PATCH',body:JSON.stringify({id:p.id,status:'recusado'})});notify('Recusado.');load()}} style={{ padding:'6px 10px', background:'#3a0808', color:'#e06060', border:'1px solid #6a1818', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>✗</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 ? (
        <div style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:14, padding:48, textAlign:'center', maxWidth:480, margin:'0 auto' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🚛</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'#a080ff', marginBottom:10 }}>Pedido enviado!</h2>
          <p style={{ fontSize:14, color:T.textMuted, lineHeight:1.8, marginBottom:20 }}>O admin irá verificar seu comprovante e entregar o caminhão na sua garagem.</p>
          <button onClick={()=>{setStep(1);setModeloSel(null);setComprovante('')}} style={{ padding:'9px 20px', background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Ver outro modelo</button>
        </div>
      ) : step === 2 && modeloSel ? (
        <div style={{ maxWidth:480, margin:'0 auto' }}>
          <div style={{ background:T.card, border:'1px solid #3020a0', borderRadius:14, padding:24, marginBottom:16 }}>
            <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:40 }}>🚛</span>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:T.text }}>{modeloSel.modelo}</div>
                <div style={{ fontSize:12, color:T.textMuted }}>{modeloSel.capacidade} cabeças máx · ${fmt(modeloSel.preco)}</div>
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:8 }}>Link do comprovante (Discord)</label>
              <input value={comprovante} onChange={e=>setComprovante(e.target.value)} placeholder="https://discord.com/channels/..." style={{ width:'100%', background:T.inputBg, border:`1px solid ${T.border2}`, borderRadius:10, padding:'10px 14px', fontSize:13, color:T.text, fontFamily:'inherit', outline:'none' }}/>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setStep(1)} style={{ flex:1, padding:10, background:'transparent', border:`1px solid ${T.border2}`, color:T.textDim, borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Voltar</button>
              <button onClick={comprarCaminhao} style={{ flex:2, padding:10, background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Comprar — ${fmt(modeloSel.preco)}</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
          {modelos.map(m => (
            <div key={m.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:'hidden', transition:'all .25s', cursor:'pointer' }}
              onMouseEnter={e=>{e.currentTarget.style.border='1px solid #5030c0';e.currentTarget.style.transform='translateY(-4px)'}}
              onMouseLeave={e=>{e.currentTarget.style.border=`1px solid ${T.border}`;e.currentTarget.style.transform='translateY(0)'}}>
              <div style={{ height:160, overflow:'hidden', background:'#0a0808', position:'relative' }}>
                <img src={m.foto_url} alt={m.modelo} style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(.75)' }} onError={e=>e.target.style.display='none'}/>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.7),transparent 50%)' }}/>
                <div style={{ position:'absolute', bottom:10, left:14 }}>
                  <span style={{ background:'rgba(10,8,24,.85)', border:'1px solid #3020a0', color:'#a080ff', fontSize:11, padding:'3px 10px', borderRadius:10, fontWeight:600 }}>
                    🐄 {m.capacidade} cab. máx
                  </span>
                </div>
              </div>
              <div style={{ padding:'16px 18px' }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:T.text, marginBottom:4 }}>{m.modelo}</div>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:12, lineHeight:1.6 }}>{m.descricao}</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ fontSize:22, fontWeight:800, color:'#a080ff', fontFamily:"'Playfair Display',serif" }}>${fmt(m.preco)}</div>
                  <button onClick={()=>{setModeloSel(m);setStep(2)}} style={{ padding:'8px 16px', background:'linear-gradient(135deg,#3020a0,#6030c0)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Comprar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Badge({ type, children }) {
  const s = { amber:['#3a2000','#e09030','#6a3800'], ok:['#0a2010','#4ad4a0','#1a5a30'] }[type]||['#2a2018','#9a8060','#4a3020']
  return <span style={{ background:s[0], color:s[1], border:`1px solid ${s[2]}`, fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600, marginLeft:8 }}>{children}</span>
}
