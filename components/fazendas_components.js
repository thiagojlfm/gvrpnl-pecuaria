import { useState, useEffect, useCallback } from 'react'

const fmt = n => Number(n||0).toLocaleString('pt-BR')
const CAP_POR_HA = { bezerro: 3, garrote: 2, boi: 1, abatido: 1 }
const TIPOS_CUSTO = [
  { tipo:'cerca', label:'Reforma de Cerca', emoji:'🪨' },
  { tipo:'vacina', label:'Vacinação', emoji:'💉' },
  { tipo:'pasto', label:'Limpeza de Pasto', emoji:'🌿' },
  { tipo:'bebedouro', label:'Reparo de Bebedouro', emoji:'💧' },
  { tipo:'vaqueiro', label:'Vaqueiro', emoji:'👨‍🌾' },
  { tipo:'veterinario', label:'Veterinário', emoji:'🩺' },
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
  const tamanhoLabel = fazenda.tamanho_ha >= 100 ? 'Grande' : fazenda.tamanho_ha >= 50 ? 'Médio' : 'Pequena'

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
            🐄 até {fazenda.tamanho_ha * 3} bezerros
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

  const cap = detalhe ? calcCapacidade(detalhe.lotes, fazenda.tamanho_ha) : null

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
                  <div style={{ fontWeight:600, color:T.text }}>{fazenda.tamanho_ha * CAP_POR_HA[f]}</div>
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
          { label:'Hectares totais', value:fmt(fazendas.reduce((s,f)=>s+f.tamanho_ha,0)), icon:'📐', color:T.gold },
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
  const cap = selectedFaz ? calcCapacidade(minhasLotes, selectedFaz.tamanho_ha) : null
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
                  const maxCap = selectedFaz.tamanho_ha * CAP_POR_HA[f]
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
