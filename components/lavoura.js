import { useState, useEffect } from 'react'
import { Card, Btn, Badge, Metric, Alrt } from './ui'
import { sounds as defaultSounds } from '../lib/sounds'
import { fmt } from '../lib/theme'

// ─── Config ───────────────────────────────────────────────────────────────────
const CULTURAS = {
  milho: { icon:'🌽', nome:'Milho',  custo:1100, ciclo:7, cor:'#f5c542', receita:1430, gera:'ração',      geraLabel:'kg de ração',       geraMulti:477 },
  soja:  { icon:'🫘', nome:'Soja',   custo:1300, ciclo:7, cor:'#4ade80', receita:1690, gera:'dinheiro',   geraLabel:'em dinheiro',        geraMulti:1690 },
  capim: { icon:'🌿', nome:'Capim',  custo:500,  ciclo:7, cor:'#86efac', receita:null, gera:'capacidade', geraLabel:'ha de capacidade',   geraMulti:1.5  },
}

const TIPOS_MAQUINA = ['trator','plantadeira','colheitadeira']
const TIPO_LABEL = { trator:'Trator', plantadeira:'Plantadeira', colheitadeira:'Colheitadeira' }
const TIPO_ICON  = { trator:'🚜', plantadeira:'🌱', colheitadeira:'⚙️' }
const CAP_MARCA  = { Valtra:30, 'John Deere':70, Fendt:150 }

// ─── Mock data (só usado pelo admin até a API existir) ────────────────────────
const _now = Date.now()
const MOCK_GARAGEM = [
  { id:1, tipo:'trator',        marca:'Valtra', nome:'Valtra A110',  img:'/Valtra.jpg' },
  { id:2, tipo:'plantadeira',   marca:'Valtra', nome:'Valtra SP-20', img:'/Valtra.jpg' },
  { id:3, tipo:'colheitadeira', marca:'Valtra', nome:'Valtra CH-50', img:'/Valtra.jpg' },
]
const MOCK_CAMPOS = [
  { id:1, cultura:'milho', area_ha:20, plantado_em:new Date(_now - 3*24*3600*1000).toISOString(), ciclo_dias:7, custo_total:22000, status:'crescendo', resultado:null },
  { id:2, cultura:'soja',  area_ha:10, plantado_em:new Date(_now - 7.5*24*3600*1000).toISOString(), ciclo_dias:7, custo_total:13000, status:'pronto',    resultado:null },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcPct(campo) {
  const start = new Date(campo.plantado_em).getTime()
  const total = campo.ciclo_dias * 24 * 3600 * 1000
  return Math.min(100, Math.max(0, ((Date.now() - start) / total) * 100))
}
function tempoRestante(campo) {
  const end = new Date(campo.plantado_em).getTime() + campo.ciclo_dias * 24 * 3600 * 1000
  const diff = end - Date.now()
  if (diff <= 0) return 'Pronto!'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h restantes`
  if (h > 0) return `${h}h ${m}m restantes`
  return `${m}m restantes`
}
function resultadoColheita(campo) {
  const cfg = CULTURAS[campo.cultura]
  if (campo.cultura === 'capim')    return `+${(campo.area_ha * cfg.geraMulti).toFixed(1)} ${cfg.geraLabel}`
  if (campo.cultura === 'milho')    return `${fmt(campo.area_ha * cfg.geraMulti)} ${cfg.geraLabel}`
  return `$${fmt(campo.area_ha * cfg.geraMulti)} ${cfg.geraLabel}`
}

// ─── LavouraPage — entry point ────────────────────────────────────────────────
export function LavouraPage({ T, user, api, notify, sounds: snd = defaultSounds }) {
  if (user?.role !== 'admin') return <LavouraTeaser T={T} />
  return <LavouraAdmin T={T} user={user} api={api} notify={notify} snd={snd} />
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEASER — visão pública (não-admin)
// ═══════════════════════════════════════════════════════════════════════════════
function LavouraTeaser({ T }) {
  return (
    <div style={{animation:'fadeSlideIn .35s ease',maxWidth:900,margin:'0 auto'}}>
      {/* Hero */}
      <div style={{textAlign:'center',padding:'40px 20px 32px',marginBottom:8}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(74,222,128,.08)',border:'1px solid rgba(74,222,128,.25)',borderRadius:20,padding:'5px 16px',marginBottom:20}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',animation:'blinkDot 1.2s step-end infinite'}}/>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:2,color:'#4ade80',fontFamily:'var(--font-data)'}}>EM DESENVOLVIMENTO</span>
        </div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:48,fontWeight:800,color:'#eaddcf',lineHeight:1.1,marginBottom:14}}>Sistema de<br/><span style={{color:'#4ade80'}}>Lavoura</span></h1>
        <p style={{fontSize:15,color:'#a6968a',maxWidth:540,margin:'0 auto 28px',lineHeight:1.8}}>Plante, cultive e colha. Três culturas, equipamentos reais de grandes marcas e uma economia viva — tudo controlado por você, sem admin.</p>
        <div style={{display:'inline-flex',alignItems:'center',gap:24,background:'#1e1612',border:'1px solid #36251e',borderRadius:10,padding:'14px 28px'}}>
          {[['🌱','Plante suas culturas'],['⏱','Gerencie o tempo'],['💰','Colha seus lucros']].map(([ic,lb])=>(
            <div key={lb} style={{textAlign:'center'}}>
              <div style={{fontSize:22,marginBottom:4}}>{ic}</div>
              <div style={{fontSize:10,color:'#5c4a42',fontFamily:'var(--font-data)',letterSpacing:1,whiteSpace:'nowrap'}}>{lb}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Loop */}
      <div style={{background:'#1e1612',border:'1px solid #36251e',borderRadius:10,padding:'20px 24px',marginBottom:14}}>
        <div style={{fontSize:10,letterSpacing:2,color:'#5c4a42',textTransform:'uppercase',marginBottom:16,fontFamily:'var(--font-data)'}}>O ciclo de produção</div>
        <div style={{display:'flex',alignItems:'center',gap:0,overflowX:'auto',paddingBottom:4}}>
          {[
            {icon:'🚜',title:'Arar',sub:'Trator prepara\no solo',color:'#c28c46'},
            {icon:'🌾',title:'Plantar',sub:'Custo por ha\njá incluso',color:'#a6968a'},
            {icon:'🌤',title:'Crescer',sub:'7 dias\nautomático',color:'#4ade80'},
            {icon:'✅',title:'Pronto',sub:'Cultura\nmadura',color:'#4ade80'},
            {icon:'⚙️',title:'Colher',sub:'Colheitadeira\nem campo',color:'#c28c46'},
            {icon:'💵',title:'Receber',sub:'Ração ou\ndinheiro',color:'#4ade80'},
          ].map((s,i,arr)=>(
            <div key={s.title} style={{display:'flex',alignItems:'center',flexShrink:0}}>
              <div style={{textAlign:'center',minWidth:88,padding:'12px 8px',background:'#130d0a',border:`1px solid ${s.color}33`,borderRadius:8}}>
                <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:s.color,fontFamily:'var(--font-data)',marginBottom:2}}>{s.title}</div>
                <div style={{fontSize:9,color:'#5c4a42',whiteSpace:'pre-line',lineHeight:1.4,fontFamily:'var(--font-data)'}}>{s.sub}</div>
              </div>
              {i<arr.length-1&&<div style={{fontSize:14,color:'#36251e',margin:'0 4px',flexShrink:0}}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Equipamentos */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,letterSpacing:2,color:'#5c4a42',textTransform:'uppercase',marginBottom:12,fontFamily:'var(--font-data)'}}>Concessionária — Equipamentos</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:10}}>
          {[
            {brand:'Valtra',     img:'/Valtra.jpg',    color:'#c0392b',badge:'ENTRADA',      cap:30,  items:['A110 — Trator ($28k)','SP-20 — Plantadeira ($20k)','CH-50 — Colheitadeira ($52k)'], desc:'Confiável e acessível. Ideal para começar.'},
            {brand:'John Deere', img:'/Johndeere.jpg', color:'#27ae60',badge:'INTERMEDIÁRIO',cap:70,  items:['5090E — Trator ($65k)','7000 Precision — Plantadeira ($45k)','S660i — Colheitadeira ($90k)'], desc:'O padrão do mercado. Velocidade e eficiência.'},
            {brand:'Fendt',      img:'/fendt.jpg',     color:'#2d6a4f',badge:'PREMIUM',      cap:150, items:['Fendt 828 — Trator ($110k)','Fendt Momentum — Plantadeira ($80k)','Fendt IDEAL 9 — Colheitadeira ($145k)'], desc:'Alta performance. O topo do agronegócio mundial.'},
          ].map(b=>(
            <div key={b.brand} style={{background:'#1e1612',border:`1px solid ${b.color}44`,borderTop:`3px solid ${b.color}`,borderRadius:8,overflow:'hidden'}}>
              <div style={{height:150,overflow:'hidden',position:'relative',background:'#0a0706'}}>
                <img src={b.img} alt={b.brand} style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.55) saturate(.85)',display:'block',transition:'filter .3s'}} onMouseEnter={e=>e.target.style.filter='brightness(.8) saturate(1)'} onMouseLeave={e=>e.target.style.filter='brightness(.55) saturate(.85)'} onError={e=>e.target.style.display='none'}/>
                <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(30,22,18,.95) 0%,rgba(30,22,18,.1) 60%,transparent 100%)'}}/>
                <span style={{position:'absolute',top:10,right:10,fontSize:8,fontWeight:800,letterSpacing:1.5,background:`${b.color}cc`,color:'#fff',padding:'3px 8px',borderRadius:4,fontFamily:'var(--font-data)'}}>{b.badge}</span>
                <span style={{position:'absolute',bottom:10,left:12,fontSize:10,fontWeight:700,color:'#eaddcf',fontFamily:'var(--font-data)',background:'rgba(0,0,0,.5)',padding:'2px 8px',borderRadius:4}}>até {b.cap} ha</span>
              </div>
              <div style={{padding:'14px 16px 18px'}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:'#eaddcf',marginBottom:6}}>{b.brand}</div>
                <div style={{fontSize:11,color:'#a6968a',marginBottom:12,lineHeight:1.6}}>{b.desc}</div>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {b.items.map(it=>(
                    <div key={it} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'#a6968a',fontFamily:'var(--font-data)',background:'#130d0a',borderRadius:5,padding:'6px 10px',border:`1px solid ${b.color}22`}}>
                      <div style={{width:4,height:4,borderRadius:'50%',background:b.color,flexShrink:0}}/>
                      {it}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Culturas */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10,marginBottom:14}}>
        {[
          {icon:'🌽',name:'Milho', ciclo:'7 dias',custo:'$1.100/ha',receita:'$1.430/ha',lucro:'$330/ha',use:'→ Ração automática',    cor:'#f5c542',detalhe:'Ciclo rápido. Ideal para quem tem gado.'},
          {icon:'🫘',name:'Soja',  ciclo:'7 dias',custo:'$1.300/ha',receita:'$1.690/ha',lucro:'$390/ha',use:'→ Addmoney puro',       cor:'#4ade80',detalhe:'Maior lucro por ciclo em dinheiro real.'},
          {icon:'🌿',name:'Capim', ciclo:'7 dias',custo:'$500/ha',  receita:'Capacidade',lucro:'+1,5 ha',use:'→ Expande seu pasto',   cor:'#86efac',detalhe:'Não gera dinheiro — expande a fazenda.'},
        ].map(c=>(
          <div key={c.name} style={{background:'#1e1612',border:'1px solid #36251e',borderTop:`2px solid ${c.cor}`,borderRadius:8,padding:'16px 14px'}}>
            <div style={{fontSize:26,marginBottom:8}}>{c.icon}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:'#eaddcf',marginBottom:4}}>{c.name}</div>
            <div style={{fontSize:10,color:'#5c4a42',marginBottom:12,fontFamily:'var(--font-data)',lineHeight:1.6}}>{c.detalhe}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:8}}>
              {[['Ciclo',c.ciclo],['Custo',c.custo],['Receita',c.receita],['Lucro',c.lucro]].map(([k,v])=>(
                <div key={k} style={{background:'#130d0a',borderRadius:4,padding:'6px 8px'}}>
                  <div style={{fontSize:8,color:'#5c4a42',letterSpacing:1,fontFamily:'var(--font-data)'}}>{k.toUpperCase()}</div>
                  <div style={{fontSize:11,fontWeight:700,color:k==='Lucro'?c.cor:'#eaddcf',fontFamily:'var(--font-data)'}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:10,fontWeight:700,color:c.cor,fontFamily:'var(--font-data)',letterSpacing:0.5}}>{c.use}</div>
          </div>
        ))}
      </div>

      {/* Meta econômica */}
      <div style={{background:'rgba(74,222,128,.04)',border:'1px solid rgba(74,222,128,.2)',borderRadius:10,padding:'20px 24px',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          <span style={{fontSize:16}}>📊</span>
          <div style={{fontSize:14,fontWeight:700,color:'#eaddcf',fontFamily:"'Playfair Display',serif"}}>Meta econômica do sistema</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10}}>
          {[
            {label:'Área referência',value:'70 ha milho',color:'#4ade80'},
            {label:'Investimento/ciclo',value:'~$77k',color:'#c28c46'},
            {label:'Receita/ciclo',value:'~$100k',color:'#4ade80'},
            {label:'Margem alvo',value:'~30%',color:'#4ade80'},
            {label:'Prazo de retorno',value:'1 semana',color:'#a6968a'},
          ].map(m=>(
            <div key={m.label} style={{background:'#130d0a',border:'1px solid #36251e',borderRadius:6,padding:'12px 14px'}}>
              <div style={{fontSize:8,color:'#5c4a42',letterSpacing:2,textTransform:'uppercase',fontFamily:'var(--font-data)',marginBottom:4}}>{m.label}</div>
              <div style={{fontSize:16,fontWeight:700,color:m.color,fontFamily:'var(--font-data)'}}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{textAlign:'center',padding:'20px 0 40px',fontSize:11,color:'#5c4a42',fontFamily:'var(--font-data)',letterSpacing:1}}>
        SISTEMA EM CONSTRUÇÃO — FIQUE DE OLHO NAS ATUALIZAÇÕES
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL — interativo (mockado)
// ═══════════════════════════════════════════════════════════════════════════════
function LavouraAdmin({ T, user, api, notify, snd }) {
  const [garagem,  setGaragem]  = useState(MOCK_GARAGEM)
  const [campos,   setCampos]   = useState(MOCK_CAMPOS)
  const [cultura,  setCultura]  = useState('milho')
  const [haInput,  setHaInput]  = useState(10)
  const [tick,     setTick]     = useState(0)    // força re-render para atualizar barras
  const [colhendo, setColhendo] = useState(null) // id do campo sendo colhido (animação)

  // Atualiza barras de progresso a cada 30s
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(iv)
  }, [])

  // ─ Capacidade calculada pela melhor máquina de cada tipo ─
  const temTrator      = garagem.some(m => m.tipo === 'trator')
  const temPlantadeira = garagem.some(m => m.tipo === 'plantadeira')
  const temColheitadeira = garagem.some(m => m.tipo === 'colheitadeira')
  const podePlantar    = temTrator && temPlantadeira
  const podeColher     = temColheitadeira

  const melhorMarca = (tipo) => {
    const marcas = garagem.filter(m => m.tipo === tipo).map(m => m.marca)
    if (marcas.includes('Fendt'))       return 'Fendt'
    if (marcas.includes('John Deere'))  return 'John Deere'
    if (marcas.includes('Valtra'))      return 'Valtra'
    return null
  }
  const marcaTrator     = melhorMarca('trator')
  const marcaPlantadeira = melhorMarca('plantadeira')
  const capTotal        = marcaTrator && marcaPlantadeira
    ? Math.min(CAP_MARCA[marcaTrator] || 0, CAP_MARCA[marcaPlantadeira] || 0)
    : 0

  const haUsados    = campos.filter(c => c.status !== 'colhido').reduce((s, c) => s + c.area_ha, 0)
  const haDisponivel = Math.max(0, capTotal - haUsados)

  const cfg = CULTURAS[cultura]
  const custoTotal  = haInput * cfg.custo
  const receitaTotal = cfg.receita ? haInput * cfg.receita : null
  const lucroTotal  = receitaTotal ? receitaTotal - custoTotal : null

  // ─ Ação: Plantar ─
  function plantar() {
    if (!podePlantar) return
    if (haInput > haDisponivel || haInput < 1) return
    snd.success()
    const novo = {
      id: Date.now(), cultura, area_ha: haInput,
      plantado_em: new Date().toISOString(),
      ciclo_dias: cfg.ciclo, custo_total: custoTotal,
      status: 'crescendo', resultado: null,
    }
    setCampos(prev => [...prev, novo])
    notify(`🌱 Plantio iniciado! ${haInput} ha de ${cfg.nome} — colheita em ${cfg.ciclo} dias`, 'success')
    setHaInput(Math.min(10, haDisponivel - haInput))
  }

  // ─ Ação: Colher ─
  function colher(campoId) {
    if (!podeColher) return
    setColhendo(campoId)
    snd.coin()
    setTimeout(() => {
      setCampos(prev => prev.map(c => {
        if (c.id !== campoId) return c
        const res = resultadoColheita(c)
        notify(`✅ Colheita concluída! ${res}`, 'success')
        return { ...c, status: 'colhido', resultado: res }
      }))
      setColhendo(null)
    }, 900)
  }

  // ─ Ação: Remover campo colhido ─
  function limpar(campoId) {
    setCampos(prev => prev.filter(c => c.id !== campoId))
  }

  const camposAtivos  = campos.filter(c => c.status !== 'colhido')
  const camposColhidos = campos.filter(c => c.status === 'colhido')

  return (
    <div style={{animation:'fadeSlideIn .35s ease',maxWidth:1000,margin:'0 auto'}}>

      {/* ── Header ── */}
      <div style={{marginBottom:20,paddingBottom:14,borderBottom:'1px solid var(--border)',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <span style={{fontSize:18}}>🌱</span>
            <h1 style={{fontFamily:'var(--font-disp)',fontSize:28,letterSpacing:1,color:'var(--ice)',fontWeight:700,lineHeight:1}}>Lavoura <span style={{color:'var(--gold)'}}>/ Painel Admin</span></h1>
          </div>
          <p style={{fontSize:11,color:'var(--ice3)',letterSpacing:0.5,fontFamily:'var(--font-data)',marginTop:4}}>Modo de teste — dados mockados. A API real será integrada futuramente.</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#c28c46',animation:'blinkDot 1.2s step-end infinite'}}/>
          <span style={{fontSize:11,color:'#c28c46',fontWeight:700,letterSpacing:1,fontFamily:'var(--font-data)'}}>MODO TESTE</span>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:20}}>
        {[
          { label:'Capacidade total', value:`${capTotal} ha`,      color: capTotal > 0 ? 'var(--grn)' : 'var(--red)',   sub: marcaTrator || 'sem trator' },
          { label:'Ha em uso',        value:`${haUsados} ha`,      color:'var(--rust)',  sub:`de ${capTotal} disponíveis` },
          { label:'Ha livre',         value:`${haDisponivel} ha`,  color: haDisponivel > 0 ? 'var(--grn)' : 'var(--ice2)', sub:'para novo plantio' },
          { label:'Campos ativos',    value:camposAtivos.length,   color:'var(--gold)',  sub:'crescendo agora' },
        ].map(m => (
          <div key={m.label} style={{background:'var(--input-bg)',border:'1px solid var(--border)',borderTop:`2px solid ${m.color}`,borderRadius:6,padding:'14px 16px',boxShadow:'0 2px 10px rgba(0,0,0,.4)'}}>
            <div style={{fontSize:9,color:'var(--ice3)',marginBottom:6,textTransform:'uppercase',letterSpacing:2,fontWeight:500,fontFamily:'var(--font-data)'}}>{m.label}</div>
            <div style={{fontSize:22,fontWeight:700,color:m.color,fontFamily:'var(--font-data)',lineHeight:1}}>{m.value}</div>
            {m.sub && <div style={{fontSize:10,color:'var(--ice3)',marginTop:4,letterSpacing:1,fontFamily:'var(--font-data)'}}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Garagem ── */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'20px',marginBottom:16,boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--ice)',fontFamily:'var(--font-disp)'}}>🏚️ Garagem</div>
          <div style={{fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)',letterSpacing:1}}>
            {podePlantar ? <span style={{color:'var(--grn)'}}>✓ Pode Plantar</span> : <span style={{color:'var(--red)'}}>Precisa de Trator + Plantadeira</span>}
            &nbsp;·&nbsp;
            {podeColher  ? <span style={{color:'var(--grn)'}}>✓ Pode Colher</span>  : <span style={{color:'var(--red)'}}>Sem Colheitadeira</span>}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
          {TIPOS_MAQUINA.map(tipo => {
            const maquinas = garagem.filter(m => m.tipo === tipo)
            const tem = maquinas.length > 0
            const m   = maquinas[0]
            const cor = tipo === 'trator' ? '#c0392b' : tipo === 'plantadeira' ? '#2d6a4f' : '#27ae60'
            return (
              <div key={tipo} style={{
                background: tem ? 'rgba(74,222,128,.04)' : 'var(--input-bg)',
                border: `1px solid ${tem ? 'rgba(74,222,128,.25)' : 'var(--border)'}`,
                borderTop: `3px solid ${tem ? '#4ade80' : 'var(--border2)'}`,
                borderRadius: 8, padding: '14px 16px',
                transition: 'all .2s ease',
              }}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <span style={{fontSize:20}}>{TIPO_ICON[tipo]}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:tem?'var(--ice)':'var(--ice3)',fontFamily:'var(--font-data)'}}>{TIPO_LABEL[tipo]}</div>
                    {tem && m.marca && <div style={{fontSize:9,color:cor,letterSpacing:1,fontFamily:'var(--font-data)',fontWeight:700,marginTop:1}}>{m.marca.toUpperCase()}</div>}
                  </div>
                  <div style={{marginLeft:'auto'}}>
                    <span style={{fontSize:8,fontWeight:700,letterSpacing:1,background:tem?'rgba(74,222,128,.15)':'rgba(248,113,113,.12)',color:tem?'#4ade80':'#f87171',border:`1px solid ${tem?'rgba(74,222,128,.3)':'rgba(248,113,113,.3)'}`,padding:'2px 6px',borderRadius:4,fontFamily:'var(--font-data)'}}>{tem?'POSSUÍDO':'SEM'}</span>
                  </div>
                </div>
                {tem ? (
                  <div>
                    <div style={{fontSize:11,color:'var(--ice)',fontWeight:600,fontFamily:'var(--font-data)',marginBottom:4}}>{m.nome}</div>
                    <div style={{fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)'}}>
                      Capacidade: <span style={{color:'#4ade80',fontWeight:700}}>{CAP_MARCA[m.marca] || '?'} ha</span>
                    </div>
                  </div>
                ) : (
                  <div style={{fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)',lineHeight:1.6}}>
                    Compre na <span style={{color:'var(--gold)'}}>Concessionária</span><br/>Valtra · John Deere · Fendt
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:14,marginBottom:16,alignItems:'start'}}>

        {/* ── Campos Ativos ── */}
        <div>
          <div style={{fontSize:10,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:10,fontFamily:'var(--font-data)'}}>Campos em andamento</div>
          {camposAtivos.length === 0 && (
            <div style={{background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:8,padding:'28px 20px',textAlign:'center',color:'var(--ice3)',fontSize:12,fontFamily:'var(--font-data)'}}>
              Nenhum campo ativo. Plante algo! 🌱
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {camposAtivos.map(campo => {
              const pct     = campo.status === 'pronto' ? 100 : calcPct(campo)
              const pronto  = pct >= 100 || campo.status === 'pronto'
              const cfg     = CULTURAS[campo.cultura]
              const isCol   = colhendo === campo.id

              return (
                <div key={campo.id} style={{
                  background:'var(--card)',
                  border:`1px solid ${pronto ? `${cfg.cor}55` : 'var(--border)'}`,
                  borderLeft:`3px solid ${pronto ? cfg.cor : 'var(--border2)'}`,
                  borderRadius:8, padding:'16px',
                  transition:'all .3s ease',
                  boxShadow: pronto ? `0 4px 20px ${cfg.cor}18` : '0 2px 10px rgba(0,0,0,.3)',
                }}>
                  {/* Cabeçalho do campo */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:22}}>{cfg.icon}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'var(--ice)',fontFamily:'var(--font-data)'}}>{cfg.nome}</div>
                        <div style={{fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)'}}>{campo.area_ha} ha · custo ${fmt(campo.custo_total)}</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize:8,fontWeight:800,letterSpacing:1.2,padding:'3px 8px',borderRadius:4,
                      fontFamily:'var(--font-data)',
                      background: pronto ? `${cfg.cor}22` : 'rgba(194,140,70,.12)',
                      color:      pronto ? cfg.cor           : 'var(--gold)',
                      border:     `1px solid ${pronto ? `${cfg.cor}44` : 'rgba(194,140,70,.3)'}`,
                    }}>{pronto ? '✓ PRONTO' : 'CRESCENDO'}</span>
                  </div>

                  {/* Barra de progresso */}
                  <div style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)',marginBottom:5}}>
                      <span>{pronto ? 'Pronto para colher!' : tempoRestante(campo)}</span>
                      <span style={{color:pronto?cfg.cor:'var(--ice2)',fontWeight:700}}>{pct.toFixed(0)}%</span>
                    </div>
                    <div style={{background:'var(--input-bg)',height:7,borderRadius:4,overflow:'hidden'}}>
                      <div style={{
                        width:`${pct}%`, height:'100%',
                        background: pronto
                          ? `linear-gradient(90deg, ${cfg.cor}, ${cfg.cor}aa)`
                          : `linear-gradient(90deg, var(--gold), ${cfg.cor}66)`,
                        borderRadius:4,
                        transition:'width 1s ease',
                        boxShadow: pronto ? `0 0 8px ${cfg.cor}66` : 'none',
                      }}/>
                    </div>
                  </div>

                  {/* Retorno esperado */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:pronto?12:0}}>
                    <div style={{fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)'}}>
                      Retorno esperado: <span style={{color:cfg.cor,fontWeight:700}}>
                        {campo.cultura === 'capim'
                          ? `+${(campo.area_ha * 1.5).toFixed(1)} ha`
                          : campo.cultura === 'milho'
                            ? `${fmt(campo.area_ha * CULTURAS.milho.geraMulti)} kg ração`
                            : `$${fmt(campo.area_ha * CULTURAS.soja.receita)}`
                        }
                      </span>
                    </div>
                    {cfg.receita && (
                      <div style={{fontSize:10,color:'#4ade80',fontFamily:'var(--font-data)',fontWeight:700}}>
                        +${fmt(campo.area_ha * (cfg.receita - cfg.custo))} lucro
                      </div>
                    )}
                  </div>

                  {/* Botão Colher */}
                  {pronto && (
                    <button
                      onClick={() => colher(campo.id)}
                      disabled={!podeColher || isCol}
                      style={{
                        width:'100%', padding:'10px', border:'none', borderRadius:7,
                        fontFamily:'var(--font-data)', fontSize:12, fontWeight:700,
                        letterSpacing:0.5, cursor: podeColher ? 'pointer' : 'not-allowed',
                        background: isCol
                          ? 'rgba(194,140,70,.2)'
                          : podeColher
                            ? `linear-gradient(135deg, ${cfg.cor}33, ${cfg.cor}22)`
                            : 'rgba(248,113,113,.08)',
                        color: isCol ? 'var(--gold)' : podeColher ? cfg.cor : 'var(--red)',
                        border: `1px solid ${isCol ? 'var(--gold)' : podeColher ? `${cfg.cor}55` : 'rgba(248,113,113,.3)'}`,
                        transition:'all .2s ease',
                        opacity: !podeColher ? 0.7 : 1,
                        transform: isCol ? 'scale(.98)' : 'scale(1)',
                      }}
                      onMouseEnter={e => { if (podeColher && !isCol) { e.currentTarget.style.background = `${cfg.cor}33`; e.currentTarget.style.boxShadow = `0 4px 16px ${cfg.cor}22` }}}
                      onMouseLeave={e => { e.currentTarget.style.background = podeColher ? `linear-gradient(135deg, ${cfg.cor}33, ${cfg.cor}22)` : 'rgba(248,113,113,.08)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      {isCol
                        ? '⚙️ Colheitadeira em operação...'
                        : podeColher
                          ? `⚙️ Colher ${cfg.nome} — ${campo.area_ha} ha`
                          : '🔒 Compre uma Colheitadeira para colher'
                      }
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Campos colhidos (histórico) */}
          {camposColhidos.length > 0 && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:9,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:8,fontFamily:'var(--font-data)'}}>Colhidos recentemente</div>
              {camposColhidos.map(campo => {
                const cfg = CULTURAS[campo.cultura]
                return (
                  <div key={campo.id} style={{
                    background:'rgba(74,222,128,.04)',border:'1px solid rgba(74,222,128,.2)',
                    borderRadius:8,padding:'12px 14px',marginBottom:8,
                    display:'flex',alignItems:'center',gap:10,
                    animation:'fadeSlideIn .4s ease',
                  }}>
                    <span style={{fontSize:18}}>{cfg.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--ice)',fontFamily:'var(--font-data)'}}>{cfg.nome} · {campo.area_ha} ha</div>
                      <div style={{fontSize:11,color:'#4ade80',fontFamily:'var(--font-data)',fontWeight:700,marginTop:2}}>✓ {campo.resultado}</div>
                    </div>
                    <button onClick={() => limpar(campo.id)} style={{background:'none',border:'none',color:'var(--ice3)',cursor:'pointer',fontSize:16,padding:'2px 6px',borderRadius:4,transition:'color .15s'}} onMouseEnter={e=>e.target.style.color='var(--red)'} onMouseLeave={e=>e.target.style.color='var(--ice3)'}>×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Plantar ── */}
        <div>
          <div style={{fontSize:10,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:10,fontFamily:'var(--font-data)'}}>Novo plantio</div>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderLeft:'3px solid var(--gold)',borderRadius:10,padding:'20px',boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>

            {!podePlantar && (
              <div style={{background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.25)',borderRadius:6,padding:'10px 12px',marginBottom:14,fontSize:11,color:'#f87171',fontFamily:'var(--font-data)',lineHeight:1.6}}>
                🔒 Você precisa de um <strong>Trator</strong> e uma <strong>Plantadeira</strong> para plantar.
                Visite a <span style={{color:'var(--gold)'}}>Concessionária</span>.
              </div>
            )}
            {haDisponivel === 0 && podePlantar && (
              <div style={{background:'rgba(194,140,70,.08)',border:'1px solid rgba(194,140,70,.25)',borderRadius:6,padding:'10px 12px',marginBottom:14,fontSize:11,color:'var(--gold)',fontFamily:'var(--font-data)'}}>
                ⚠ Capacidade máxima em uso ({capTotal} ha). Colha antes de plantar mais.
              </div>
            )}

            {/* Seletor de cultura */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:'var(--ice3)',fontWeight:500,textTransform:'uppercase',letterSpacing:2,fontFamily:'var(--font-data)',marginBottom:8}}>Cultura</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                {Object.entries(CULTURAS).map(([key, c]) => (
                  <button key={key} onClick={() => setCultura(key)} style={{
                    background: cultura === key ? `${c.cor}22` : 'var(--input-bg)',
                    border: `1px solid ${cultura === key ? c.cor : 'var(--border2)'}`,
                    borderRadius:8,padding:'10px 6px',cursor:'pointer',
                    display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                    transition:'all .2s ease',
                    transform: cultura === key ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: cultura === key ? `0 4px 12px ${c.cor}22` : 'none',
                  }}>
                    <span style={{fontSize:20}}>{c.icon}</span>
                    <span style={{fontSize:10,fontWeight:700,color:cultura===key?c.cor:'var(--ice3)',fontFamily:'var(--font-data)'}}>{c.nome}</span>
                    <span style={{fontSize:9,color:'var(--ice3)',fontFamily:'var(--font-data)'}}>${fmt(c.custo)}/ha</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantidade de hectares */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:'var(--ice3)',fontWeight:500,textTransform:'uppercase',letterSpacing:2,fontFamily:'var(--font-data)',marginBottom:8}}>
                Área — máx {haDisponivel} ha disponível
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <button onClick={() => setHaInput(Math.max(1, haInput - 1))} style={{width:38,height:38,borderRadius:8,background:'var(--input-bg)',border:'1px solid var(--border2)',color:'var(--ice)',fontSize:18,cursor:'pointer',fontWeight:700,transition:'all .15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--gold)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}>−</button>
                <input
                  type="number" min={1} max={haDisponivel} value={haInput}
                  onChange={e => setHaInput(Math.max(1, Math.min(haDisponivel, parseInt(e.target.value)||1)))}
                  style={{flex:1,textAlign:'center',background:'var(--input-bg)',border:'1px solid var(--border2)',borderRadius:8,padding:'8px',fontSize:20,color:'var(--ice)',fontFamily:'var(--font-data)',fontWeight:700,outline:'none',transition:'border-color .2s'}}
                  onFocus={e=>{e.target.style.borderColor='var(--gold)';e.target.style.boxShadow='0 0 0 3px rgba(194,140,70,.12)'}}
                  onBlur={e=>{e.target.style.borderColor='var(--border2)';e.target.style.boxShadow='none'}}
                />
                <button onClick={() => setHaInput(Math.min(haDisponivel, haInput + 1))} style={{width:38,height:38,borderRadius:8,background:'var(--input-bg)',border:'1px solid var(--border2)',color:'var(--ice)',fontSize:18,cursor:'pointer',fontWeight:700,transition:'all .15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--gold)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}>+</button>
                <button onClick={() => setHaInput(haDisponivel)} style={{padding:'8px 10px',borderRadius:8,background:'var(--input-bg)',border:'1px solid var(--border2)',color:'var(--ice3)',fontSize:10,cursor:'pointer',fontFamily:'var(--font-data)',fontWeight:700,letterSpacing:0.5,transition:'all .15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.color='var(--gold)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--ice3)'}}>MAX</button>
              </div>
            </div>

            {/* Preview de custo / retorno */}
            <div style={{background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:8,padding:'14px',marginBottom:16}}>
              <div style={{fontSize:9,color:'var(--ice3)',letterSpacing:2,fontFamily:'var(--font-data)',marginBottom:10}}>SIMULAÇÃO</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[
                  {label:'Custo total',     val:`$${fmt(custoTotal)}`,           color:'var(--red)'},
                  {label:'Ciclo',           val:`${cfg.ciclo} dias`,              color:'var(--ice)'},
                  {label:'Retorno',
                    val: cfg.gera === 'capacidade'
                      ? `+${(haInput * 1.5).toFixed(1)} ha`
                      : cfg.gera === 'ração'
                        ? `${fmt(haInput * cfg.geraMulti)} kg`
                        : `$${fmt(haInput * cfg.receita)}`,
                    color: cfg.cor
                  },
                  {label:'Lucro',
                    val: lucroTotal !== null ? `$${fmt(lucroTotal)}` : '—',
                    color: lucroTotal > 0 ? '#4ade80' : 'var(--ice3)'
                  },
                ].map(r => (
                  <div key={r.label} style={{background:'var(--card)',borderRadius:6,padding:'8px 10px'}}>
                    <div style={{fontSize:8,color:'var(--ice3)',letterSpacing:1,fontFamily:'var(--font-data)',marginBottom:3}}>{r.label.toUpperCase()}</div>
                    <div style={{fontSize:14,fontWeight:700,color:r.color,fontFamily:'var(--font-data)'}}>{r.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão Plantar */}
            <button
              onClick={plantar}
              disabled={!podePlantar || haInput < 1 || haInput > haDisponivel}
              style={{
                width:'100%', padding:'13px', borderRadius:8,
                background: podePlantar && haInput > 0 && haInput <= haDisponivel
                  ? `linear-gradient(135deg, ${cfg.cor}33, ${cfg.cor}22)`
                  : 'var(--input-bg)',
                border: `1px solid ${podePlantar && haInput > 0 ? `${cfg.cor}55` : 'var(--border2)'}`,
                color:   podePlantar && haInput > 0 && haInput <= haDisponivel ? cfg.cor : 'var(--ice3)',
                fontSize:13, fontWeight:700, letterSpacing:0.5,
                cursor:  podePlantar && haInput > 0 && haInput <= haDisponivel ? 'pointer' : 'not-allowed',
                fontFamily:'var(--font-data)',
                transition:'all .2s ease',
              }}
              onMouseEnter={e => { if (podePlantar && haInput > 0 && haInput <= haDisponivel) { e.currentTarget.style.background = `${cfg.cor}33`; e.currentTarget.style.boxShadow = `0 6px 20px ${cfg.cor}22`; e.currentTarget.style.transform = 'translateY(-1px)' }}}
              onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${cfg.cor}33, ${cfg.cor}22)`; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {cfg.icon} Plantar {haInput} ha de {cfg.nome} — ${fmt(custoTotal)}
            </button>
          </div>
        </div>
      </div>

      {/* ── Referência de culturas ── */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 20px',marginBottom:8}}>
        <div style={{fontSize:10,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:12,fontFamily:'var(--font-data)'}}>Tabela de culturas — ciclo 7 dias</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:8}}>
          {Object.entries(CULTURAS).map(([key, c]) => (
            <div key={key} style={{background:'var(--input-bg)',border:'1px solid var(--border)',borderTop:`2px solid ${c.cor}`,borderRadius:7,padding:'12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                <span style={{fontSize:18}}>{c.icon}</span>
                <span style={{fontSize:13,fontWeight:700,color:'var(--ice)',fontFamily:'var(--font-data)'}}>{c.nome}</span>
              </div>
              {[
                ['Custo/ha', `$${fmt(c.custo)}`,   'var(--ice3)'],
                ['Receita/ha', c.receita ? `$${fmt(c.receita)}` : `+${1.5} ha`, c.cor],
                ['Margem', c.receita ? `${(((c.receita-c.custo)/c.receita)*100).toFixed(0)}%` : '—', '#4ade80'],
                ['Gera', c.gera, c.cor],
              ].map(([k,v,cor]) => (
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)'}}>{k}</span>
                  <span style={{fontSize:10,fontWeight:700,color:cor,fontFamily:'var(--font-data)'}}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
