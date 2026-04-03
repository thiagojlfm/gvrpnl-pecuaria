import { useState, useEffect, useCallback } from 'react'
import { sounds as defaultSounds } from '../lib/sounds'
import { fmt } from '../lib/theme'

// ─── Constantes ───────────────────────────────────────────────────────────────
const _h = 3600000, _d = 86400000

const CULTURAS = {
  milho: { icon:'🌽', nome:'Milho',  img:'/milho.jpg',  custo:1100, ciclo:7,  cor:'#f5c542', tipo:'colheita' },
  soja:  { icon:'🫘', nome:'Soja',   img:'/soja.jpg',   custo:1300, ciclo:7,  cor:'#4ade80', tipo:'colheita' },
  capim: { icon:'🌿', nome:'Capim',  img:'/capim.jpg',  custo:500,  ciclo:14, cor:'#86efac', tipo:'pasto'    },
}

const CLIMAS = {
  ideal:  { icon:'☀️',  label:'Ideal',   cor:'#f5c542', prob:0.15, mult:1.20, diasExtra:0, capimMult:1.8 },
  normal: { icon:'🌤️', label:'Normal',  cor:'#4ade80', prob:0.35, mult:1.00, diasExtra:0, capimMult:1.5 },
  chuva:  { icon:'🌧️', label:'Chuva',   cor:'#7ab0e0', prob:0.20, mult:1.00, diasExtra:2, capimMult:1.5 },
  seca:   { icon:'🌵',  label:'Seca',    cor:'#c28c46', prob:0.15, mult:0.75, diasExtra:0, capimMult:1.0 },
  granizo:{ icon:'🌪️', label:'Granizo', cor:'#f87171', prob:0.10, mult:0.50, diasExtra:0, capimMult:0.7 },
  praga:  { icon:'🐛',  label:'Praga',   cor:'#9060e0', prob:0.05, mult:0.60, diasExtra:0, capimMult:0.9 },
}

const CAP_MARCA = { Valtra:30, 'John Deere':70, Fendt:150 } // ha/dia
const RECEITA_BASE = { milho:1650, soja:2000 } // $/ha normal
const PRECO_RACAO = 2 // $/kg para calc economia capim

// ─── Pipelines por cultura ────────────────────────────────────────────────────
const PIPELINE = {
  milho: ['arando','plantando','crescendo','pronto','colhendo','colhido'],
  soja:  ['arando','plantando','crescendo','pronto','colhendo','colhido'],
  capim: ['arando','plantando','crescendo','pronto_capim','liberado'],
}
const STAGE_INFO = {
  arando:       { icon:'🚜', label:'Arando',   cor:'#c28c46' },
  plantando:    { icon:'🌱', label:'Plantando', cor:'#c28c46' },
  crescendo:    { icon:'🌤️', label:'Crescendo', cor:'#4ade80' },
  pronto:       { icon:'✅', label:'Pronto',    cor:'#4ade80' },
  pronto_capim: { icon:'✅', label:'Pronto',    cor:'#86efac' },
  colhendo:     { icon:'⚙️', label:'Colhendo',  cor:'#c28c46' },
  colhido:      { icon:'💰', label:'Colhido',   cor:'#4ade80' },
  liberado:     { icon:'🌿', label:'Pasto ativo', cor:'#86efac' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const durMs = (ha, marca) => (ha / (CAP_MARCA[marca] || 30)) * 24 * _h
const calcPct = (ini, fim) => {
  if (!ini || !fim) return 0
  const total = new Date(fim) - new Date(ini)
  return Math.min(100, Math.max(0, (Date.now() - new Date(ini)) / total * 100))
}
const tempoStr = fim => {
  if (!fim) return '—'
  const diff = new Date(fim) - Date.now()
  if (diff <= 0) return 'Concluído'
  const d = Math.floor(diff/_d), h = Math.floor((diff%_d)/_h), m = Math.floor((diff%_h)/60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
const sortearClima = () => {
  const roll = Math.random()
  let acc = 0
  for (const [key, c] of Object.entries(CLIMAS)) {
    acc += c.prob
    if (roll < acc) return key
  }
  return 'normal'
}
function calcReceita(campo) {
  const cfg = CULTURAS[campo.cultura]
  const cli = CLIMAS[campo.clima || 'normal']
  if (cfg.tipo === 'colheita') {
    const base = RECEITA_BASE[campo.cultura] || 0
    return Math.round(campo.area_ha * base * cli.mult)
  }
  // capim: ha de pasto gerado
  return parseFloat((campo.area_ha * cli.capimMult).toFixed(1))
}
function calcLucro(campo) {
  const cfg = CULTURAS[campo.cultura]
  if (cfg.tipo !== 'colheita') return null
  return calcReceita(campo) - campo.custo_total
}
function stageIndex(status, cultura) {
  return (PIPELINE[cultura] || []).indexOf(status)
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const _n = Date.now()
function makeCampo(id, cultura, ha, status, opts = {}) {
  return { id, cultura, area_ha:ha, marca_maquina:'Valtra', status, custo_total:ha*CULTURAS[cultura].custo, resultado:null, clima:null, ...opts }
}
const MOCK_GARAGEM = [
  { id:1, tipo:'trator',        marca:'John Deere', nome:'John Deere 6M'   },
  { id:2, tipo:'plantadeira',   marca:'John Deere', nome:'John Deere DB60' },
  { id:3, tipo:'colheitadeira', marca:'Fendt',      nome:'Fendt IDEAL 9T'  },
  { id:4, tipo:'trator',        marca:'Valtra',     nome:'Valtra A110'     },
]
const MOCK_CAMPOS = [
  makeCampo(1,'milho',20,'arando',{
    marca_maquina: 'John Deere',
    inicio_op: new Date(_n - 4*_h).toISOString(),
    fim_op:    new Date(_n + 3*_h).toISOString(), // 70 ha/dia → ~7h p/ 20ha
  }),
  makeCampo(2,'soja',10,'crescendo',{
    marca_maquina: 'Fendt',
    inicio_op: new Date(_n - 3*_d).toISOString(),
    fim_op:    new Date(_n + 4*_d).toISOString(),
    clima: 'ideal',
  }),
  makeCampo(3,'milho',15,'pronto',{ marca_maquina:'John Deere', clima:'granizo' }),
  makeCampo(4,'capim',30,'crescendo',{
    marca_maquina: 'Valtra',
    inicio_op: new Date(_n - 5*_d).toISOString(),
    fim_op:    new Date(_n + 9*_d).toISOString(),
  }),
  makeCampo(5,'capim',20,'liberado',{
    marca_maquina: 'Valtra',
    clima:'normal',
    inicio_pasto: new Date(_n - 12*_d).toISOString(),
    fim_pasto:    new Date(_n + 18*_d).toISOString(),
  }),
]

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════
export function LavouraPage({ T, user, api, notify, sounds: snd = defaultSounds }) {
  if (user?.role !== 'admin') return <LavouraTeaser />
  return <LavouraAdmin notify={notify} snd={snd} />
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEASER — visão pública
// ═══════════════════════════════════════════════════════════════════════════════
function LavouraTeaser() {
  return (
    <div style={{animation:'fadeSlideIn .35s ease',maxWidth:900,margin:'0 auto'}}>
      <div style={{textAlign:'center',padding:'40px 20px 32px'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(74,222,128,.08)',border:'1px solid rgba(74,222,128,.25)',borderRadius:20,padding:'5px 16px',marginBottom:20}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',animation:'blinkDot 1.2s step-end infinite'}}/>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:2,color:'#4ade80',fontFamily:'var(--font-data)'}}>EM DESENVOLVIMENTO</span>
        </div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:48,fontWeight:800,color:'var(--ice)',lineHeight:1.1,marginBottom:14}}>
          Sistema de<br/><span style={{color:'#4ade80'}}>Lavoura</span>
        </h1>
        <p style={{fontSize:15,color:'var(--ice2)',maxWidth:540,margin:'0 auto 32px',lineHeight:1.8}}>
          Plante milho, soja e capim com maquinário real. Gerencie o tempo, enfrente o clima e colha os lucros.
        </p>
      </div>

      {/* Pipeline visual */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'20px 24px',marginBottom:14}}>
        <div style={{fontSize:10,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:16,fontFamily:'var(--font-data)'}}>Ciclo de produção</div>
        <div style={{display:'flex',alignItems:'center',overflowX:'auto',gap:0,paddingBottom:4}}>
          {[
            {icon:'🚜',t:'Arar',s:'Trator prepara\no solo',c:'#c28c46'},
            {icon:'🌱',t:'Plantar',s:'Plantadeira\nem campo',c:'#c28c46'},
            {icon:'🌤️',t:'Crescer',s:'7 ou 14 dias\nautomático',c:'#4ade80'},
            {icon:'🎲',t:'Clima',s:'Admin revela\no resultado',c:'#7ab0e0'},
            {icon:'⚙️',t:'Colher',s:'Colheitadeira\nem campo',c:'#f5c542'},
            {icon:'💰',t:'Receber',s:'Ração, dinheiro\nou pasto',c:'#4ade80'},
          ].map((s,i,arr)=>(
            <div key={s.t} style={{display:'flex',alignItems:'center',flexShrink:0}}>
              <div style={{textAlign:'center',minWidth:88,padding:'12px 8px',background:'var(--input-bg)',border:`1px solid ${s.c}33`,borderRadius:8}}>
                <div style={{fontSize:22,marginBottom:5}}>{s.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:s.c,fontFamily:'var(--font-data)',marginBottom:2}}>{s.t}</div>
                <div style={{fontSize:9,color:'var(--ice3)',whiteSpace:'pre-line',lineHeight:1.4,fontFamily:'var(--font-data)'}}>{s.s}</div>
              </div>
              {i<arr.length-1&&<div style={{fontSize:12,color:'var(--border2)',margin:'0 4px',flexShrink:0}}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Cards de culturas */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12,marginBottom:14}}>
        {Object.entries(CULTURAS).map(([key, c])=>(
          <div key={key} style={{background:'var(--card)',border:'1px solid var(--border)',borderTop:`3px solid ${c.cor}`,borderRadius:8,overflow:'hidden'}}>
            <div style={{height:140,overflow:'hidden',position:'relative',background:'#0a0706'}}>
              <img src={c.img} alt={c.nome} style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.55) saturate(.8)',transition:'filter .3s'}} onMouseEnter={e=>e.target.style.filter='brightness(.75) saturate(1)'} onMouseLeave={e=>e.target.style.filter='brightness(.55) saturate(.8)'} onError={e=>e.target.style.display='none'}/>
              <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(21,15,12,.9) 0%,transparent 60%)'}}/>
              <div style={{position:'absolute',bottom:10,left:12,fontSize:22}}>{c.icon}</div>
              <div style={{position:'absolute',top:10,right:10,fontSize:9,fontWeight:800,letterSpacing:1.5,background:`${c.cor}cc`,color:'#000',padding:'3px 8px',borderRadius:4,fontFamily:'var(--font-data)'}}>{c.ciclo}D</div>
            </div>
            <div style={{padding:'14px 14px 16px'}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:800,color:'var(--ice)',marginBottom:8}}>{c.nome}</div>
              {key !== 'capim' ? (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  {[['Custo',`$${fmt(c.custo)}/ha`,'var(--red)'],['Normal',`$${fmt(RECEITA_BASE[key])}/ha`,c.cor],['Ideal ☀️',`$${fmt(Math.round(RECEITA_BASE[key]*1.2))}/ha`,'#f5c542'],['Granizo 🌪️',`$${fmt(Math.round(RECEITA_BASE[key]*.5))}/ha`,'#f87171']].map(([k,v,cor])=>(
                    <div key={k} style={{background:'var(--input-bg)',borderRadius:4,padding:'6px 8px'}}>
                      <div style={{fontSize:8,color:'var(--ice3)',fontFamily:'var(--font-data)',letterSpacing:1}}>{k.toUpperCase()}</div>
                      <div style={{fontSize:12,fontWeight:700,color:cor,fontFamily:'var(--font-data)'}}>{v}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{fontSize:12,color:'var(--ice2)',lineHeight:1.7}}>
                  Após 14 dias cria <span style={{color:c.cor,fontWeight:700}}>pasto ativo por 30 dias</span>.<br/>
                  Cada ha suporta 1,5 cabeças pastando gratuitamente,<br/>
                  reduzindo consumo de ração comprada.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Marcas */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'20px',marginBottom:14}}>
        <div style={{fontSize:10,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:14,fontFamily:'var(--font-data)'}}>Maquinário — capacidade por dia</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
          {[
            {marca:'Valtra',     img:'/Valtra.jpg',    cor:'#c0392b', cap:30,  tier:'Entrada',      preco:'$28k–$52k'},
            {marca:'John Deere', img:'/Johndeere.jpg', cor:'#27ae60', cap:70,  tier:'Intermediário', preco:'$45k–$90k'},
            {marca:'Fendt',      img:'/fendt.jpg',     cor:'#2d6a4f', cap:150, tier:'Premium',       preco:'$80k–$145k'},
          ].map(b=>(
            <div key={b.marca} style={{background:'var(--input-bg)',border:`1px solid ${b.cor}44`,borderTop:`2px solid ${b.cor}`,borderRadius:8,overflow:'hidden'}}>
              <div style={{height:80,overflow:'hidden',position:'relative'}}>
                <img src={b.img} alt={b.marca} style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.5)',display:'block'}} onError={e=>e.target.style.display='none'}/>
                <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(21,15,12,.8),transparent)'}}/>
              </div>
              <div style={{padding:'10px 12px'}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:800,color:'var(--ice)',marginBottom:4}}>{b.marca}</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,fontWeight:700,color:b.cor,fontFamily:'var(--font-data)'}}>{b.cap} ha/dia</span>
                  <span style={{fontSize:9,color:'var(--ice3)',fontFamily:'var(--font-data)'}}>{b.preco}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{textAlign:'center',padding:'16px 0 40px',fontSize:11,color:'var(--ice3)',fontFamily:'var(--font-data)',letterSpacing:1}}>
        SISTEMA EM CONSTRUÇÃO — FIQUE DE OLHO NAS ATUALIZAÇÕES
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function LavouraAdmin({ notify, snd }) {
  const [garagem,  setGaragem] = useState(MOCK_GARAGEM)
  const [campos,   setCampos]  = useState(MOCK_CAMPOS)
  const [cultura,  setCultura] = useState('milho')
  const [haInput,  setHaInput] = useState(10)
  const [tick,     setTick]    = useState(0)
  const [sortando, setSortando]= useState(null) // id do campo sendo sortado

  // Tick a cada 30s para atualizar barras e auto-avançar status
  useEffect(() => {
    const iv = setInterval(() => {
      setTick(t => t + 1)
      setCampos(prev => prev.map(campo => {
        const now = Date.now()
        if (!campo.fim_op) return campo
        if (now < new Date(campo.fim_op).getTime()) return campo
        // Auto-avança quando o timer da operação atual acaba
        if (campo.status === 'arando') {
          const durPlant = durMs(campo.area_ha, campo.marca_maquina)
          return { ...campo, status:'plantando', inicio_op: new Date().toISOString(), fim_op: new Date(now + durPlant).toISOString() }
        }
        if (campo.status === 'plantando') {
          const cicloMs = CULTURAS[campo.cultura].ciclo * _d
          return { ...campo, status:'crescendo', inicio_op: new Date().toISOString(), fim_op: new Date(now + cicloMs).toISOString() }
        }
        if (campo.status === 'crescendo') {
          return { ...campo, status: campo.cultura === 'capim' ? 'pronto_capim' : 'pronto', fim_op: null }
        }
        if (campo.status === 'colhendo') {
          const receita = calcReceita(campo)
          const lucro   = calcLucro(campo)
          const cfg     = CULTURAS[campo.cultura]
          const res = cfg.tipo === 'colheita'
            ? `$${fmt(receita)} recebidos${lucro < 0 ? ' ⚠️ PREJUÍZO' : ''}`
            : `${receita} ha de pasto criados`
          notify(`✅ Colheita concluída! ${CLIMAS[campo.clima||'normal'].icon} ${res}`, lucro < 0 ? 'warn' : 'success')
          snd.coin()
          return { ...campo, status:'colhido', resultado:res, fim_op:null }
        }
        return campo
      }))
    }, 30000)
    return () => clearInterval(iv)
  }, [])

  // ─ Garagem helpers ─
  const temTipo    = tipo => garagem.some(m => m.tipo === tipo)
  const marcaTipo  = tipo => {
    const m = garagem.find(g => g.tipo === tipo)
    return m?.marca || null
  }
  const podePlantar     = temTipo('trator') && temTipo('plantadeira')
  const podeColher      = temTipo('colheitadeira')
  const marcaTrator     = marcaTipo('trator')
  const marcaPlant      = marcaTipo('plantadeira')
  const marcaColh       = marcaTipo('colheitadeira')
  const capTotal        = podePlantar
    ? Math.min(CAP_MARCA[marcaTrator]||0, CAP_MARCA[marcaPlant]||0)
    : 0
  const haUsados        = campos.filter(c => !['colhido','liberado','esgotado'].includes(c.status)).reduce((s,c)=>s+c.area_ha,0)
  const haDisponivel    = Math.max(0, capTotal - haUsados)
  const pastosAtivos    = campos.filter(c => c.status === 'liberado')
  const haPasto         = pastosAtivos.reduce((s,c)=>{
    const cli = CLIMAS[c.clima||'normal']
    return s + c.area_ha * cli.capimMult
  }, 0)
  const cabecasPasto    = Math.floor(haPasto * 1.5)
  const economiaDia     = Math.round(cabecasPasto * 8 * PRECO_RACAO)

  const cfg = CULTURAS[cultura]
  const custoPreview    = haInput * cfg.custo
  const receitaPreview  = cfg.tipo === 'colheita' ? haInput * RECEITA_BASE[cultura] : null
  const lucroPreview    = receitaPreview ? receitaPreview - custoPreview : null

  // ─ Ações ─
  function plantar() {
    if (!podePlantar || haInput < 1 || haInput > haDisponivel) return
    snd.success()
    const durArar = durMs(haInput, marcaTrator)
    const now     = Date.now()
    const novo = {
      id: now, cultura, area_ha:haInput, marca_maquina: marcaTrator,
      status:'arando', custo_total: haInput * cfg.custo,
      inicio_op: new Date(now).toISOString(),
      fim_op:    new Date(now + durArar).toISOString(),
      clima:null, resultado:null,
    }
    setCampos(prev => [...prev, novo])
    notify(`🚜 Arando ${haInput} ha de ${cfg.nome} — ${tempoStr(novo.fim_op)} para concluir`, 'info')
    setHaInput(Math.min(10, haDisponivel - haInput))
  }

  function iniciarColheita(campoId) {
    if (!podeColher) return
    snd.click && snd.click()
    const durColh = durMs(campos.find(c=>c.id===campoId)?.area_ha || 0, marcaColh)
    const now     = Date.now()
    setCampos(prev => prev.map(c => c.id !== campoId ? c : {
      ...c, status:'colhendo',
      inicio_op: new Date(now).toISOString(),
      fim_op:    new Date(now + durColh).toISOString(),
    }))
    notify(`⚙️ Colheitadeira em campo — ${tempoStr(new Date(now + durColh).toISOString())} para concluir`, 'info')
  }

  function liberarCapim(campoId) {
    snd.success()
    const now = Date.now()
    setCampos(prev => prev.map(c => c.id !== campoId ? c : {
      ...c, status:'liberado',
      inicio_pasto: new Date(now).toISOString(),
      fim_pasto:    new Date(now + 30*_d).toISOString(),
    }))
    notify(`🌿 Pasto liberado! Ativo por 30 dias.`, 'success')
  }

  function revelarClima(campoId) {
    const clima = sortearClima()
    setSortando(campoId)
    setTimeout(() => {
      setCampos(prev => prev.map(c => c.id !== campoId ? c : { ...c, clima }))
      setSortando(null)
      const cl = CLIMAS[clima]
      notify(`${cl.icon} Clima revelado: ${cl.label} — ${cl.mult < 1 ? cl.mult*100-100+'%' : cl.mult > 1 ? '+'+Math.round((cl.mult-1)*100)+'%' : 'sem alteração'} na produção`, clima === 'granizo' || clima === 'praga' ? 'warn' : 'success')
      if (clima === 'ideal') snd.success()
      else snd.click && snd.click()
    }, 1200)
  }

  function limparCampo(campoId) {
    setCampos(prev => prev.filter(c => c.id !== campoId))
  }

  const camposAtivos  = campos.filter(c => !['colhido'].includes(c.status))
  const camposColhidos = campos.filter(c => c.status === 'colhido')

  return (
    <div style={{animation:'fadeSlideIn .35s ease',maxWidth:1040,margin:'0 auto'}}>

      {/* ── Header ── */}
      <div style={{marginBottom:20,paddingBottom:14,borderBottom:'1px solid var(--border)',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <span style={{fontSize:18}}>🌱</span>
            <h1 style={{fontFamily:'var(--font-disp)',fontSize:28,letterSpacing:1,color:'var(--ice)',fontWeight:700,lineHeight:1}}>
              Lavoura <span style={{color:'var(--gold)'}}>/ Admin</span>
            </h1>
          </div>
          <p style={{fontSize:11,color:'var(--ice3)',fontFamily:'var(--font-data)',marginTop:4}}>Dados mockados para teste — API real será integrada futuramente</p>
        </div>
        <span style={{fontSize:8,fontWeight:800,letterSpacing:2,background:'rgba(194,140,70,.15)',color:'var(--gold)',border:'1px solid rgba(194,140,70,.3)',padding:'4px 10px',borderRadius:4,fontFamily:'var(--font-data)'}}>MODO TESTE</span>
      </div>

      {/* ── KPIs ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:16}}>
        {[
          {l:'Capacidade',v:`${capTotal} ha/dia`,c:capTotal>0?'var(--grn)':'var(--red)',s:marcaTrator||'sem trator'},
          {l:'Ha em uso',  v:`${haUsados} ha`,    c:'var(--rust)',s:`de ${capTotal} disponíveis`},
          {l:'Ha livre',   v:`${haDisponivel} ha`, c:haDisponivel>0?'var(--grn)':'var(--ice2)',s:'para plantar'},
          {l:'Pasto ativo',v:`${haPasto.toFixed(0)} ha`,c:'#86efac',s:`${cabecasPasto} cab. pastando`},
          {l:'Ec. ração',  v:`$${fmt(economiaDia)}/dia`,c:'#4ade80',s:cabecasPasto>0?'economia estimada':'sem pasto ativo'},
        ].map(m=>(
          <div key={m.l} style={{background:'var(--input-bg)',border:'1px solid var(--border)',borderTop:`2px solid ${m.c}`,borderRadius:6,padding:'14px 16px',boxShadow:'0 2px 10px rgba(0,0,0,.4)'}}>
            <div style={{fontSize:9,color:'var(--ice3)',marginBottom:6,textTransform:'uppercase',letterSpacing:2,fontFamily:'var(--font-data)'}}>{m.l}</div>
            <div style={{fontSize:20,fontWeight:700,color:m.c,fontFamily:'var(--font-data)',lineHeight:1}}>{m.v}</div>
            <div style={{fontSize:9,color:'var(--ice3)',marginTop:4,fontFamily:'var(--font-data)'}}>{m.s}</div>
          </div>
        ))}
      </div>

      {/* ── Pasto Ativo ── */}
      {pastosAtivos.length > 0 && (
        <div style={{background:'rgba(134,239,172,.05)',border:'1px solid rgba(134,239,172,.25)',borderRadius:10,padding:'16px 20px',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <span style={{fontSize:16}}>🌿</span>
            <span style={{fontSize:13,fontWeight:700,color:'#86efac',fontFamily:"'Playfair Display',serif"}}>Pasto Ativo</span>
            <span style={{marginLeft:'auto',fontSize:11,color:'var(--ice2)',fontFamily:'var(--font-data)'}}>Economia estimada: <span style={{color:'#4ade80',fontWeight:700}}>${fmt(economiaDia)}/dia</span></span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {pastosAtivos.map(c=>{
              const cli = CLIMAS[c.clima||'normal']
              const haPastoC = (c.area_ha * cli.capimMult).toFixed(1)
              const cabC = Math.floor(c.area_ha * cli.capimMult * 1.5)
              const pct  = calcPct(c.inicio_pasto, c.fim_pasto)
              const diasLeft = Math.max(0, Math.ceil((new Date(c.fim_pasto)-Date.now())/_d))
              return (
                <div key={c.id} style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:14,alignItems:'center'}}>
                  <div style={{fontSize:11,color:'var(--ice2)',fontFamily:'var(--font-data)',whiteSpace:'nowrap'}}>
                    {c.area_ha} ha capim → <span style={{color:'#86efac',fontWeight:700}}>{haPastoC} ha pasto</span> · {cabC} cab.
                  </div>
                  <div>
                    <div style={{background:'var(--input-bg)',height:5,borderRadius:4,overflow:'hidden'}}>
                      <div style={{width:`${100-pct}%`,height:'100%',background:'#86efac',borderRadius:4,transition:'width 1s ease'}}/>
                    </div>
                  </div>
                  <div style={{fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)',whiteSpace:'nowrap'}}>
                    {diasLeft}d restantes
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Garagem ── */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 20px',marginBottom:16,boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <span style={{fontSize:13,fontWeight:700,color:'var(--ice)',fontFamily:"'Playfair Display',serif"}}>🏚️ Garagem</span>
          <div style={{display:'flex',gap:12,fontSize:10,fontFamily:'var(--font-data)'}}>
            <span style={{color:podePlantar?'#4ade80':'#f87171'}}>{podePlantar?'✓ Pode plantar':'✗ Sem trator/plantadeira'}</span>
            <span style={{color:podeColher?'#4ade80':'#f87171'}}>{podeColher?'✓ Pode colher':'✗ Sem colheitadeira'}</span>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:8}}>
          {['trator','plantadeira','colheitadeira'].map(tipo=>{
            const m   = garagem.find(g=>g.tipo===tipo)
            const cor = m ? '#4ade80' : 'var(--border2)'
            const iconT = {trator:'🚜',plantadeira:'🌱',colheitadeira:'⚙️'}[tipo]
            const labelT = {trator:'Trator',plantadeira:'Plantadeira',colheitadeira:'Colheitadeira'}[tipo]
            return (
              <div key={tipo} style={{background:m?'rgba(74,222,128,.04)':'var(--input-bg)',border:`1px solid ${m?'rgba(74,222,128,.2)':'var(--border)'}`,borderTop:`2px solid ${cor}`,borderRadius:7,padding:'12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:m?8:0}}>
                  <span style={{fontSize:18}}>{iconT}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:m?'var(--ice)':'var(--ice3)',fontFamily:'var(--font-data)'}}>{labelT}</div>
                    {m&&<div style={{fontSize:9,color:cor,letterSpacing:1,fontFamily:'var(--font-data)',fontWeight:700}}>{m.marca.toUpperCase()}</div>}
                  </div>
                  <span style={{fontSize:7,fontWeight:700,letterSpacing:1,background:m?'rgba(74,222,128,.15)':'rgba(248,113,113,.1)',color:m?'#4ade80':'#f87171',border:`1px solid ${m?'rgba(74,222,128,.3)':'rgba(248,113,113,.3)'}`,padding:'2px 5px',borderRadius:3,fontFamily:'var(--font-data)'}}>{m?'OK':'SEM'}</span>
                </div>
                {m&&<div style={{fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)'}}>
                  {m.nome} · <span style={{color:'#4ade80',fontWeight:700}}>{CAP_MARCA[m.marca]} ha/dia</span>
                </div>}
                {!m&&<div style={{fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)',marginTop:4}}>Compre na <span style={{color:'var(--gold)'}}>Concessionária</span></div>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:14,marginBottom:16,alignItems:'start'}}>

        {/* ── Campos ── */}
        <div>
          <div style={{fontSize:10,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:10,fontFamily:'var(--font-data)'}}>Campos em andamento</div>

          {camposAtivos.length === 0 && (
            <div style={{background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:8,padding:'28px',textAlign:'center',color:'var(--ice3)',fontSize:12,fontFamily:'var(--font-data)'}}>
              Nenhum campo ativo — plante algo!
            </div>
          )}

          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {camposAtivos.map(campo=>{
              const cfg     = CULTURAS[campo.cultura]
              const cli     = campo.clima ? CLIMAS[campo.clima] : null
              const isPront = campo.status === 'pronto' || campo.status === 'pronto_capim'
              const isGrow  = campo.status === 'crescendo'
              const pct     = ['arando','plantando','crescendo','colhendo'].includes(campo.status) ? calcPct(campo.inicio_op, campo.fim_op) : 100
              const pipeline = campo.cultura === 'capim'
                ? [{s:'arando',icon:'🚜',l:'Arar'},{s:'plantando',icon:'🌱',l:'Plantar'},{s:'crescendo',icon:'🌤️',l:'Crescer'},{s:'pronto_capim',icon:'✅',l:'Pronto'}]
                : [{s:'arando',icon:'🚜',l:'Arar'},{s:'plantando',icon:'🌱',l:'Plantar'},{s:'crescendo',icon:'🌤️',l:'Crescer'},{s:'pronto',icon:'✅',l:'Pronto'},{s:'colhendo',icon:'⚙️',l:'Colher'}]
              const pipelineIdx = PIPELINE[campo.cultura]?.indexOf(campo.status) ?? -1
              const receita = campo.clima ? calcReceita(campo) : null
              const lucro   = campo.clima ? calcLucro(campo) : null
              const prejuizo = lucro !== null && lucro < 0

              return (
                <div key={campo.id} style={{
                  background:'var(--card)',
                  border:`1px solid ${isPront ? `${cfg.cor}55` : 'var(--border)'}`,
                  borderTop:`3px solid ${isPront ? cfg.cor : campo.status==='colhendo'?'var(--gold)':'var(--border2)'}`,
                  borderRadius:10,overflow:'hidden',
                  boxShadow: isPront ? `0 6px 24px ${cfg.cor}18` : '0 2px 10px rgba(0,0,0,.3)',
                  transition:'all .3s ease',
                }}>
                  {/* Foto de fundo header */}
                  <div style={{height:90,position:'relative',overflow:'hidden',background:'#0a0706'}}>
                    <img src={cfg.img} alt={cfg.nome} style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.35) saturate(.7)',display:'block'}}/>
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to right,rgba(21,15,12,.9),rgba(21,15,12,.6))'}}/>
                    <div style={{position:'absolute',inset:0,padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:26}}>{cfg.icon}</span>
                        <div>
                          <div style={{fontSize:14,fontWeight:800,color:'#fff',fontFamily:"'Playfair Display',serif",lineHeight:1}}>{cfg.nome}</div>
                          <div style={{fontSize:10,color:'rgba(255,255,255,.6)',fontFamily:'var(--font-data)',marginTop:2}}>
                            {campo.area_ha} ha
                            {['arando','plantando','colhendo'].includes(campo.status) && ` · ${campo.marca_maquina}`}
                            {` · $${fmt(campo.custo_total)} custo`}
                          </div>
                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                        {/* Badge status */}
                        <span style={{fontSize:8,fontWeight:800,letterSpacing:1,background:isPront?`${cfg.cor}33`:'rgba(194,140,70,.2)',color:isPront?cfg.cor:'var(--gold)',border:`1px solid ${isPront?`${cfg.cor}55`:'rgba(194,140,70,.3)'}`,padding:'3px 7px',borderRadius:4,fontFamily:'var(--font-data)'}}>
                          {STAGE_INFO[campo.status]?.icon} {STAGE_INFO[campo.status]?.label?.toUpperCase()}
                        </span>
                        {/* Badge clima */}
                        {cli && (
                          <span style={{fontSize:8,fontWeight:800,letterSpacing:1,background:`${cli.cor}22`,color:cli.cor,border:`1px solid ${cli.cor}44`,padding:'3px 7px',borderRadius:4,fontFamily:'var(--font-data)'}}>
                            {cli.icon} {cli.label.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{padding:'14px'}}>
                    {/* Pipeline steps */}
                    <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:12,overflowX:'auto'}}>
                      {pipeline.map((step, i) => {
                        const done    = PIPELINE[campo.cultura]?.indexOf(campo.status) > PIPELINE[campo.cultura]?.indexOf(step.s)
                        const active  = campo.status === step.s
                        const c       = done ? cfg.cor : active ? cfg.cor : 'var(--border2)'
                        return (
                          <div key={step.s} style={{display:'flex',alignItems:'center',flexShrink:0}}>
                            <div style={{textAlign:'center'}}>
                              <div style={{width:24,height:24,borderRadius:'50%',background:done?cfg.cor:active?`${cfg.cor}33`:'var(--input-bg)',border:`2px solid ${c}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,margin:'0 auto 3px',transition:'all .3s',boxShadow:active?`0 0 8px ${cfg.cor}66`:'none'}}>
                                {done ? '✓' : active ? <div style={{width:8,height:8,borderRadius:'50%',background:cfg.cor,animation:'blinkDot 1s step-end infinite'}}/> : <span style={{fontSize:8}}>{i+1}</span>}
                              </div>
                              <div style={{fontSize:8,color:active?cfg.cor:done?'var(--ice2)':'var(--ice3)',fontFamily:'var(--font-data)',letterSpacing:0.5,fontWeight:active||done?700:400}}>{step.l}</div>
                            </div>
                            {i<pipeline.length-1&&<div style={{width:16,height:1,background:done?cfg.cor:'var(--border)',margin:'0 2px',marginBottom:14,flexShrink:0,transition:'background .3s'}}/>}
                          </div>
                        )
                      })}
                    </div>

                    {/* Barra de progresso da operação atual */}
                    {['arando','plantando','crescendo','colhendo'].includes(campo.status) && (
                      <div style={{marginBottom:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)',marginBottom:5}}>
                          <span>{STAGE_INFO[campo.status]?.icon} {STAGE_INFO[campo.status]?.label}...</span>
                          <span style={{fontWeight:700,color:cfg.cor}}>{pct.toFixed(0)}% · {tempoStr(campo.fim_op)}</span>
                        </div>
                        <div style={{background:'var(--input-bg)',height:6,borderRadius:4,overflow:'hidden'}}>
                          <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${cfg.cor}88,${cfg.cor})`,borderRadius:4,transition:'width 2s ease',boxShadow:pct>90?`0 0 8px ${cfg.cor}66`:'none'}}/>
                        </div>
                      </div>
                    )}

                    {/* Previsão de receita (se clima revelado) */}
                    {campo.clima && cfg.tipo === 'colheita' && (
                      <div style={{background:prejuizo?'rgba(248,113,113,.06)':'rgba(74,222,128,.04)',border:`1px solid ${prejuizo?'rgba(248,113,113,.2)':'rgba(74,222,128,.15)'}`,borderRadius:6,padding:'8px 12px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)'}}>Receita prevista</span>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:14,fontWeight:700,color:prejuizo?'#f87171':'#4ade80',fontFamily:'var(--font-data)'}}>${fmt(receita)}</div>
                          <div style={{fontSize:9,color:prejuizo?'#f87171':'#4ade80',fontFamily:'var(--font-data)',fontWeight:700}}>{lucro>=0?'+':''}${fmt(lucro)} lucro</div>
                        </div>
                      </div>
                    )}

                    {/* Sortear clima (admin) */}
                    {!campo.clima && (isGrow || isPront) && (
                      <button
                        onClick={() => revelarClima(campo.id)}
                        disabled={sortando === campo.id}
                        style={{width:'100%',padding:'9px',border:'1px dashed rgba(122,176,224,.4)',borderRadius:7,background:'rgba(122,176,224,.05)',color:'#7ab0e0',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-data)',letterSpacing:0.5,marginBottom:12,transition:'all .2s'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='rgba(122,176,224,.12)';e.currentTarget.style.borderStyle='solid'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='rgba(122,176,224,.05)';e.currentTarget.style.borderStyle='dashed'}}
                      >
                        {sortando === campo.id ? '🎲 Sorteando...' : '🎲 Sortear Clima'}
                      </button>
                    )}

                    {/* Botão de ação principal */}
                    {isPront && cfg.tipo === 'colheita' && (
                      <button
                        onClick={() => iniciarColheita(campo.id)}
                        disabled={!podeColher || !campo.clima}
                        style={{
                          width:'100%',padding:'11px',borderRadius:7,border:`1px solid ${podeColher&&campo.clima?`${cfg.cor}55`:'var(--border)'}`,
                          background:podeColher&&campo.clima?`linear-gradient(135deg,${cfg.cor}22,${cfg.cor}11)`:'var(--input-bg)',
                          color:podeColher&&campo.clima?cfg.cor:'var(--ice3)',
                          fontSize:12,fontWeight:700,cursor:podeColher&&campo.clima?'pointer':'not-allowed',
                          fontFamily:'var(--font-data)',transition:'all .2s ease',
                        }}
                        onMouseEnter={e=>{if(podeColher&&campo.clima){e.currentTarget.style.background=`${cfg.cor}33`;e.currentTarget.style.boxShadow=`0 4px 16px ${cfg.cor}22`;e.currentTarget.style.transform='translateY(-1px)'}}}
                        onMouseLeave={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${cfg.cor}22,${cfg.cor}11)`;e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)'}}
                      >
                        {!campo.clima ? '🎲 Revele o clima antes de colher' : !podeColher ? '🔒 Sem colheitadeira' : `⚙️ Iniciar Colheita — ${marcaColh} · ${tempoStr(new Date(Date.now() + durMs(campo.area_ha, marcaColh||'Valtra')).toISOString())}`}
                      </button>
                    )}
                    {campo.status === 'pronto_capim' && (
                      <button
                        onClick={() => liberarCapim(campo.id)}
                        disabled={!campo.clima}
                        style={{
                          width:'100%',padding:'11px',borderRadius:7,border:`1px solid ${campo.clima?'rgba(134,239,172,.4)':'var(--border)'}`,
                          background:campo.clima?'rgba(134,239,172,.08)':'var(--input-bg)',
                          color:campo.clima?'#86efac':'var(--ice3)',
                          fontSize:12,fontWeight:700,cursor:campo.clima?'pointer':'not-allowed',fontFamily:'var(--font-data)',transition:'all .2s',
                        }}
                        onMouseEnter={e=>{if(campo.clima){e.currentTarget.style.background='rgba(134,239,172,.15)';e.currentTarget.style.boxShadow='0 4px 16px rgba(134,239,172,.1)'}}}
                        onMouseLeave={e=>{e.currentTarget.style.background='rgba(134,239,172,.08)';e.currentTarget.style.boxShadow='none'}}
                      >
                        {!campo.clima ? '🎲 Revele o clima antes de liberar' : `🌿 Liberar para Pastagem — 30 dias ativos`}
                      </button>
                    )}
                    {campo.status === 'colhendo' && (
                      <div style={{fontSize:11,color:'var(--gold)',fontFamily:'var(--font-data)',textAlign:'center',padding:'8px',background:'rgba(194,140,70,.08)',borderRadius:6,border:'1px solid rgba(194,140,70,.2)'}}>
                        ⚙️ Colheitadeira em operação · {tempoStr(campo.fim_op)} restantes
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Histórico colhidos */}
          {camposColhidos.length > 0 && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:9,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:8,fontFamily:'var(--font-data)'}}>Colhidos recentemente</div>
              {camposColhidos.map(c=>{
                const cfg = CULTURAS[c.cultura]
                const cli = CLIMAS[c.clima||'normal']
                return (
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,background:'rgba(74,222,128,.04)',border:'1px solid rgba(74,222,128,.2)',borderRadius:8,padding:'10px 12px',marginBottom:6,animation:'fadeSlideIn .4s ease'}}>
                    <span style={{fontSize:18}}>{cfg.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--ice)',fontFamily:'var(--font-data)'}}>{cfg.nome} · {c.area_ha} ha · {cli.icon} {cli.label}</div>
                      <div style={{fontSize:11,color:'#4ade80',fontFamily:'var(--font-data)',fontWeight:700}}>{c.resultado}</div>
                    </div>
                    <button onClick={()=>limparCampo(c.id)} style={{background:'none',border:'none',color:'var(--ice3)',cursor:'pointer',fontSize:16,borderRadius:4,padding:'2px 6px',transition:'color .15s'}} onMouseEnter={e=>e.target.style.color='#f87171'} onMouseLeave={e=>e.target.style.color='var(--ice3)'}>×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Plantar ── */}
        <div>
          <div style={{fontSize:10,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:10,fontFamily:'var(--font-data)'}}>Novo plantio</div>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderLeft:'3px solid var(--gold)',borderRadius:10,padding:'18px',boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>

            {!podePlantar && (
              <div style={{background:'rgba(248,113,113,.06)',border:'1px solid rgba(248,113,113,.2)',borderRadius:6,padding:'10px 12px',marginBottom:14,fontSize:11,color:'#f87171',fontFamily:'var(--font-data)',lineHeight:1.6}}>
                🔒 Precisa de <strong>Trator</strong> + <strong>Plantadeira</strong>.<br/>Visite a Concessionária.
              </div>
            )}

            {/* Seletor cultura com imagem */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:'var(--ice3)',textTransform:'uppercase',letterSpacing:2,fontFamily:'var(--font-data)',marginBottom:8}}>Cultura</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                {Object.entries(CULTURAS).map(([key,c])=>(
                  <button key={key} onClick={()=>setCultura(key)} style={{
                    border:`2px solid ${cultura===key?c.cor:'var(--border)'}`,
                    borderRadius:8,overflow:'hidden',cursor:'pointer',background:'var(--input-bg)',
                    padding:0,transition:'all .2s ease',
                    transform:cultura===key?'scale(1.03)':'scale(1)',
                    boxShadow:cultura===key?`0 4px 14px ${c.cor}33`:'none',
                  }}>
                    <div style={{height:56,overflow:'hidden',position:'relative'}}>
                      <img src={c.img} alt={c.nome} style={{width:'100%',height:'100%',objectFit:'cover',filter:`brightness(.${cultura===key?'6':'4'})`}}/>
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{c.icon}</div>
                    </div>
                    <div style={{padding:'5px 4px',textAlign:'center'}}>
                      <div style={{fontSize:10,fontWeight:700,color:cultura===key?c.cor:'var(--ice3)',fontFamily:'var(--font-data)'}}>{c.nome}</div>
                      <div style={{fontSize:8,color:'var(--ice3)',fontFamily:'var(--font-data)'}}>{c.ciclo}d · ${fmt(c.custo)}/ha</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hectares */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:'var(--ice3)',textTransform:'uppercase',letterSpacing:2,fontFamily:'var(--font-data)',marginBottom:8}}>
                Área — {haDisponivel} ha disponível
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <button onClick={()=>setHaInput(Math.max(1,haInput-1))} style={{width:36,height:36,borderRadius:8,background:'var(--input-bg)',border:'1px solid var(--border2)',color:'var(--ice)',fontSize:18,cursor:'pointer',transition:'border-color .15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--gold)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}>−</button>
                <input type="number" value={haInput} min={1} max={haDisponivel}
                  onChange={e=>setHaInput(Math.max(1,Math.min(haDisponivel,parseInt(e.target.value)||1)))}
                  style={{flex:1,textAlign:'center',background:'var(--input-bg)',border:'1px solid var(--border2)',borderRadius:8,padding:'8px',fontSize:22,color:'var(--ice)',fontFamily:'var(--font-data)',fontWeight:700,outline:'none'}}
                  onFocus={e=>{e.target.style.borderColor='var(--gold)';e.target.style.boxShadow='0 0 0 3px rgba(194,140,70,.12)'}}
                  onBlur={e=>{e.target.style.borderColor='var(--border2)';e.target.style.boxShadow='none'}}
                />
                <button onClick={()=>setHaInput(Math.min(haDisponivel,haInput+1))} style={{width:36,height:36,borderRadius:8,background:'var(--input-bg)',border:'1px solid var(--border2)',color:'var(--ice)',fontSize:18,cursor:'pointer',transition:'border-color .15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--gold)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}>+</button>
                <button onClick={()=>setHaInput(haDisponivel)} style={{padding:'8px 10px',borderRadius:8,background:'var(--input-bg)',border:'1px solid var(--border2)',color:'var(--ice3)',fontSize:9,cursor:'pointer',fontFamily:'var(--font-data)',fontWeight:800,letterSpacing:1,transition:'all .15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.color='var(--gold)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--ice3)'}}>MAX</button>
              </div>
            </div>

            {/* Preview */}
            <div style={{background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:8,padding:'12px',marginBottom:14}}>
              <div style={{fontSize:9,color:'var(--ice3)',letterSpacing:2,fontFamily:'var(--font-data)',marginBottom:8}}>SIMULAÇÃO</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[
                  ['Custo total',  `$${fmt(custoPreview)}`,                                               'var(--red)'],
                  ['Tempo arar',   `${(haInput/(CAP_MARCA[marcaTrator||'Valtra']||30)*24).toFixed(1)}h`,   'var(--ice2)'],
                  ['Ciclo crescer',`${cfg.ciclo} dias`,                                                   'var(--ice)'],
                  ['Retorno normal', receitaPreview ? `$${fmt(receitaPreview)}` : `+${(haInput*1.5).toFixed(0)} ha pasto`, cfg.cor],
                  ['Lucro normal',   lucroPreview !== null ? `$${fmt(lucroPreview)}` : '—',               lucroPreview > 0 ? '#4ade80' : 'var(--ice3)'],
                  ['Risco granizo',  receitaPreview ? `$${fmt(Math.round(receitaPreview*.5))}` : '—',     '#f87171'],
                ].map(([k,v,c])=>(
                  <div key={k} style={{background:'var(--card)',borderRadius:5,padding:'7px 9px'}}>
                    <div style={{fontSize:8,color:'var(--ice3)',fontFamily:'var(--font-data)',letterSpacing:1,marginBottom:2}}>{k.toUpperCase()}</div>
                    <div style={{fontSize:12,fontWeight:700,color:c,fontFamily:'var(--font-data)'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plantar btn */}
            <button
              onClick={plantar}
              disabled={!podePlantar||haInput<1||haInput>haDisponivel}
              style={{
                width:'100%',padding:'13px',borderRadius:8,
                background:podePlantar&&haInput>0&&haInput<=haDisponivel?`linear-gradient(135deg,${cfg.cor}33,${cfg.cor}18)`:'var(--input-bg)',
                border:`1px solid ${podePlantar&&haInput>0&&haInput<=haDisponivel?`${cfg.cor}55`:'var(--border)'}`,
                color:podePlantar&&haInput>0&&haInput<=haDisponivel?cfg.cor:'var(--ice3)',
                fontSize:12,fontWeight:700,cursor:podePlantar&&haInput<=haDisponivel?'pointer':'not-allowed',
                fontFamily:'var(--font-data)',transition:'all .2s ease',letterSpacing:0.5,
              }}
              onMouseEnter={e=>{if(podePlantar&&haInput<=haDisponivel){e.currentTarget.style.background=`${cfg.cor}33`;e.currentTarget.style.boxShadow=`0 6px 20px ${cfg.cor}22`;e.currentTarget.style.transform='translateY(-1px)'}}}
              onMouseLeave={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${cfg.cor}33,${cfg.cor}18)`;e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)'}}
            >
              {cfg.icon} Plantar {haInput} ha de {cfg.nome} — ${fmt(custoPreview)}
            </button>
          </div>

          {/* Tabela risco/retorno */}
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'16px',marginTop:10}}>
            <div style={{fontSize:10,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:10,fontFamily:'var(--font-data)'}}>Tabela de risco climático</div>
            {Object.entries(CLIMAS).map(([key,cl])=>(
              <div key={key} style={{display:'grid',gridTemplateColumns:'80px 1fr auto auto',gap:10,alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{fontSize:11,color:cl.cor,fontFamily:'var(--font-data)',fontWeight:700}}>{cl.icon} {cl.label}</div>
                <div style={{fontSize:10,color:'var(--ice3)',fontFamily:'var(--font-data)'}}>
                  {cl.diasExtra>0?`+${cl.diasExtra}d colheita`:cl.mult===1?'sem alteração':`${cl.mult<1?'-':'+'}${Math.abs(Math.round((cl.mult-1)*100))}% produção`}
                </div>
                <div style={{fontSize:10,color:'var(--ice2)',fontFamily:'var(--font-data)',textAlign:'right'}}>{Math.round(cl.prob*100)}%</div>
                <div style={{width:40,height:4,background:'var(--input-bg)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{width:`${cl.prob*100*3.5}%`,height:'100%',background:cl.cor,borderRadius:4}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
