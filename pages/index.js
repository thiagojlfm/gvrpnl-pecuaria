import { FazendasPage, MinhaFazendaPage, CeleiroPage, TransportadoraPage, ConcessionariaPage, FretesNPCPage, BotaoOfertaNPC, PastagemPage } from '../components/fazendas_components'
import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'

// ─── Constants ────────────────────────────────────────────────────────────────
const FASES = { bezerro:'Bezerro', garrote:'Garrote', boi:'Boi', abatido:'Boi abatido' }
const PESOS = { bezerro:180, garrote:400, boi:540, abatido:648 }
const SEMANAS = { bezerro:1, garrote:2, boi:3, abatido:4 }
const fmt = n => Number(n||0).toLocaleString('pt-BR')

// ─── Sound Engine ─────────────────────────────────────────────────────────────
let audioCtx = null
function getCtx() {
  if (!audioCtx && typeof window !== 'undefined') audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}
function playTone(freq, duration, type='sine', vol=0.1) {
  try {
    const ctx = getCtx(); if(!ctx) return
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = type; o.frequency.value = freq
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    o.start(ctx.currentTime); o.stop(ctx.currentTime + duration)
  } catch(e) {}
}
const sounds = {
  click: () => playTone(800, 0.08, 'square', 0.05),
  success: () => { playTone(523, 0.15, 'sine', 0.08); setTimeout(()=>playTone(659, 0.15, 'sine', 0.08), 120); setTimeout(()=>playTone(784, 0.2, 'sine', 0.08), 240) },
  coin: () => { playTone(1046, 0.1, 'sine', 0.1); setTimeout(()=>playTone(1318, 0.15, 'sine', 0.08), 80) },
  phase: () => { playTone(440, 0.1); setTimeout(()=>playTone(550, 0.2), 100) },
  error: () => playTone(200, 0.3, 'sawtooth', 0.06),
}

// ─── CSS Globals — Leilão de Gado Premium ────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
  :root{
    --bg:#150f0c;--panel:#1e1612;--card:#1e1612;--card2:#261c17;--input-bg:#130d0a;
    --border:#36251e;--border2:#523a2f;
    --rust:#c28c46;--rust2:#8a602c;--rust3:#3d2b24;
    --gold:#c28c46;--gold-dim:#8a602c;
    --grn:#4ade80;--grn2:#14532d;
    --red:#f87171;--red2:#450a0a;
    --ice:#eaddcf;--ice2:#a6968a;--ice3:#5c4a42;
    --font-disp:'Playfair Display',serif;
    --font-mono:'DM Mono',monospace;
    --font-title:'Playfair Display',serif;
    --font-data:'DM Mono',monospace;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{font-family:var(--font-mono);background:var(--bg);color:var(--ice);-webkit-font-smoothing:antialiased}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:var(--bg)}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}
  ::-webkit-scrollbar-thumb:hover{background:var(--gold-dim)}
  @keyframes fadeSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes countSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes slideRight{from{transform:translateX(-100%)}to{transform:translateX(0)}}
  @keyframes slideLeft{from{transform:translateX(0)}to{transform:translateX(-100%)}}
  @keyframes barGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  @keyframes blinkDot{0%,100%{opacity:1}50%{opacity:0}}
  .page-enter{animation:fadeSlideIn .3s cubic-bezier(.4,0,.2,1) both}
  .card-hover{transition:border-color .15s}
  .btn-hover{transition:none}
  .drawer-open{animation:slideRight .28s cubic-bezier(.4,0,.2,1) both}
  @media(max-width:768px){.desktop-only{display:none!important}.mobile-header{display:flex!important}}
  @media(min-width:769px){.mobile-only{display:none!important}.mobile-header{display:none!important}}
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
`

// ─── Theme — Leilão de Gado Premium ──────────────────────────────────────────
const D = {
  bg:'#150f0c', panel:'#1e1612', card:'#1e1612', cardHover:'#261c17',
  border:'#36251e', border2:'#523a2f',
  gold:'#c28c46', goldLight:'#d4a96a', goldDark:'#8a602c',
  cream:'#eaddcf', creamDim:'#a6968a', creamMuted:'#5c4a42',
  green:'#4ade80', greenDark:'#14532d', red:'#f87171', amber:'#c28c46',
  inputBg:'#130d0a', navBg:'#1e1612', isDark:true,
  text:'#eaddcf', textDim:'#a6968a', textMuted:'#5c4a42',
}
const L = {
  bg:'#f5ede2', panel:'#ede0cc', card:'#f9f3ea', cardHover:'#fff8f0',
  border:'#d4b896', border2:'#b8946a',
  gold:'#8a5a1a', goldLight:'#a06c28', goldDark:'#5c3a0a',
  cream:'#2a1a0a', creamDim:'#5c3a1e', creamMuted:'#8a6a4a',
  green:'#16803a', greenDark:'#bbf7d0', red:'#b91c1c', amber:'#8a5a1a',
  inputBg:'#ede0cc', navBg:'#e8d9c4', isDark:false,
  text:'#2a1a0a', textDim:'#5c3a1e', textMuted:'#8a6a4a',
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Badge({type, children}) {
  const map={ok:{bg:'#002010',color:'#4ade80',border:'#14532d'},warn:{bg:'#2a1a08',color:'#c28c46',border:'#8a602c'},info:{bg:'#0a0f1e',color:'#7ab0e0',border:'#1a3060'},gray:{bg:'#261c17',color:'#a6968a',border:'#5c4a42'},purple:{bg:'#150a28',color:'#9060e0',border:'#3a2060'},danger:{bg:'#2a0808',color:'#f87171',border:'#450a0a'},amber:{bg:'#2a1a08',color:'#c28c46',border:'#8a602c'},gold:{bg:'#261c17',color:'#eaddcf',border:'#5c4a42'},nl:{bg:'#0a0f1e',color:'#7ab0e0',border:'#1a3060'}}
  const s=map[type]||map.gray
  return <span style={{background:s.bg,color:s.color,border:`1px solid ${s.border}`,fontSize:10,padding:'2px 8px',borderRadius:4,fontWeight:700,whiteSpace:'nowrap',display:'inline-block',letterSpacing:'1px',fontFamily:'var(--font-data)',textTransform:'uppercase'}}>{children}</span>
}

function Card({children, style, glow, hover=true, T}) {
  return <div className={hover?'card-hover':''} style={{background:'var(--card)',border:`1px solid ${glow?'var(--rust2)':'var(--border)'}`,borderLeft:glow?'3px solid var(--rust)':'1px solid var(--border)',borderRadius:6,padding:20,marginBottom:16,position:'relative',overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.5)',...style}} onMouseEnter={hover?e=>{e.currentTarget.style.borderColor='var(--rust2)'}:undefined} onMouseLeave={hover?e=>{e.currentTarget.style.borderColor=glow?'var(--rust2)':'var(--border)'}:undefined}>
    {glow&&<div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'var(--rust)',opacity:.6}}/>}
    {children}
  </div>
}

function SectionTitle({icon, title, sub, T}) {
  return <div style={{marginBottom:24,paddingBottom:14,borderBottom:'1px solid var(--border)'}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
      <span style={{fontSize:18}}>{icon}</span>
      <h1 style={{fontFamily:'var(--font-disp)',fontSize:28,letterSpacing:'1px',color:'var(--ice)',fontWeight:700,lineHeight:1}}>{title}</h1>
    </div>
    {sub&&<p style={{fontSize:11,color:'var(--ice3)',marginLeft:28,letterSpacing:'0.5px',fontWeight:400,fontFamily:'var(--font-data)'}}>{sub}</p>}
  </div>
}

function Metric({label, value, sub, color, T, icon}) {
  return <div style={{background:'var(--input-bg)',border:'1px solid var(--border)',borderTop:`2px solid ${color||'var(--border2)'}`,borderRadius:4,padding:'14px 16px',position:'relative',overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.4)'}}>
    <div style={{fontSize:9,color:'var(--ice3)',marginBottom:6,textTransform:'uppercase',letterSpacing:'2px',fontWeight:500,fontFamily:'var(--font-data)'}}>{label}</div>
    <div style={{fontSize:24,fontWeight:700,color:color||'var(--ice)',fontFamily:'var(--font-data)',letterSpacing:'0.5px',lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:'var(--ice3)',marginTop:4,fontWeight:300,letterSpacing:'1px'}}>{sub}</div>}
  </div>
}

function Inp({label, T, hint, ...props}) {
  return <div style={{display:'flex',flexDirection:'column',gap:6}}>
    {label&&<label style={{fontSize:10,color:'var(--ice3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'2px',fontFamily:'var(--font-data)'}}>{label}</label>}
    <input {...props} style={{background:'var(--input-bg)',border:'1px solid var(--border2)',borderRadius:4,padding:'10px 14px',fontSize:13,color:'var(--ice)',fontFamily:'var(--font-mono)',outline:'none',transition:'border-color .1s',...props.style}} onFocus={e=>{e.target.style.borderColor='var(--rust)';props.onFocus&&props.onFocus(e)}} onBlur={e=>{e.target.style.borderColor='var(--border2)';props.onBlur&&props.onBlur(e)}}/>
    {hint&&<div style={{fontSize:10,color:'var(--ice3)',letterSpacing:'1px',fontWeight:300}}>{hint}</div>}
  </div>
}

function Sel({label, children, T, ...props}) {
  return <div style={{display:'flex',flexDirection:'column',gap:6}}>
    {label&&<label style={{fontSize:10,color:'var(--ice3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'2px',fontFamily:'var(--font-data)'}}>{label}</label>}
    <select {...props} style={{background:'var(--input-bg)',border:'1px solid var(--border2)',borderRadius:4,padding:'10px 14px',fontSize:13,color:'var(--ice)',fontFamily:'var(--font-mono)',outline:'none',cursor:'pointer',...props.style}}>{children}</select>
  </div>
}

function Btn({children, onClick, v='primary', style, disabled, T, sound=true}) {
  const vmap={
    primary:{bg:'transparent',border:'2px solid var(--border2)',color:'var(--ice)',hbg:'var(--border2)',hc:'var(--bg)'},
    ghost:{bg:'transparent',border:'1px solid var(--border2)',color:'var(--ice2)',hbg:'var(--border2)',hc:'var(--bg)'},
    danger:{bg:'var(--red2)',border:'1px solid var(--red)',color:'var(--red)',hbg:'var(--red)',hc:'#fff',shadow:'0 2px 8px rgba(0,0,0,.4)'},
    amber:{bg:'var(--rust3)',border:'1px solid var(--rust2)',color:'var(--rust)',hbg:'var(--rust2)',hc:'#000'},
    purple:{bg:'#150a28',border:'1px solid #3a2060',color:'#9060e0',hbg:'#3a2060',hc:'#fff'},
    red:{bg:'var(--red2)',border:'1px solid var(--red)',color:'var(--red)',hbg:'var(--red)',hc:'#fff',shadow:'0 2px 8px rgba(0,0,0,.4)'},
    green:{bg:'var(--grn2)',border:'1px solid var(--grn)',color:'var(--grn)',hbg:'var(--grn)',hc:'#000'},
  }
  const c=vmap[v]||vmap.primary
  return <button style={{background:c.bg,border:c.border,color:c.color,borderRadius:6,fontSize:13,fontWeight:600,cursor:disabled?'not-allowed':'pointer',padding:'10px 20px',fontFamily:'var(--font-title)',letterSpacing:'0.5px',opacity:disabled?.4:1,boxShadow:c.shadow||'none',outline:'none',...style}} onClick={()=>{if(sound&&!disabled) sounds.click();onClick&&onClick()}} disabled={disabled} onMouseEnter={e=>{if(!disabled){e.currentTarget.style.background=c.hbg;e.currentTarget.style.color=c.hc}}} onMouseLeave={e=>{e.currentTarget.style.background=c.bg;e.currentTarget.style.color=c.color}} onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform='translate(2px,2px)'}} onMouseUp={e=>{e.currentTarget.style.transform='none'}}>{children}</button>
}

function Tbl({headers, rows, T}) {
  return <div style={{overflowX:'auto',border:'1px solid var(--border)',borderRadius:6,backgroundImage:'linear-gradient(rgba(54,37,30,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(54,37,30,.3) 1px,transparent 1px)',backgroundSize:'24px 24px',boxShadow:'0 2px 12px rgba(0,0,0,.4)'}}>
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
      <thead><tr style={{background:'var(--card2)'}}>{headers.map((h,i)=><th key={i} style={{textAlign:'left',padding:'10px 14px',fontSize:9,fontWeight:600,color:'var(--ice3)',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'2px',fontFamily:'var(--font-data)'}}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((row,i)=><tr key={i} style={{borderBottom:'1px solid var(--border)',transition:'background .1s'}} onMouseEnter={e=>e.currentTarget.style.background='var(--input-bg)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          {row.map((cell,j)=><td key={j} style={{padding:'11px 14px',color:'var(--ice)',verticalAlign:'middle',fontFamily:'var(--font-data)',fontSize:12}}>{cell}</td>)}
        </tr>)}
        {rows.length===0&&<tr><td colSpan={headers.length} style={{padding:32,textAlign:'center',color:'var(--ice3)',fontSize:12,letterSpacing:'1px',fontFamily:'var(--font-data)'}}>Nenhum registro encontrado</td></tr>}
      </tbody>
    </table>
  </div>
}

function Alrt({type, children}) {
  const s={warn:{bg:'#2a1a08',color:'#c28c46',border:'#8a602c'},success:{bg:'#002010',color:'#4ade80',border:'#14532d'},info:{bg:'#050f28',color:'#7ab0e0',border:'#103060'},danger:{bg:'#2a0808',color:'#f87171',border:'#450a0a'}}[type]||{bg:'#261c17',color:'#a6968a',border:'#5c4a42'}
  return <div style={{background:s.bg,color:s.color,borderLeft:`3px solid ${s.border}`,padding:'10px 14px',borderRadius:4,fontSize:12,marginBottom:14,lineHeight:1.6,fontFamily:'var(--font-mono)',letterSpacing:'.5px'}}>{children}</div>
}
function faseBadge(f) {
  const m={bezerro:'info',garrote:'warn',boi:'gray',abatido:'gold'}
  return <Badge type={m[f]||'gray'}>{FASES[f]} · S{SEMANAS[f]}</Badge>
}

// ─── Countdown Ring ───────────────────────────────────────────────────────────
function CountdownRing({dataFase, T, size=48}) {
  const [pct, setPct] = useState(0)
  const [days, setDays] = useState(0)
  useEffect(() => {
    if(!dataFase) return
    const update = () => {
      const total = 7 * 24 * 3600 * 1000
      const end = new Date(dataFase).getTime()
      const now = Date.now()
      const start = end - total
      const elapsed = now - start
      const p = Math.max(0, Math.min(1, elapsed / total))
      setPct(p)
      setDays(Math.max(0, Math.ceil((end - now) / 86400000)))
    }
    update()
    const iv = setInterval(update, 60000)
    return () => clearInterval(iv)
  }, [dataFase])

  const r = (size/2) - 4
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const color = days<=1?'#f87171':days<=3?'#c28c46':T.gold

  return <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:'stroke-dasharray .5s ease'}}/>
    </svg>
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
      <span style={{fontSize:11,fontWeight:700,color,lineHeight:1}}>{days}</span>
      <span style={{fontSize:8,color:T.textMuted,lineHeight:1}}>dias</span>
    </div>
  </div>
}

// ─── Mini Chart ───────────────────────────────────────────────────────────────
function MiniChart({data, color, T, height=48}) {
  if(!data||data.length<2) return <div style={{height,display:'flex',alignItems:'center',justifyContent:'center',color:T.textMuted,fontSize:11}}>Sem dados</div>
  const max = Math.max(...data), min = Math.min(...data)
  const range = max-min||1
  const w = 200, h = height
  const pts = data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*(h-8)-4}`)
  const path = `M ${pts.join(' L ')}`
  const area = `M ${pts[0]} L ${pts.join(' L ')} L ${(data.length-1)/(data.length-1)*w},${h} L 0,${h} Z`
  return <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
    <defs><linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    <path d={area} fill={`url(#g${color.replace('#','')})`}/>
    <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx={pts[pts.length-1].split(',')[0]} cy={pts[pts.length-1].split(',')[1]} r="3" fill={color}/>
  </svg>
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({anuncio, user, token, onClose, T}) {
  const [msgs, setMsgs] = useState([])
  const [txt, setTxt] = useState('')
  const lastIdRef = useRef(0)
  const bottomRef = useRef(null)

  const fetchMsgs = useCallback(async (since=0) => {
    if(!anuncio?.id) return
    try {
      const h = {'Content-Type':'application/json'}
      if(token) h['Authorization']=`Bearer ${token}`
      const r = await fetch(`/api/chat?anuncio_id=${anuncio.id}&since=${since}`,{headers:h})
      if(!r.ok) return
      const data = await r.json()
      if(Array.isArray(data)&&data.length) {
        setMsgs(prev => {
          const ids = new Set(prev.map(m=>m.id))
          const novos = data.filter(m=>!ids.has(m.id))
          if(!novos.length) return prev
          const merged = [...prev,...novos]
          lastIdRef.current = merged[merged.length-1]?.id||0
          return merged
        })
      }
    } catch(e) {}
  },[anuncio?.id,token])

  useEffect(() => {
    lastIdRef.current=0; setMsgs([]); fetchMsgs(0)
    const iv = setInterval(()=>{
      if(!document.hidden) fetchMsgs(lastIdRef.current)
    }, 8000)
    return ()=>clearInterval(iv)
  },[fetchMsgs])

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  async function send() {
    if(!txt.trim()||!user) return
    sounds.click()
    const h = {'Content-Type':'application/json',Authorization:`Bearer ${token}`}
    await fetch('/api/chat',{method:'POST',headers:h,body:JSON.stringify({anuncio_id:anuncio.id,mensagem:txt.trim()})})
    setTxt(''); fetchMsgs(lastIdRef.current)
  }

  return <div style={{position:'fixed',top:0,right:0,width:320,height:'100vh',background:T.panel,borderLeft:`1px solid ${T.border2}`,zIndex:200,display:'flex',flexDirection:'column',boxShadow:'-8px 0 40px rgba(0,0,0,.4)',animation:'slideRight .28s ease'}}>
    <div style={{padding:'16px 18px',borderBottom:`1px solid ${T.border}`,background:T.navBg}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text}}>💬 Negociação</span>
        <button onClick={onClose} style={{background:'none',border:'none',color:T.textMuted,fontSize:20,cursor:'pointer',lineHeight:1}}>×</button>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        {faseBadge(anuncio.fase)}
        <span style={{fontSize:12,color:T.textMuted}}>{anuncio.quantidade} cab.</span>
        <span style={{fontWeight:700,color:T.gold,fontSize:13}}>${fmt(anuncio.preco_pedido)}</span>
      </div>
      <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>Vendedor: <span style={{color:T.text,fontWeight:500}}>{anuncio.vendedor_nome}</span></div>
    </div>
    <div style={{flex:1,overflowY:'auto',padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
      {msgs.length===0&&<div style={{fontSize:12,color:T.textMuted,textAlign:'center',marginTop:48,lineHeight:2}}>🐄<br/>Seja o primeiro a fazer uma oferta!</div>}
      {msgs.map(m=>{
        const isMine = m.jogador_nome===user?.username
        return <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:isMine?'flex-end':'flex-start'}}>
          <div style={{fontSize:10,color:T.textMuted,marginBottom:3,display:'flex',gap:6,alignItems:'center'}}>
            <span style={{color:isMine?T.gold:T.textDim,fontWeight:600}}>{m.jogador_nome}</span>
            <span>{new Date(m.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
            {user?.role==='admin'&&<button onClick={async()=>{const h={'Content-Type':'application/json',Authorization:`Bearer ${token}`};await fetch('/api/chat',{method:'DELETE',headers:h,body:JSON.stringify({id:m.id})});setMsgs(x=>x.filter(y=>y.id!==m.id))}} style={{background:'none',border:'none',color:T.textMuted,cursor:'pointer',fontSize:9}}>✕</button>}
          </div>
          <div style={{background:isMine?T.inputBg:'transparent',border:`1px solid ${isMine?T.gold:T.border}`,borderRadius:isMine?'12px 12px 2px 12px':'12px 12px 12px 2px',padding:'8px 12px',fontSize:13,color:T.text,maxWidth:'85%',lineHeight:1.6}}>{m.mensagem}</div>
        </div>
      })}
      <div ref={bottomRef}/>
    </div>
    {user?<div style={{padding:'12px 16px',borderTop:`1px solid ${T.border}`,display:'flex',gap:8}}>
      <input value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Sua oferta..." style={{flex:1,background:T.inputBg,border:`1px solid ${T.border2}`,borderRadius:10,padding:'9px 12px',fontSize:13,color:T.text,fontFamily:"'DM Sans',sans-serif",outline:'none'}}/>
      <Btn onClick={send} T={T} style={{padding:'9px 14px'}}>→</Btn>
    </div>:<div style={{padding:14,borderTop:`1px solid ${T.border}`,fontSize:12,color:T.textMuted,textAlign:'center'}}>Faça login para enviar ofertas</div>}
  </div>
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({onClose, T}) {
  const [step, setStep] = useState(0)
  const steps = [
    {emoji:'🐄',title:'Bem-vindo ao GVRPNL',text:'Sistema oficial de pecuária do servidor. Aqui você compra, cria, acompanha e vende gado — tudo registrado e rastreável.'},
    {emoji:'🌱',title:'O ciclo em 4 semanas',text:'Bezerro (sem. 1) → Garrote (sem. 2) → Boi (sem. 3) → Abate (sem. 4). Só o abate gera addmoney no servidor. As demais etapas são negociação entre jogadores.'},
    {emoji:'🌾',title:'Ração é estratégia',text:'Cada animal consome ração. Com mais de 400 cabeças no servidor a ração encarece automaticamente — a margem cai. Entrar cedo paga mais.'},
    {emoji:'🤝',title:'Venda quando quiser',text:'A partir do Garrote você pode vender para outro jogador pelo chat ao vivo. Mais rápido, menos margem. A escolha é sua. Boa criação!'},
  ]
  const s = steps[step]
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)'}}>
    <div className="page-enter" style={{background:T.card,border:`1px solid ${T.border2}`,borderRadius:20,padding:40,maxWidth:420,width:'100%',textAlign:'center',boxShadow:'0 30px 80px rgba(0,0,0,.5)'}}>
      <div style={{fontSize:60,marginBottom:20}}>{s.emoji}</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:T.text,marginBottom:12}}>{s.title}</h2>
      <p style={{fontSize:14,color:T.textDim,lineHeight:1.8,marginBottom:28}}>{s.text}</p>
      <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:28}}>
        {steps.map((_,i)=><div key={i} style={{width:i===step?24:8,height:8,borderRadius:4,background:i===step?T.gold:T.border,transition:'all .3s'}}/>)}
      </div>
      <div style={{display:'flex',gap:10}}>
        {step>0&&<Btn v="ghost" onClick={()=>setStep(step-1)} T={T} style={{flex:1}}>← Anterior</Btn>}
        {step<steps.length-1
          ?<Btn onClick={()=>setStep(step+1)} T={T} style={{flex:1}}>Próximo →</Btn>
          :<Btn onClick={()=>{sounds.success();onClose()}} T={T} style={{flex:1}}>Começar! 🚀</Btn>
        }
      </div>
    </div>
  </div>
}

// ─── Notif Bell ───────────────────────────────────────────────────────────────
function NotifBell({notifs, onRead, T}) {
  const [open, setOpen] = useState(false)
  const naoLidas = notifs.filter(n=>!n.lida).length
  return <div style={{position:'relative'}}>
    <button onClick={()=>{setOpen(!open);sounds.click()}} style={{background:'none',border:`1px solid ${T.border2}`,borderRadius:10,padding:'7px 11px',cursor:'pointer',color:T.text,position:'relative',fontSize:16,transition:'border-color .15s'}} onMouseEnter={e=>e.target.style.borderColor=T.gold} onMouseLeave={e=>e.target.style.borderColor=T.border2}>
      🔔
      {naoLidas>0&&<span style={{position:'absolute',top:-5,right:-5,background:'#e06060',color:'#fff',borderRadius:'50%',width:17,height:17,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',animation:'pulse 2s infinite'}}>{naoLidas}</span>}
    </button>
    {open&&<div style={{position:'absolute',right:0,top:46,width:300,background:T.card,border:`1px solid ${T.border2}`,borderRadius:14,boxShadow:'0 12px 40px rgba(0,0,0,.3)',zIndex:150,overflow:'hidden',animation:'fadeIn .2s ease'}}>
      <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:T.inputBg}}>
        <span style={{fontSize:13,fontWeight:600,color:T.text}}>Notificações</span>
        {naoLidas>0&&<button onClick={()=>{onRead('all');setOpen(false)}} style={{background:'none',border:'none',color:T.gold,fontSize:11,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>Marcar todas lidas</button>}
      </div>
      <div style={{maxHeight:300,overflowY:'auto'}}>
        {notifs.length===0&&<div style={{padding:24,textAlign:'center',color:T.textMuted,fontSize:13}}>Nenhuma notificação</div>}
        {notifs.map(n=><div key={n.id} onClick={()=>onRead(n.id)} style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,cursor:'pointer',background:n.lida?'transparent':T.inputBg,transition:'background .15s'}}>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:2}}>{n.titulo}</div>
          <div style={{fontSize:11,color:T.textDim,lineHeight:1.5}}>{n.mensagem}</div>
          <div style={{fontSize:10,color:T.textMuted,marginTop:4}}>{new Date(n.criado_em).toLocaleDateString('pt-BR')}</div>
        </div>)}
      </div>
    </div>}
  </div>
}

// ─── Animal Card ──────────────────────────────────────────────────────────────
function AnimalCard({fase, mercado, T}) {
  const imgs = {
    bezerro:'/bezerro.jpg',
    garrote:'/garrote.jpg',
    boi:'/boi.jpg',
    abatido:'/picanha.jpg'
  }
  const precoMap = {bezerro:mercado?.precos?.bezerro,garrote:mercado?.precos?.garrote,boi:mercado?.precos?.boi,abatido:mercado?.precos?.abate}
  const origem = {bezerro:'Gov. NPC — fixo',garrote:'Livre entre jogadores',boi:'Livre entre jogadores',abatido:'Frigorífico NPC'}
  const badgeT = {bezerro:'info',garrote:'warn',boi:'gray',abatido:'gold'}
  const [hov, setHov] = useState(false)
  return <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:T.card,border:`1px solid ${hov?T.gold:T.border}`,borderRadius:16,overflow:'hidden',transition:'all .25s ease',transform:hov?'translateY(-4px)':'translateY(0)',boxShadow:hov?`0 16px 48px rgba(200,146,42,.25)`:'0 2px 12px rgba(0,0,0,.15)',cursor:'default'}}>
    <div style={{height:140,overflow:'hidden',position:'relative',background:'#0a0802'}}>
      <img src={imgs[fase]} alt={FASES[fase]} style={{width:'100%',height:'100%',objectFit:'cover',filter:`brightness(.75) saturate(.9)`,transition:'transform .4s ease',transform:hov?'scale(1.06)':'scale(1)'}} onError={e=>e.target.style.display='none'}/>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 60%)'}}/>
      <div style={{position:'absolute',top:10,left:10}}><Badge type={badgeT[fase]}>Semana {SEMANAS[fase]}</Badge></div>
    </div>
    <div style={{padding:'14px 16px'}}>
      <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:2,fontFamily:"'Playfair Display',serif"}}>{FASES[fase]}</div>
      <div style={{fontSize:11,color:T.textMuted,marginBottom:10}}>{PESOS[fase]} kg vivo</div>
      <div style={{fontSize:22,fontWeight:800,color:fase==='abatido'?T.gold:T.text,fontFamily:"'Playfair Display',serif"}}>${fmt(precoMap[fase])}</div>
      <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>{origem[fase]}</div>
    </div>
  </div>
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {id:'mercado',icon:'📈',label:'Mercado',pub:true},
  {id:'comprar',icon:'🛒',label:'Comprar',pub:false},
  {id:'rebanho',icon:'🐄',label:'Rebanho',pub:false},
  {id:'venda',icon:'🤝',label:'Venda',pub:false},
  {id:'fazendas',icon:'🏡',label:'Fazendas',pub:true},
  {id:'pastagem',icon:'🌿',label:'Aluguel de Pasto',pub:true},
  {id:'minha_fazenda',icon:'🌾',label:'Minha Fazenda',pub:false},
  {id:'celeiro',icon:'🏚',label:'Celeiro',pub:false},
  {id:'transportadora',icon:'🚛',label:'Transportadora',pub:false},
  {id:'fretes_npc',icon:'🤖',label:'Fretes NPC',pub:false},
  {id:'concessionaria',icon:'🏢',label:'Concessionária',pub:false},
  {id:'lavoura',icon:'🌱',label:'Lavoura',pub:true,badge:'EM BREVE'},
  {id:'noticias',icon:'📰',label:'Notícias',pub:true,hot:true},
  {id:'ranking',icon:'🏆',label:'Ranking',pub:true},
  {id:'ajuda',icon:'❓',label:'Ajuda',pub:true},
  {id:'perfil',icon:'👤',label:'Perfil',pub:false},
  {id:'admin',icon:'⚙️',label:'Admin',pub:false,admin:true},
  {id:'hist',icon:'📋',label:'Histórico',pub:false,admin:true},
]

function Sidebar({page, setPage, user, T, collapsed}) {
  const items = NAV_ITEMS.filter(n=>n.pub||user).filter(n=>!n.admin||user?.role==='admin')
  return <div style={{width:collapsed?64:200,flexShrink:0,background:T.navBg,borderRight:`1px solid ${T.border}`,display:'flex',flexDirection:'column',padding:'12px 8px',gap:4,transition:'width .25s ease',overflowX:'hidden'}}>
    {items.map(n=>{
      const active = page===n.id
      const idleColor = active ? T.gold : n.hot ? '#f87171' : T.textMuted
      return <button key={n.id} onClick={()=>{sounds.click();setPage(n.id)}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,border:'none',cursor:'pointer',background:active?`rgba(194,140,70,.15)`:n.hot&&!active?'rgba(248,113,113,.06)':'transparent',color:idleColor,transition:'all .15s',whiteSpace:'nowrap',fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:active?600:400,textAlign:'left'}} onMouseEnter={e=>{if(!active){e.currentTarget.style.background=T.inputBg;e.currentTarget.style.color=T.text}}} onMouseLeave={e=>{if(!active){e.currentTarget.style.background=n.hot?'rgba(248,113,113,.06)':'transparent';e.currentTarget.style.color=idleColor}}}>
        <span style={{fontSize:18,flexShrink:0}}>{n.icon}</span>
        {!collapsed&&<span>{n.label}</span>}
        {!collapsed&&n.badge&&!active&&<span style={{marginLeft:'auto',fontSize:8,fontWeight:800,letterSpacing:1,background:n.hot?'rgba(248,113,113,.2)':'rgba(194,140,70,.2)',color:n.hot?'#f87171':T.gold,padding:'2px 5px',borderRadius:3,border:`1px solid ${n.hot?'rgba(248,113,113,.4)':'rgba(194,140,70,.4)'}`}}>{n.badge}</span>}
        {active&&!collapsed&&<div style={{marginLeft:'auto',width:4,height:4,borderRadius:'50%',background:T.gold}}/>}
        {n.hot&&!active&&!collapsed&&<div style={{marginLeft:n.badge?4:'auto',width:6,height:6,borderRadius:'50%',background:'#f87171',animation:'blinkDot 1s step-end infinite',flexShrink:0}}/>}
      </button>
    })}
  </div>
}

// ─── Drawer (Mobile) ──────────────────────────────────────────────────────────
function Drawer({open, onClose, page, setPage, user, T}) {
  const items = NAV_ITEMS.filter(n=>n.pub||user).filter(n=>!n.admin||user?.role==='admin')
  if(!open) return null
  return <>
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:300,backdropFilter:'blur(2px)'}}/>
    <div className="drawer-open" style={{position:'fixed',top:0,left:0,width:260,height:'100vh',background:T.navBg,borderRight:`1px solid ${T.border2}`,zIndex:310,display:'flex',flexDirection:'column',padding:'20px 12px 40px',gap:4,overflowY:'auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,paddingBottom:16,borderBottom:`1px solid ${T.border}`}}>
        <div style={{width:36,height:36,borderRadius:8,overflow:'hidden'}}><img src="/logo.png" alt="GVRPNL" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:T.gold,letterSpacing:'.5px',lineHeight:1}}>GVRPNL</div>
          <div style={{fontSize:9,color:T.textMuted,letterSpacing:'1px',fontWeight:600}}>PECUÁRIA</div>
        </div>
        <button onClick={onClose} style={{marginLeft:'auto',background:'none',border:'none',color:T.textMuted,fontSize:22,cursor:'pointer'}}>×</button>
      </div>
      {items.map(n=>{
        const active = page===n.id
        return <button key={n.id} onClick={()=>{sounds.click();setPage(n.id);onClose()}} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:8,border:'none',cursor:'pointer',background:active?`rgba(194,140,70,.15)`:n.hot&&!active?'rgba(248,113,113,.06)':'transparent',color:active?T.gold:n.hot?'#f87171':T.textMuted,transition:'all .15s',fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:active?600:400,textAlign:'left'}}>
          <span style={{fontSize:20}}>{n.icon}</span>
          <span>{n.label}</span>
          {n.badge&&!active&&<span style={{marginLeft:'auto',fontSize:8,fontWeight:800,letterSpacing:1,background:n.hot?'rgba(248,113,113,.2)':'rgba(194,140,70,.2)',color:n.hot?'#f87171':T.gold,padding:'2px 5px',borderRadius:3}}>{n.badge}</span>}
          {active&&<div style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:T.gold}}/>}
          {n.hot&&!active&&<div style={{width:7,height:7,borderRadius:'50%',background:'#f87171',animation:'blinkDot 1s step-end infinite'}}/>}
        </button>
      })}
    </div>
  </>
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true)
  const T = dark ? D : L
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState('mercado')
  const [pageKey, setPageKey] = useState(0)
  const [soundOn, setSoundOn] = useState(true)
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [authTab, setAuthTab] = useState('login')
  const [loginForm, setLoginForm] = useState({username:'',password:''})
  const [loginErr, setLoginErr] = useState('')
  const [regForm, setRegForm] = useState({username:'',password:'',fazenda:''})
  const [regErr, setRegErr] = useState('')
  const [regOk, setRegOk] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [mercado, setMercado] = useState(null)
  const [lotes, setLotes] = useState([])
  const [anuncios, setAnuncios] = useState([])
  const [trans, setTrans] = useState([])
  const [users, setUsers] = useState([])
  const [solic, setSolic] = useState([])
  const [racao, setRacao] = useState(null)
  const [notifs, setNotifs] = useState([])
  const [ranking, setRanking] = useState([])
  const [adminLog, setAdminLog] = useState([])
  const [minhasFazendas, setMinhasFazendas] = useState([])
  const [fazendas, setFazendas] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [editPerfil, setEditPerfil] = useState({fazenda:'',foto_url:'',bio:'',nova_senha:''})
  const [editTarget, setEditTarget] = useState(null)
  const [notification, setNotification] = useState('')
  const [notifType, setNotifType] = useState('success')
  const [chatAnuncio, setChatAnuncio] = useState(null)
  const [compraQt, setCompraQt] = useState(1)
  const [faseAberta, setFaseAberta] = useState(null)
  const [compraComp, setCompraComp] = useState('')
  const [compraStep, setCompraStep] = useState(1)
  const [confirmReset, setConfirmReset] = useState(false)
  const [dividirLote, setDividirLote] = useState(null)
  const [dividirQtd, setDividirQtd] = useState('')
  const [viewProfile, setViewProfile] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [nLote, setNLote] = useState({jogador_id:'',jogador_nome:'',fazenda:'',fazenda_id:'',quantidade:1,valor_compra:800,data_compra:'',comprovante:''})
  const [nUser, setNUser] = useState({username:'',password:'',fazenda:''})
  const [nAnuncio, setNAnuncio] = useState({lote_id:'',preco_pedido:'',obs:''})
  const [p2p, setP2p] = useState({anuncio_id:'',comprador_nome:'',preco_final:'',lote_id:''})
  const [nRacao, setNRacao] = useState({jogador_id:'',kg:'',valor:''})
  const [rebanhoHist, setRebanhoHist] = useState([])
  const [precoHist, setPrecoHist] = useState([])

  const api = useCallback(async (path, opts={}) => {
    const h = {'Content-Type':'application/json'}
    if(token) h['Authorization']=`Bearer ${token}`
    const r = await fetch(path,{...opts,headers:h})
    if(r.status===401){
      localStorage.removeItem('gvrpnl_token')
      localStorage.removeItem('gvrpnl_user')
      window.location.reload()
      return {}
    }
    return r.json()
  },[token])

  function changePage(p) {
    sounds.click()
    setPage(p)
    setPageKey(k=>k+1)
  }

  useEffect(()=>{
    const d = localStorage.getItem('gvrpnl_dark')
    if(d!==null) setDark(d==='true')
    const s = localStorage.getItem('gvrpnl_sound')
    if(s!==null) setSoundOn(s==='true')
    const t = localStorage.getItem('gvrpnl_token')
    const u = localStorage.getItem('gvrpnl_user')
    if(t&&u){setToken(t);setUser(JSON.parse(u))}
  },[])

  useEffect(()=>{
    fetch('/api/mercado').then(r=>r.json()).then(d=>{
      setMercado(d)
      setRebanhoHist(prev=>[...prev.slice(-6), d?.rebanho?.total||0])
      setPrecoHist(prev=>[...prev.slice(-6), d?.precos?.precoKg||3])
    })
    fetch('/api/ranking').then(r=>r.json()).then(setRanking)
    fetch('/api/fazendas').then(r=>r.json()).then(setFazendas)
  },[])

  const safeArr = d => Array.isArray(d) ? d : []
  const reload = useCallback(()=>{
    if(!token) return
    api('/api/lotes').then(d=>setLotes(safeArr(d)))
    api('/api/anuncios').then(d=>setAnuncios(safeArr(d)))
    api('/api/transacoes').then(d=>setTrans(safeArr(d)))
    api('/api/solicitacoes').then(d=>setSolic(safeArr(d)))
    api('/api/racao').then(d=>{if(!d?.error) setRacao(d)})
    api('/api/notificacoes').then(d=>setNotifs(safeArr(d)))
    api('/api/fazendas?minha=1').then(d=>setMinhasFazendas(safeArr(d)))
    api('/api/perfil').then(p=>{if(!p?.error){setPerfil(p);setEditPerfil({fazenda:p.fazenda||'',foto_url:p.foto_url||'',bio:p.bio||'',nova_senha:''})}})
    if(user?.role==='admin'){api('/api/admin/usuarios').then(d=>setUsers(safeArr(d)));api('/api/admin/log').then(d=>setAdminLog(safeArr(d)))}
  },[token,api,user])

  useEffect(()=>{reload()},[reload])

  useEffect(()=>{
    if(!token) return
    const iv = setInterval(()=>{
      if(!document.hidden) api('/api/notificacoes').then(setNotifs)
    }, 60000)
    return ()=>clearInterval(iv)
  },[token,api])

  const notify = (m, t='success') => {
    setNotification(m); setNotifType(t)
    if(soundOn) { t==='success'?sounds.success():sounds.error() }
    setTimeout(()=>setNotification(''), 4000)
  }

  function toggleDark(){const nd=!dark;setDark(nd);localStorage.setItem('gvrpnl_dark',nd);document.documentElement.setAttribute('data-theme',nd?'dark':'light')}
  function toggleSound(){const ns=!soundOn;setSoundOn(ns);localStorage.setItem('gvrpnl_sound',ns)}

  async function login() {
    setLoginErr('')
    const r = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(loginForm)})
    const d = await r.json()
    if(d.error) return setLoginErr(d.error)
    localStorage.setItem('gvrpnl_token',d.token)
    localStorage.setItem('gvrpnl_user',JSON.stringify(d.user))
    setToken(d.token); setUser(d.user)
    if(!d.user.onboarding_ok) setShowOnboarding(true)
    changePage(d.user.role==='admin'?'admin':'rebanho')
    sounds.success()
  }

  async function register() {
    setRegErr('')
    const r = await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(regForm)})
    const d = await r.json()
    if(d.error) return setRegErr(d.error)
    setRegOk(true)
  }

  function logout(){
    localStorage.removeItem('gvrpnl_token');localStorage.removeItem('gvrpnl_user')
    setToken(null);setUser(null);changePage('mercado')
  }

  async function readNotif(id){
    await api('/api/notificacoes',{method:'PATCH',body:JSON.stringify({id})})
    setNotifs(n=>id==='all'?n.map(x=>({...x,lida:true})):n.map(x=>x.id===id?{...x,lida:true}:x))
  }

  async function salvarPerfil(targetId){
    const body = targetId?{...editPerfil,target_id:targetId}:editPerfil
    const r = await api('/api/perfil',{method:'PATCH',body:JSON.stringify(body)})
    if(r.error) return notify('Erro: '+r.error,'danger')
    sounds.coin(); notify('✓ Perfil atualizado!')
    reload(); setEditTarget(null)
  }

  function calcCot(qty){
    if(!mercado||!qty) return null
    const{precos}=mercado
    const r=precos.precoRacao
    const custoBezerros=qty*precos.bezerro
    const custoFrete=qty*precos.frete
    const custoRacaoBezerro=Math.round(qty*21*r*100)/100
    const custoRacaoGarrote=Math.round(qty*35*r*100)/100
    const custoRacaoBoi=Math.round(qty*56*r*100)/100
    const custoRacao=custoRacaoBezerro+custoRacaoGarrote+custoRacaoBoi
    const total=custoBezerros+custoFrete+custoRacao
    const receita=qty*precos.abate
    const receitaGarrote=qty*precos.garrote
    const receitaBoi=qty*precos.boi
    const margemGarrote=((receitaGarrote-(custoBezerros+custoFrete+custoRacaoBezerro+custoRacaoGarrote))/receitaGarrote*100).toFixed(1)
    const margemBoi=((receitaBoi-(custoBezerros+custoFrete+custoRacaoBezerro+custoRacaoGarrote+custoRacaoBoi))/receitaBoi*100).toFixed(1)
    const margem=((receita-total)/receita*100).toFixed(1)
    return{custoBezerros,custoFrete,custoRacao,custoRacaoBezerro,custoRacaoGarrote,custoRacaoBoi,total,receita,receitaGarrote,receitaBoi,margem,margemGarrote,margemBoi,qty}
  }

  const meusLotes = lotes.filter(l=>String(l.jogador_id)===String(user?.id))
  const todosLotes = lotes
  const abatesPend = lotes.filter(l=>l.status==='aguardando_pagamento')
  const solicPend = solic.filter(s=>s.status==='pendente')
  const usersPend = users.filter(u=>u.status==='pendente')
  const consumoDiario = meusLotes.filter(l=>l.status==='ativo').reduce((s,l)=>s+({bezerro:3,garrote:5,boi:8,abatido:0}[l.fase]||0)*l.quantidade,0)
  const diasRacaoLeft = racao?.kg_disponivel>0&&consumoDiario>0?Math.floor(racao.kg_disponivel/consumoDiario):null
  const cot = calcCot(compraQt)

  const gs = (min) => ({display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(${min}px,1fr))`,gap:14})

  return <>
    <Head>
      <title>GVRPNL — Pecuária</title>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <style>{CSS}</style>
    </Head>

    {showOnboarding&&<Onboarding onClose={async()=>{await api('/api/perfil',{method:'POST'});setShowOnboarding(false)}} T={T}/>}
    {chatAnuncio&&<ChatPanel anuncio={chatAnuncio} user={user} token={token} onClose={()=>setChatAnuncio(null)} T={T}/>}

    <div style={{display:'flex',height:'100vh',background:T.bg,color:T.text,overflow:'hidden'}}>

      {/* Desktop Sidebar */}
      <div className="desktop-only">
        <Sidebar page={page} setPage={changePage} user={user} T={T} collapsed={sidebarCollapsed}/>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} page={page} setPage={changePage} user={user} T={T}/>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Header */}
        <div style={{background:T.navBg,borderBottom:`1px solid ${T.border}`,padding:'0 20px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {/* Hamburguer mobile */}
            <button className="mobile-only" onClick={()=>setDrawerOpen(true)} style={{background:'none',border:`1px solid ${T.border2}`,borderRadius:8,padding:'6px 10px',cursor:'pointer',fontSize:18,color:T.text}}>☰</button>
            {/* Logo desktop */}
            <div className="desktop-only" style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setSidebarCollapsed(!sidebarCollapsed)}>
              <div style={{width:34,height:34,borderRadius:8,overflow:'hidden',flexShrink:0}}>
                <img src="/logo.png" alt="GVRPNL" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:T.gold,letterSpacing:'.5px',lineHeight:1}}>GVRPNL</div>
                <div style={{fontSize:9,color:T.textMuted,letterSpacing:'1px',fontWeight:600}}>PECUÁRIA</div>
              </div>
            </div>
            {/* Titulo página mobile */}
            <div className="mobile-only" style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Playfair Display',serif"}}>
              {NAV_ITEMS.find(n=>n.id===page)?.icon} {NAV_ITEMS.find(n=>n.id===page)?.label}
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={toggleSound} title={soundOn?'Silenciar':'Ativar sons'} style={{background:'none',border:`1px solid ${T.border2}`,borderRadius:8,padding:'6px 9px',cursor:'pointer',fontSize:14,color:T.textMuted,transition:'all .15s'}}>{soundOn?'🔊':'🔇'}</button>
            <button onClick={toggleDark} style={{background:'none',border:`1px solid ${T.border2}`,borderRadius:8,padding:'6px 9px',cursor:'pointer',fontSize:14,color:T.textMuted,transition:'all .15s'}}>{dark?'☀️':'🌙'}</button>
            {user&&<NotifBell notifs={notifs} onRead={readNotif} T={T}/>}
            {user?<>
              <div className="desktop-only" style={{fontSize:12,color:T.textMuted}}>
                <div style={{color:T.text,fontWeight:600,lineHeight:1}}>{user.username}</div>
                {user.fazenda&&<div style={{fontSize:10}}>Faz. {user.fazenda}</div>}
              </div>
              <Btn v="ghost" onClick={logout} T={T} style={{padding:'6px 12px',fontSize:12}}>Sair</Btn>
            </>:<Btn onClick={()=>changePage('login')} T={T} style={{padding:'7px 16px'}}>Entrar</Btn>}
          </div>
        </div>

        {/* Notification Bar */}
        {notification&&<div style={{background:notifType==='success'?'#011a08':'#1a0404',color:notifType==='success'?T.green:'#f87171',padding:'10px 20px',fontSize:13,textAlign:'center',borderBottom:`1px solid ${notifType==='success'?T.greenDark:'#450a0a'}`,fontWeight:500,fontFamily:"'DM Mono',monospace",animation:'fadeIn .3s ease'}}>{notification}</div>}

        {/* Page Content */}
        <div key={pageKey} className="page-enter" style={{flex:1,overflowY:'auto',padding:'24px 24px',maxWidth:1200,width:'100%',margin:'0 auto',boxSizing:'border-box'}}>

          {/* LOGIN */}
          {(page==='login'||page==='cadastro')&&!user&&(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'70vh'}}>
              <div style={{background:T.card,border:`1px solid ${T.border2}`,borderRadius:20,padding:40,width:'100%',maxWidth:380,boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
                <div style={{textAlign:'center',marginBottom:28}}>
                  <div style={{width:72,height:72,borderRadius:16,overflow:'hidden',margin:'0 auto 14px',boxShadow:'0 8px 24px rgba(0,0,0,.3)'}}>
                    <img src="/logo.png" alt="GVRPNL" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  </div>
                  <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:T.text,marginBottom:4}}>GVRPNL</h1>
                  <p style={{fontSize:12,color:T.textMuted,letterSpacing:'1.5px',fontWeight:600,textTransform:'uppercase'}}>Sistema de Pecuária</p>
                </div>
                <div style={{display:'flex',marginBottom:24,background:T.inputBg,borderRadius:12,padding:4}}>
                  {['login','cadastro'].map(tb=>(
                    <button key={tb} onClick={()=>{setAuthTab(tb);setPage(tb);setLoginErr('');setRegErr('');setRegOk(false)}} style={{flex:1,background:authTab===tb?`linear-gradient(135deg,${T.goldDark},${T.gold})`:'transparent',border:'none',color:authTab===tb?'#fff':T.textMuted,fontSize:13,padding:'8px 0',borderRadius:9,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:authTab===tb?600:400,transition:'all .2s'}}>
                      {tb==='login'?'Entrar':'Cadastrar'}
                    </button>
                  ))}
                </div>
                {authTab==='login'?<>
                  <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:18}}>
                    <Inp T={T} label="Usuário" value={loginForm.username} onChange={e=>setLoginForm(f=>({...f,username:e.target.value}))} placeholder="seu_usuario"/>
                    <Inp T={T} label="Senha" type="password" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))} placeholder="••••••" onKeyDown={e=>e.key==='Enter'&&login()}/>
                  </div>
                  {loginErr&&<Alrt type="danger">{loginErr}</Alrt>}
                  <Btn onClick={login} T={T} style={{width:'100%',padding:12,fontSize:14}}>Entrar no servidor</Btn>
                </>:regOk?<div style={{textAlign:'center',padding:'20px 0'}}>
                  <div style={{fontSize:48,marginBottom:12}}>✅</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.gold,fontWeight:700,marginBottom:8}}>Cadastro enviado!</div>
                  <p style={{fontSize:13,color:T.textDim,lineHeight:1.7}}>Aguarde o admin aprovar. Você receberá acesso em breve.</p>
                  <Btn v="ghost" onClick={()=>{setRegOk(false);setAuthTab('login');setPage('login')}} T={T} style={{marginTop:16,width:'100%'}}>Ir para login</Btn>
                </div>:<>
                  <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:18}}>
                    <Inp T={T} label="Usuário" value={regForm.username} onChange={e=>setRegForm(f=>({...f,username:e.target.value}))} placeholder="nome_no_servidor"/>
                    <Inp T={T} label="Senha" type="password" value={regForm.password} onChange={e=>setRegForm(f=>({...f,password:e.target.value}))} placeholder="mínimo 6 caracteres"/>

                  </div>
                  {regErr&&<Alrt type="danger">{regErr}</Alrt>}
                  <Btn onClick={register} T={T} style={{width:'100%',padding:12,fontSize:14}}>Solicitar cadastro</Btn>
                  <p style={{fontSize:11,color:T.textMuted,textAlign:'center',marginTop:12}}>O admin irá aprovar seu acesso</p>
                </>}
              </div>
            </div>
          )}

          {/* MERCADO */}
          {page==='mercado'&&<>
            {/* Ticker ao vivo — PREGÃO */}
            <div style={{background:'#0a0706',borderBottom:'1px solid #8a602c',height:32,display:'flex',alignItems:'center',overflow:'hidden',marginBottom:20,marginLeft:-20,marginRight:-20}}>
              <div style={{background:'var(--gold)',color:'#000',fontFamily:'var(--font-data)',fontSize:11,fontWeight:700,letterSpacing:2,padding:'0 16px',height:'100%',display:'flex',alignItems:'center',flexShrink:0,borderRight:'1px solid #8a602c'}}>PREGÃO AO VIVO</div>
              <div style={{overflow:'hidden',flex:1}}>
                <div style={{display:'flex',animation:'tickerScroll 30s linear infinite'}}>
                  {[
                    {sym:'BZR',val:`$${fmt(mercado?.precos?.bezerro||800)}`,chg:'GOV.NPC',c:'#a6968a'},
                    {sym:'GRR',val:`$${fmt(mercado?.precos?.garrote||0)}`,chg:mercado?.precos?.garrote?`+${((mercado.precos.garrote/(mercado.precos.bezerro||800)-1)*100).toFixed(1)}%`:'—',c:'#4ade80'},
                    {sym:'BOI',val:`$${fmt(mercado?.precos?.boi||0)}`,chg:mercado?.precos?.boi?`+${((mercado.precos.boi/(mercado.precos.bezerro||800)-1)*100).toFixed(1)}%`:'—',c:'#4ade80'},
                    {sym:'FGR',val:`$${fmt(mercado?.precos?.abate||0)}`,chg:mercado?.precos?.abate?`+${((mercado.precos.abate/(mercado.precos.bezerro||800)-1)*100).toFixed(1)}%`:'—',c:'#4ade80'},
                    {sym:'RCO',val:`$${mercado?.precos?.precoRacao||2}/KG`,chg:mercado?.precos?.precoRacao>2?'ALTA':'NORMAL',c:mercado?.precos?.precoRacao>2?'#f87171':'#4ade80'},
                    {sym:'REB',val:`${mercado?.rebanho?.total||0} CAB`,chg:'ATIVO',c:'#a6968a'},
                    {sym:'MRG',val:`${mercado?.margem||'~30'}%`,chg:'BZR-FGR',c:'#4ade80'},
                  ].concat([
                    {sym:'BZR',val:`$${fmt(mercado?.precos?.bezerro||800)}`,chg:'GOV.NPC',c:'#a6968a'},
                    {sym:'GRR',val:`$${fmt(mercado?.precos?.garrote||0)}`,chg:'—',c:'#4ade80'},
                    {sym:'BOI',val:`$${fmt(mercado?.precos?.boi||0)}`,chg:'—',c:'#4ade80'},
                    {sym:'FGR',val:`$${fmt(mercado?.precos?.abate||0)}`,chg:'—',c:'#4ade80'},
                    {sym:'RCO',val:`$${mercado?.precos?.precoRacao||2}/KG`,chg:'',c:'#a6968a'},
                    {sym:'REB',val:`${mercado?.rebanho?.total||0} CAB`,chg:'ATIVO',c:'#a6968a'},
                    {sym:'MRG',val:`${mercado?.margem||'~30'}%`,chg:'BZR-FGR',c:'#4ade80'},
                  ]).map((it,i)=>(
                    <span key={i} style={{fontSize:11,padding:'0 20px',display:'flex',gap:8,alignItems:'center',borderRight:'1px solid #36251e',fontFamily:'var(--font-data)',whiteSpace:'nowrap'}}>
                      <span style={{color:'#5c4a42',fontWeight:400,fontSize:10}}>{it.sym}</span>
                      <span style={{fontWeight:700,letterSpacing:0.5,color:'var(--ice)'}}>{it.val}</span>
                      <span style={{color:it.c,fontSize:10}}>{it.chg}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Breaking news banner */}
            <div onClick={()=>setPage('noticias')} style={{cursor:'pointer',marginBottom:16,background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.35)',borderLeft:'3px solid #f87171',borderRadius:6,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,animation:'fadeSlideIn .4s ease'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(248,113,113,.14)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(248,113,113,.08)'}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#f87171',animation:'blinkDot 1s step-end infinite',flexShrink:0}}/>
              <span style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#f87171',fontFamily:'var(--font-data)',flexShrink:0}}>URGENTE</span>
              <span style={{fontSize:12,color:'#eaddcf',fontWeight:600,fontFamily:'var(--font-data)',letterSpacing:0.3}}>Preço do gado dispara com escalada da tensão no Oriente Médio — Bezerro a $950 · Abate acima de $2.000</span>
              <span style={{marginLeft:'auto',fontSize:10,color:'#f87171',fontWeight:700,flexShrink:0,fontFamily:'var(--font-data)'}}>LER →</span>
            </div>

            {/* Header mercado */}
            <div style={{marginBottom:20,paddingBottom:14,borderBottom:'1px solid var(--border)',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:12}}>
              <div>
                <h1 style={{fontFamily:'var(--font-title)',fontSize:30,letterSpacing:1,color:'var(--ice)',lineHeight:1,fontWeight:700}}>Mercado <span style={{color:'var(--gold)'}}>/ Cotações</span></h1>
                <p style={{fontSize:11,color:'var(--ice3)',letterSpacing:0.5,fontFamily:'var(--font-data)',fontWeight:400,marginTop:6}}>Preços em tempo real — baseados no rebanho ativo do servidor</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:'var(--grn)',animation:'blinkDot 1.2s step-end infinite',boxShadow:'0 0 6px #4ade80'}}/>
                <span style={{fontSize:11,color:'var(--grn)',fontWeight:600,letterSpacing:1,fontFamily:'var(--font-data)'}}>PREGÃO ABERTO</span>
              </div>
            </div>

            {/* Cards de animais */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:20}}>
              {['bezerro','garrote','boi','abatido'].map(f=>{
                const imgs={bezerro:'/bezerro.jpg',garrote:'/garrote.jpg',boi:'/boi.jpg',abatido:'/picanha.jpg'}
                const precoMap={bezerro:mercado?.precos?.bezerro,garrote:mercado?.precos?.garrote,boi:mercado?.precos?.boi,abatido:mercado?.precos?.abate}
                const origemMap={bezerro:'Gov. NPC — Fixo',garrote:'Livre P2P',boi:'Livre P2P',abatido:'Frigorífico NPC'}
                const isAbate=f==='abatido'
                return <div key={f} style={{background:'var(--card)',border:`1px solid ${isAbate?'var(--rust2)':'var(--border)'}`,borderRadius:8,overflow:'hidden',transition:'all .2s ease',boxShadow:'0 4px 16px rgba(0,0,0,.4)'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=isAbate?'var(--gold)':'var(--gold-dim)';e.currentTarget.style.boxShadow='0 8px 32px rgba(194,140,70,.2)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor=isAbate?'var(--rust2)':'var(--border)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.4)'}}>
                  <div style={{height:90,overflow:'hidden',position:'relative',background:'#0a0706'}}>
                    <img src={imgs[f]} alt={FASES[f]} style={{width:'100%',height:'100%',objectFit:'cover',filter:`brightness(${isAbate?'.45':'.55'}) saturate(.8)`,display:'block'}} onError={e=>e.target.style.display='none'}/>
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(21,15,12,.7) 0%,transparent 60%)'}}/>
                    <div style={{position:'absolute',top:8,left:8,background:isAbate?'rgba(248,113,113,.15)':'rgba(194,140,70,.15)',color:isAbate?'var(--red)':'var(--gold)',fontFamily:'var(--font-data)',fontSize:9,fontWeight:700,letterSpacing:2,padding:'3px 8px',borderRadius:4,border:`1px solid ${isAbate?'var(--red)':'var(--gold-dim)'}`}}>S{SEMANAS[f]}</div>
                  </div>
                  <div style={{padding:'12px 14px 16px'}}>
                    <div style={{fontFamily:'var(--font-title)',fontSize:18,fontWeight:700,color:isAbate?'var(--gold)':'var(--ice)',lineHeight:1,marginBottom:2}}>{FASES[f]}</div>
                    <div style={{fontSize:10,color:'var(--ice3)',letterSpacing:1,marginBottom:10,fontFamily:'var(--font-data)'}}>{PESOS[f]} kg vivo</div>
                    <div style={{background:'var(--bg)',border:'1px solid var(--border)',padding:'8px 10px',borderRadius:4,boxShadow:'inset 0 2px 8px rgba(0,0,0,.6)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                      <div>
                        <div style={{fontSize:9,color:'var(--ice3)',letterSpacing:1,marginBottom:2,fontFamily:'var(--font-data)'}}>PREÇO</div>
                        <div style={{fontFamily:'var(--font-data)',fontSize:20,fontWeight:700,color:isAbate?'var(--gold)':'var(--grn)',lineHeight:1}}>${fmt(precoMap[f])}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:9,color:'var(--ice3)',letterSpacing:1,marginBottom:2,fontFamily:'var(--font-data)'}}>ORIGEM</div>
                        <div style={{fontSize:10,color:'var(--ice2)',fontWeight:600,fontFamily:'var(--font-data)',letterSpacing:0.5}}>{origemMap[f]}</div>
                      </div>
                    </div>
                  </div>
                </div>
              })}
            </div>

            {/* Indicadores + Rebanho por fase */}
            <div style={gs(280)}>
              <div style={{background:'var(--card)',border:'1px solid var(--border)',borderLeft:'3px solid var(--gold)',borderRadius:8,padding:20,boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>
                <div style={{fontSize:10,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:16,borderBottom:'1px solid var(--border)',paddingBottom:10,fontFamily:'var(--font-data)'}}>Indicadores agora</div>
                <div style={gs(110)}>
                  <Metric T={T} label="Rebanho" value={`${mercado?.rebanho?.total||0}`} sub="cabecas ativas" color={mercado?.rebanho?.total>600?'var(--red)':mercado?.rebanho?.total>400?'var(--rust)':'var(--grn)'}/>
                  <Metric T={T} label="Margem est." value={`${mercado?.margem||'~30'}%`} sub="bezerro — abate" color="var(--grn)"/>
                  <Metric T={T} label="Racao atual" value={`$${mercado?.precos?.precoRacao||2}/kg`} sub="ciclo completo (bezerro—abate)" color={mercado?.precos?.precoRacao>2?'var(--rust)':'var(--ice2)'}/>
                  <Metric T={T} label="Custo/cab" value={`$${fmt(mercado?.precos?.custoRacao)}`} sub="racao total" color="var(--ice2)"/>
                </div>
                <div style={{marginTop:16}}>
                  <div style={{fontSize:9,color:'var(--ice3)',marginBottom:6,textTransform:'uppercase',letterSpacing:2,fontFamily:'var(--font-data)'}}>Rebanho · entradas recentes</div>
                  <MiniChart data={rebanhoHist.length>1?rebanhoHist:[0,mercado?.rebanho?.total||0]} color="#c28c46" T={T}/>
                </div>
                {mercado?.rebanho?.total>400&&<div style={{marginTop:12,background:mercado.rebanho.total>600?'var(--red2)':'var(--rust3)',border:`1px solid ${mercado.rebanho.total>600?'var(--red)':'var(--rust2)'}`,padding:'8px 12px',fontSize:11,color:mercado.rebanho.total>600?'var(--red)':'var(--gold)',borderRadius:4,letterSpacing:0.5,fontWeight:600,fontFamily:'var(--font-data)'}}>{mercado.rebanho.total>600?'⚠ Ração cara — Margem crítica':'↑ Demanda elevada — Ração em alta'}</div>}
              </div>

              <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:20,boxShadow:'0 4px 20px rgba(0,0,0,.5)'}}>
                <div style={{fontSize:10,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:16,borderBottom:'1px solid var(--border)',paddingBottom:10,fontFamily:'var(--font-data)'}}>Rebanho por fase</div>
                {['bezerro','garrote','boi'].map((f,idx)=>{
                  const qty=mercado?.rebanho?.[f]||0
                  const pct=Math.min((qty/400)*100,100)
                  const barColor=['var(--grn)','var(--rust)','var(--ice2)'][idx]
                  return <div key={f} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:11}}>
                      <span style={{color:'var(--ice2)',letterSpacing:1,textTransform:'uppercase',fontFamily:'var(--font-data)',fontWeight:500}}>{FASES[f]}</span>
                      <span style={{color:'var(--ice)',fontWeight:700,fontFamily:'var(--font-data)',fontSize:14,letterSpacing:0.5}}>{qty} cab.</span>
                    </div>
                    <div style={{background:'var(--input-bg)',height:5,borderRadius:4}}>
                      <div style={{width:`${pct}%`,height:'100%',background:barColor,transformOrigin:'left',animation:'barGrow .8s cubic-bezier(.4,0,.2,1) both'}}/>
                    </div>
                  </div>
                })}
                <div style={{marginTop:8,paddingTop:12,borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:10,color:'var(--ice3)',letterSpacing:0.5,fontFamily:'var(--font-data)'}}>Limite ração normal: 400 cab.</span>
                  <Badge type={mercado?.rebanho?.total>600?'danger':mercado?.rebanho?.total>400?'warn':'ok'}>{mercado?.rebanho?.total>600?'RACAO CARA':mercado?.rebanho?.total>400?'ELEVADA':'NORMAL'}</Badge>
                </div>
                <div style={{marginTop:20}}>
                  <div style={{fontSize:9,letterSpacing:2,color:'var(--ice3)',textTransform:'uppercase',marginBottom:10,fontFamily:'var(--font-data)'}}>Cotações</div>
                  {[{sym:'BZR',label:'Bezerro · S1',preco:mercado?.precos?.bezerro,chg:null,kill:false},{sym:'GRR',label:'Garrote · S2',preco:mercado?.precos?.garrote,chg:mercado?.precos?.garrote?`+${((mercado.precos.garrote/(mercado.precos.bezerro||800)-1)*100).toFixed(1)}%`:null,kill:false},{sym:'BOI',label:'Boi · S3',preco:mercado?.precos?.boi,chg:mercado?.precos?.boi?`+${((mercado.precos.boi/(mercado.precos.bezerro||800)-1)*100).toFixed(1)}%`:null,kill:false},{sym:'FGR',label:'Frigorífico · S4',preco:mercado?.precos?.abate,chg:mercado?.precos?.abate?`+${((mercado.precos.abate/(mercado.precos.bezerro||800)-1)*100).toFixed(1)}%`:null,kill:true}].map(row=>(
                    <div key={row.sym} style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:12,alignItems:'center',padding:'8px 0',borderBottom:`1px solid var(--border)`}}>
                      <div style={{fontSize:11,fontWeight:500,color:'var(--ice)',letterSpacing:0.5,fontFamily:'var(--font-data)'}}>{row.sym} · {row.label}</div>
                      <div style={{fontFamily:'var(--font-data)',fontSize:17,fontWeight:700,color:row.kill?'var(--gold)':'var(--grn)'}}>${fmt(row.preco)}</div>
                      <div style={{fontSize:11,fontWeight:600,minWidth:50,textAlign:'right',color:row.chg?'var(--grn)':'var(--ice3)',fontFamily:'var(--font-data)'}}>{row.chg||'FIXO'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>}
          {/* COMPRAR */}
          {page==='comprar'&&!user&&<Alrt type="warn">Faça login para solicitar uma compra.</Alrt>}
          {page==='comprar'&&user&&<>
            <SectionTitle T={T} icon="🛒" title="Comprar Bezerros" sub="O sistema calcula tudo — pague e envie o comprovante"/>
            {compraStep===3?<Card T={T} style={{maxWidth:480,margin:'0 auto',textAlign:'center',padding:48}} hover={false}>
              <div style={{fontSize:64,marginBottom:16}}>🎉</div>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.gold,marginBottom:10}}>Solicitação enviada!</h2>
              <p style={{fontSize:14,color:T.textDim,lineHeight:1.8,marginBottom:28}}>O admin irá verificar o comprovante e aprovar. Seu lote aparecerá no Rebanho.</p>
              <Btn onClick={()=>{setCompraStep(1);setCompraComp('');setCompraQt(1)}} T={T}>Nova cotação</Btn>
            </Card>:<div style={gs(280)}>
              <Card T={T} glow hover={false}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:20}}>{compraStep===1?'1. Simule sua compra':'2. Confirme e pague'}</div>
                {compraStep===1&&<>
                  <div style={{marginBottom:22}}>
                    <label style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px',display:'block',marginBottom:12}}>Quantos bezerros?</label>
                    <div style={{display:'flex',alignItems:'center',gap:16}}>
                      <button onClick={()=>setCompraQt(Math.max(1,compraQt-1))} style={{width:42,height:42,borderRadius:10,background:T.border,border:'none',color:T.text,fontSize:22,cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>−</button>
                      <input type="number" value={compraQt} onChange={e=>setCompraQt(Math.max(1,parseInt(e.target.value)||1))} style={{width:80,textAlign:'center',background:T.inputBg,border:`1px solid ${T.border2}`,borderRadius:10,padding:'10px',fontSize:24,color:T.text,fontFamily:"'Playfair Display',serif",fontWeight:700,outline:'none'}}/>
                      <button onClick={()=>setCompraQt(compraQt+1)} style={{width:42,height:42,borderRadius:10,background:T.border,border:'none',color:T.text,fontSize:22,cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>+</button>
                    </div>
                  </div>
                  {cot&&<>
                    {/* Accordion por fase */}
                    <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                      {[
                        {
                          id:'cria', icon:'🐄', label:'Fase 1 — Cria', sub:'Bezerro → Garrote · 1 semana',
                          custo: cot.custoBezerros + cot.custoFrete + cot.custoRacaoBezerro + cot.custoRacaoGarrote,
                          receita: cot.receitaGarrote, margem: cot.margemGarrote,
                          itens:[
                            [`${cot.qty}× Bezerro`, cot.custoBezerros],
                            ['Frete entrada', cot.custoFrete],
                            [`Ração bezerro (21kg × $${mercado.precos.precoRacao})`, cot.custoRacaoBezerro],
                            [`Ração garrote (35kg × $${mercado.precos.precoRacao})`, cot.custoRacaoGarrote],
                          ]
                        },
                        {
                          id:'recria', icon:'🐂', label:'Fase 2 — Recria', sub:'Garrote → Boi · +1 semana',
                          custo: cot.custoBezerros + cot.custoFrete + cot.custoRacaoBezerro + cot.custoRacaoGarrote + cot.custoRacaoBoi,
                          receita: cot.receitaBoi, margem: cot.margemBoi,
                          itens:[
                            ['Custos anteriores (cria)', cot.custoBezerros + cot.custoFrete + cot.custoRacaoBezerro + cot.custoRacaoGarrote],
                            [`Ração boi (56kg × $${mercado.precos.precoRacao})`, cot.custoRacaoBoi],
                          ]
                        },
                        {
                          id:'terminacao', icon:'🥩', label:'Fase 3 — Terminação', sub:'Boi → Abate · +1 semana',
                          custo: cot.total,
                          receita: cot.receita, margem: cot.margem,
                          itens:[
                            ['Todos os custos anteriores', cot.total],
                          ]
                        },
                      ].map(fase => (
                        <div key={fase.id} style={{border:`1px solid ${faseAberta===fase.id?'#4a6a28':T.border}`,borderRadius:12,overflow:'hidden',transition:'all .2s'}}>
                          <button onClick={()=>setFaseAberta(faseAberta===fase.id?null:fase.id)}
                            style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:faseAberta===fase.id?'rgba(42,74,20,.3)':T.inputBg,border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
                            <span style={{fontSize:20}}>{fase.icon}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:600,color:T.text}}>{fase.label}</div>
                              <div style={{fontSize:11,color:T.textMuted}}>{fase.sub}</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <div style={{fontSize:14,fontWeight:800,color:'#c8a84a',fontFamily:"'Playfair Display',serif"}}>${fmt(fase.receita)}</div>
                              <div style={{fontSize:11,fontWeight:600,color:fase.margem>0?'#4ad4a0':'#e06060'}}>{fase.margem}% margem</div>
                            </div>
                            <span style={{color:T.textMuted,fontSize:14,marginLeft:4}}>{faseAberta===fase.id?'▲':'▼'}</span>
                          </button>
                          {faseAberta===fase.id&&(
                            <div style={{padding:'0 14px 14px',background:'rgba(10,18,8,.4)'}}>
                              <div style={{height:1,background:T.border,marginBottom:12}}/>
                              {fase.itens.map(([l,v])=>(
                                <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:T.textMuted,marginBottom:6}}>
                                  <span>{l}</span>
                                  <span style={{color:T.text,fontWeight:600}}>${fmt(v)}</span>
                                </div>
                              ))}
                              <div style={{height:1,background:T.border,margin:'10px 0'}}/>
                              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,marginBottom:12}}>
                                <span style={{color:T.textMuted}}>Custo total desta fase</span>
                                <span style={{color:T.text}}>${fmt(fase.custo)}</span>
                              </div>
                              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                                <div style={{background:T.inputBg,borderRadius:8,padding:'8px 10px',textAlign:'center',border:`1px solid ${T.border}`}}>
                                  <div style={{fontSize:10,color:T.textMuted,marginBottom:2}}>Receita</div>
                                  <div style={{fontSize:15,fontWeight:800,color:'#c8a84a',fontFamily:"'Playfair Display',serif"}}>${fmt(fase.receita)}</div>
                                </div>
                                <div style={{background:T.inputBg,borderRadius:8,padding:'8px 10px',textAlign:'center',border:`1px solid ${T.border}`}}>
                                  <div style={{fontSize:10,color:T.textMuted,marginBottom:2}}>Lucro est.</div>
                                  <div style={{fontSize:15,fontWeight:800,color:fase.margem>0?'#4ad4a0':'#e06060',fontFamily:"'Playfair Display',serif"}}>${fmt(fase.receita-fase.custo)}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <Btn T={T} onClick={()=>setCompraStep(2)} style={{width:'100%',padding:14,fontSize:15}}>
                      Tenho interesse — ${fmt(cot.custoBezerros+cot.custoFrete)} agora
                    </Btn>
                    <div style={{fontSize:11,color:T.textMuted,textAlign:'center',marginTop:8}}>
                      Você paga apenas bezerros + frete agora. Ração por fase à medida que avançar.
                    </div>
                  </>}
                </>}
                {compraStep===2&&<>
                  <div style={{background:T.inputBg,borderRadius:12,padding:16,marginBottom:16,border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px',marginBottom:12}}>Resumo da compra</div>
                    {[
                      [`${compraQt}× Bezerro`, `$${fmt(cot?.custoBezerros||0)}`],
                      ['Frete', `$${fmt(cot?.custoFrete||0)}`],
                      ['Total a pagar agora', `$${fmt((cot?.custoBezerros||0)+(cot?.custoFrete||0))}`],
                    ].map(([l,v])=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>
                        <span style={{color:T.textMuted}}>{l}</span>
                        <span style={{fontWeight:700,color:T.text}}>{v}</span>
                      </div>
                    ))}
                    <div style={{fontSize:11,color:'#a08040',marginTop:4}}>⚠ Ração das próximas fases será cobrada separado conforme avançar.</div>
                  </div>
                  <Inp T={T} label="Cole o link do comprovante" value={compraComp} onChange={e=>setCompraComp(e.target.value)} placeholder="discord.com/channels/..."/>
                  <div style={{display:'flex',gap:10,marginTop:16}}>
                    <Btn v="ghost" onClick={()=>setCompraStep(1)} T={T} style={{flex:1}}>Voltar</Btn>
                    <Btn onClick={async()=>{
                      if(!compraComp) return notify('Cole o comprovante!','danger')
                      const total = (cot?.custoBezerros||0)+(cot?.custoFrete||0)
                      const r=await api('/api/solicitacoes',{method:'POST',body:JSON.stringify({quantidade:compraQt,valor_total:total,custo_racao:cot?.custoRacaoBezerro||0,comprovante:compraComp})})
                      if(!r.error){setCompraStep(3);sounds.coin();api('/api/solicitacoes').then(d=>setSolic(safeArr(d)))}
                      else notify('Erro: '+r.error,'danger')
                    }} T={T} style={{flex:2,padding:12}}>Enviar solicitação</Btn>
                  </div>
                </>}
              </Card>
              <Card T={T} hover={false}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Minhas solicitações</div>
                <Tbl T={T} headers={['Data','Qtd','Total','Status']} rows={solic.filter(s=>String(s.jogador_id)===String(user?.id)).map(s=>[
                  new Date(s.criado_em).toLocaleDateString('pt-BR'),`${s.quantidade} cab.`,`$${fmt(s.valor_total)}`,
                  <Badge type={s.status==='aprovado'?'ok':s.status==='recusado'?'danger':'warn'}>{s.status==='aprovado'?'✓ Aprovado':s.status==='recusado'?'✗ Recusado':'⏳ Pendente'}</Badge>
                ])}/>
              </Card>
            </div>}
          </>}

          {/* REBANHO */}
          {page==='rebanho'&&!user&&<Alrt type="warn">Faça login para ver seu rebanho.</Alrt>}
          {page==='rebanho'&&user&&<>
            <SectionTitle T={T} icon="🐄" title="Meu Rebanho" sub={`${user.username}${user.fazenda?` · Fazenda ${user.fazenda}`:''}`}/>
            {diasRacaoLeft!==null&&diasRacaoLeft<=3&&<Alrt type="danger">⚠ Ração acabando! Estoque para apenas {diasRacaoLeft} dia(s) — consumo atual: {consumoDiario}kg/dia.</Alrt>}
            <div style={{...gs(150),marginBottom:20}}>
              <Metric T={T} icon="🐄" label="Cabeças ativas" value={meusLotes.filter(l=>['ativo','aguardando_pagamento','em_transito'].includes(l.status)).reduce((s,l)=>s+l.quantidade,0)}/>
              <Metric T={T} icon="🌾" label="Estoque ração" value={`${fmt(racao?.kg_disponivel||0)} kg`} sub={diasRacaoLeft!==null?`${diasRacaoLeft} dias restantes`:'sem gado ativo'} color={diasRacaoLeft!==null&&diasRacaoLeft<=3?T.red:T.gold}/>
              <Metric T={T} icon="📉" label="Consumo/dia" value={`${consumoDiario} kg`} sub="todos os lotes"/>
              <Metric T={T} icon="💰" label="Valor do rebanho" value={`$${fmt(meusLotes.filter(l=>['ativo','em_transito'].includes(l.status)).reduce((s,l)=>{const precoFase={bezerro:mercado?.precos?.bezerro||1100,garrote:mercado?.precos?.garrote||0,boi:mercado?.precos?.boi||0,abatido:mercado?.precos?.abate||0};return s+(precoFase[l.fase]||0)*l.quantidade},0))}`} color={T.gold}/>
            </div>
            {meusLotes.filter(l=>!['pago','vendido'].includes(l.status)).length===0?<Card T={T} hover={false} style={{textAlign:'center',padding:48}}>
              <div style={{fontSize:48,marginBottom:16}}>🐄</div>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.text,marginBottom:8}}>Nenhum lote ativo</h3>
              <p style={{fontSize:13,color:T.textMuted,marginBottom:20}}>Vá até a aba Comprar para iniciar seu rebanho</p>
              <Btn onClick={()=>changePage('comprar')} T={T}>Comprar bezerros →</Btn>
            </Card>:
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {meusLotes.map(l=>{
                const cons = ({bezerro:3,garrote:5,boi:8,abatido:0}[l.fase]||0)*l.quantidade
                return <Card key={l.id} T={T} style={{padding:0,overflow:'hidden'}} hover={false}>
                  <div style={{display:'flex',alignItems:'stretch',flexWrap:'wrap'}}>
                    {/* Countdown */}
                    <div style={{background:T.inputBg,padding:'16px 20px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,borderRight:`1px solid ${T.border}`,minWidth:90}}>
                      <CountdownRing dataFase={l.data_fase4} T={T}/>
                      <span style={{fontSize:10,color:T.textMuted,textAlign:'center',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px'}}>{l.codigo}</span>
                    </div>
                    {/* Info */}
                    <div style={{flex:1,padding:'16px 20px',display:'flex',flexWrap:'wrap',gap:16,alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Fase</div>
                        {faseBadge(l.fase)}
                      </div>
                      <div>
                        <div style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Qtd.</div>
                        <div style={{fontSize:16,fontWeight:700,color:T.text,fontFamily:"'Playfair Display',serif"}}>{l.quantidade} cab.</div>
                      </div>
                      <div>
                        <div style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Ração/dia</div>
                        <div style={{fontSize:14,fontWeight:600,color:cons>0?T.amber:T.textMuted}}>{cons}kg</div>
                      </div>
                      <div>
                        <div style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Valor abate</div>
                        <div style={{fontSize:16,fontWeight:700,color:T.gold,fontFamily:"'Playfair Display',serif"}}>${fmt((mercado?.precos?.abate||0)*l.quantidade)}</div>
                      </div>
                      <div style={{marginLeft:'auto'}}>
                        {l.fase==='abatido'&&l.status==='ativo'?<Btn T={T} onClick={async()=>{const r=await api(`/api/lotes/${l.id}`,{method:'PATCH',body:JSON.stringify({action:'solicitar_abate',preco_kg:mercado?.precos?.precoKg||3})});if(!r.error){sounds.coin();notify('Abate solicitado!');api('/api/lotes').then(d=>setLotes(safeArr(d)))}}}>🥩 Solicitar abate</Btn>
                        :l.status==='aguardando_pagamento'?<Badge type="amber">⏳ Aguard. addmoney</Badge>
                        :l.status==='pago'?<Badge type="ok">✓ Pago!</Badge>
                        :l.fase!=='abatido'&&l.status==='ativo'?<Btn T={T} v="ghost" onClick={()=>{setNAnuncio(f=>({...f,lote_id:l.id}));changePage('venda')}} style={{fontSize:12}}>Anunciar</Btn>:'—'}
                      </div>
                    </div>
                  </div>
                </Card>
              })}
            </div>}
          </>}

          {/* VENDA */}
          {/* Modal dividir lote */}
          {dividirLote&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(3px)'}}>
            <div style={{background:T.card,border:`1px solid ${T.border2}`,borderRadius:20,padding:32,width:'100%',maxWidth:380,boxShadow:'0 30px 80px rgba(0,0,0,.4)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <div>
                  <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.text}}>✂ Dividir Lote</h3>
                  <div style={{fontSize:12,color:T.textMuted}}>{dividirLote.codigo} — {dividirLote.quantidade} cabeças</div>
                </div>
                <button onClick={()=>setDividirLote(null)} style={{background:'none',border:'none',color:T.textMuted,fontSize:22,cursor:'pointer'}}>×</button>
              </div>
              <div style={{background:T.inputBg,borderRadius:12,padding:16,marginBottom:16,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:12,color:T.textMuted,marginBottom:12}}>O lote original será <strong style={{color:'#e06060'}}>deletado</strong> e dois novos serão criados.</div>
                <Inp T={T} label={`Qtd. no Lote A (máx ${dividirLote.quantidade-1})`} type="number" value={dividirQtd} onChange={e=>setDividirQtd(e.target.value)} placeholder={Math.floor(dividirLote.quantidade/2)}/>
                {dividirQtd&&parseInt(dividirQtd)>0&&parseInt(dividirQtd)<dividirLote.quantidade&&<div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={{background:T.card,borderRadius:8,padding:10,border:`1px solid ${T.border}`,textAlign:'center'}}>
                    <div style={{fontSize:11,color:T.textMuted}}>Lote A</div>
                    <div style={{fontSize:18,fontWeight:700,color:T.text,fontFamily:"'Playfair Display',serif"}}>{parseInt(dividirQtd)} cab.</div>
                  </div>
                  <div style={{background:T.card,borderRadius:8,padding:10,border:`1px solid ${T.border}`,textAlign:'center'}}>
                    <div style={{fontSize:11,color:T.textMuted}}>Lote B</div>
                    <div style={{fontSize:18,fontWeight:700,color:T.text,fontFamily:"'Playfair Display',serif"}}>{dividirLote.quantidade-parseInt(dividirQtd)} cab.</div>
                  </div>
                </div>}
              </div>
              <div style={{display:'flex',gap:10}}>
                <Btn T={T} v="ghost" onClick={()=>setDividirLote(null)} style={{flex:1}}>Cancelar</Btn>
                <Btn T={T} onClick={async()=>{
                  const qtd=parseInt(dividirQtd)
                  if(!qtd||qtd<=0||qtd>=dividirLote.quantidade) return notify('Quantidade inválida','danger')
                  const r=await api(`/api/lotes/${dividirLote.id}`,{method:'PATCH',body:JSON.stringify({action:'dividir',quantidade_a:qtd})})
                  if(r.error) return notify('Erro: '+r.error,'danger')
                  sounds.success()
                  notify(`✓ Lote dividido — ${dividirLote.codigo}-A e ${dividirLote.codigo}-B criados!`)
                  setDividirLote(null)
                  api('/api/lotes').then(d=>setLotes(safeArr(d)))
                }} style={{flex:2}} disabled={!dividirQtd||parseInt(dividirQtd)<=0||parseInt(dividirQtd)>=dividirLote.quantidade}>✂ Dividir</Btn>
              </div>
            </div>
          </div>}

          {page==='venda'&&<>
            <SectionTitle T={T} icon="🤝" title="Venda entre Jogadores" sub="Garrote e Boi · preço livre · chat ao vivo por anúncio"/>
            <Alrt type="info">💬 Clique em <strong>Negociar</strong> para abrir o chat ao vivo e fazer sua oferta diretamente ao vendedor.</Alrt>
            <Card T={T} hover={false}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Animais à venda</div>
              <Tbl T={T} headers={['Vendedor','Fazenda','Fase','Qtd','Preço','Obs','']}
                rows={anuncios.filter(a=>a.status==='ativo').map(a=>[
                  <span style={{fontWeight:600,color:T.text}}>{a.vendedor_nome}</span>,
                  a.fazenda||'—',faseBadge(a.fase),a.quantidade,
                  <span style={{fontWeight:700,color:T.gold,fontFamily:"'Playfair Display',serif"}}>${fmt(a.preco_pedido)}</span>,
                  a.obs?<span style={{fontSize:11,color:T.textMuted}}>{a.obs}</span>:'',
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <Btn T={T} v="amber" style={{padding:'6px 12px',fontSize:12}} onClick={()=>{sounds.click();setChatAnuncio(a)}}>💬 Negociar</Btn>
                    {String(a.vendedor_id)===String(user?.id)&&a.fase==='garrote'&&<BotaoOfertaNPC anuncio={a} T={T} api={api} notify={notify} sounds={sounds} onVendido={()=>{api('/api/anuncios').then(d=>setAnuncios(safeArr(d)));api('/api/lotes').then(d=>setLotes(safeArr(d)))}}/>}
                  </div>
                ])}/>
            </Card>
            {user&&<div style={gs(280)}>
              <Card T={T} hover={false}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Anunciar meu animal</div>
                <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
                  <Sel T={T} label="Lote" value={nAnuncio.lote_id} onChange={e=>setNAnuncio(f=>({...f,lote_id:e.target.value}))}>
                    <option value="">Selecione o lote...</option>
                    {meusLotes.filter(l=>l.status==='ativo'&&l.fase!=='bezerro'&&l.fase!=='abatido').map(l=><option key={l.id} value={l.id}>{l.codigo} — {FASES[l.fase]} ({l.quantidade} cab.)</option>)}
                  </Sel>
                  <Inp T={T} label="Preço pedido ($)" type="number" value={nAnuncio.preco_pedido} onChange={e=>setNAnuncio(f=>({...f,preco_pedido:e.target.value}))} placeholder="1800"/>
                  <Inp T={T} label="Observação" value={nAnuncio.obs} onChange={e=>setNAnuncio(f=>({...f,obs:e.target.value}))} placeholder="Negociável..."/>
                </div>
                <Btn T={T} onClick={async()=>{const l=lotes.find(x=>x.id===nAnuncio.lote_id);if(!l) return notify('Selecione um lote','danger');const r=await api('/api/anuncios',{method:'POST',body:JSON.stringify({...nAnuncio,lote_codigo:l.codigo,fase:l.fase,quantidade:l.quantidade,peso_kg:l.peso_kg})});if(!r.error){notify('✓ Anúncio publicado!');api('/api/anuncios').then(d=>setAnuncios(safeArr(d)))}}}>Publicar anúncio</Btn>
              </Card>
              {user?.role==='admin'&&<Card T={T} hover={false}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Registrar venda <Badge type="amber">Admin</Badge></div>
                <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
                  <Sel T={T} label="Anúncio" value={p2p.anuncio_id} onChange={e=>{const a=anuncios.find(x=>x.id===e.target.value);setP2p(f=>({...f,anuncio_id:e.target.value,lote_id:a?.lote_id||''}))}}>
                    <option value="">Selecione...</option>
                    {anuncios.filter(a=>a.status==='ativo').map(a=><option key={a.id} value={a.id}>{a.lote_codigo} — {a.vendedor_nome}</option>)}
                  </Sel>
                  <Inp T={T} label="Comprador" value={p2p.comprador_nome} onChange={e=>setP2p(f=>({...f,comprador_nome:e.target.value}))} placeholder="NomeJogador"/>
                  <Inp T={T} label="Preço final ($)" type="number" value={p2p.preco_final} onChange={e=>setP2p(f=>({...f,preco_final:e.target.value}))}/>
                </div>
                <Btn T={T} onClick={async()=>{
  const r=await api('/api/anuncios',{method:'PATCH',body:JSON.stringify(p2p)});
  if(!r.error){
    sounds.coin();
    notify('✓ Venda registrada! Frete gerado na transportadora.');
    // Gerar frete para a venda entre jogadores
    if(r.lote_id && r.comprador_nome) {
      const anuncio = anuncios.find(a=>a.id===p2p.anuncio_id)
      if(anuncio) {
        await api('/api/fretes_venda',{method:'POST',body:JSON.stringify({
          lote_id: r.lote_id,
          lote_codigo: anuncio.lote_codigo,
          quantidade: anuncio.quantidade,
          vendedor_nome: anuncio.vendedor_nome,
          comprador_id: r.comprador_id,
          comprador_nome: r.comprador_nome,
        })})
      }
    }
    reload()
  }
}}>Registrar venda</Btn>
              </Card>}
            </div>}
          </>}

          {/* RANKING */}
          {page==='ranking'&&(()=>{
            // ── Ranking de Fazendas ao Vivo (calculado dos lotes ativos) ──────
            const fazRanking = fazendas
              .filter(f => f.dono_nome)
              .map(f => {
                const lotsFaz = lotes.filter(l => String(l.fazenda_id) === String(f.id) && l.status === 'ativo')
                const totalCab = lotsFaz.reduce((s,l) => s + l.quantidade, 0)
                const valorEst = lotsFaz.reduce((s,l) => s + l.quantidade * (mercado?.precos?.abate||0), 0)
                const consumo  = lotsFaz.reduce((s,l) => s + ({bezerro:3,garrote:5,boi:8,abatido:0}[l.fase]||0)*l.quantidade, 0)
                const breakdown = {
                  bezerro: lotsFaz.filter(l=>l.fase==='bezerro').reduce((s,l)=>s+l.quantidade,0),
                  garrote: lotsFaz.filter(l=>l.fase==='garrote').reduce((s,l)=>s+l.quantidade,0),
                  boi:     lotsFaz.filter(l=>l.fase==='boi').reduce((s,l)=>s+l.quantidade,0),
                }
                return { ...f, totalCab, valorEst, consumo, breakdown }
              })
              .filter(f => f.totalCab > 0)
              .sort((a,b) => b.totalCab - a.totalCab)

            return <>
              <SectionTitle T={T} icon="🏆" title="Ranking de Criadores" sub="Top produtores do servidor — ordenado por volume total abatido"/>
              <Card T={T} hover={false}>
                {ranking.length===0
                  ?<div style={{textAlign:'center',padding:48,color:T.textMuted}}>Nenhum abate registrado ainda.</div>
                  :<div style={{display:'flex',flexDirection:'column',gap:0}}>
                    {ranking.map((r,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:16,padding:'16px 4px',borderBottom:i<ranking.length-1?`1px solid ${T.border}`:'none',transition:'background .15s'}} onMouseEnter={e=>e.currentTarget.style.background=T.inputBg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <div style={{width:40,textAlign:'center',fontSize:i<3?24:16,flexShrink:0}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}º`}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Playfair Display',serif"}}>{r.nome}</div>
                          <div style={{fontSize:12,color:T.textMuted}}>{r.total_abates} abates · {fmt(r.total_cabecas)} cabeças</div>
                        </div>
                        <div style={{fontSize:20,fontWeight:800,color:T.gold,fontFamily:"'Playfair Display',serif"}}>${fmt(r.total_ganho)}</div>
                      </div>
                    ))}
                  </div>
                }
              </Card>

              {/* ── Ranking de Fazendas ao Vivo ── */}
              <div style={{marginTop:32,marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:20}}>🏡</span>
                <div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:T.text}}>Ranking de Fazendas</div>
                  <div style={{fontSize:11,color:T.textMuted}}>Propriedades com mais gado ativo agora — atualizado em tempo real</div>
                </div>
              </div>
              {fazRanking.length===0
                ?<Card T={T} hover={false}><div style={{textAlign:'center',padding:32,color:T.textMuted}}>Nenhuma fazenda com gado ativo no momento.</div></Card>
                :<div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {fazRanking.map((f,i)=>{
                    const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':null
                    const pctCap = Math.min(100,(f.totalCab/(Number(f.tamanho_ha)*3))*100)
                    const barCor = pctCap>90?'#f87171':pctCap>70?'#c28c46':'#4ade80'
                    return (
                      <div key={f.id} style={{
                        background:T.card, border:`1px solid ${i===0?T.gold+'55':T.border}`,
                        borderLeft:`3px solid ${i===0?T.gold:i===1?T.border2:T.border}`,
                        borderRadius:8, padding:'16px 20px',
                        boxShadow: i===0?`0 4px 20px rgba(194,140,70,.2)`:'0 2px 10px rgba(0,0,0,.3)',
                        transition:'all .2s',
                      }} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold+'88'}} onMouseLeave={e=>{e.currentTarget.style.borderColor=i===0?T.gold+'55':T.border}}>
                        <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                          {/* Posição */}
                          <div style={{width:36,textAlign:'center',flexShrink:0,paddingTop:2}}>
                            {medal
                              ?<span style={{fontSize:24}}>{medal}</span>
                              :<span style={{fontSize:16,fontWeight:700,color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>{i+1}º</span>
                            }
                          </div>
                          {/* Info principal */}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:4,flexWrap:'wrap'}}>
                              <span style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:T.text}}>{f.nome}</span>
                              <span style={{fontSize:11,color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>{f.codigo}</span>
                              {f.dono_nome&&<span style={{fontSize:11,color:T.gold,fontWeight:600}}>👤 {f.dono_nome}</span>}
                            </div>
                            {/* Breakdown de fases */}
                            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:10}}>
                              {f.breakdown.bezerro>0&&<span style={{fontSize:11,background:'rgba(122,176,224,.1)',color:'#7ab0e0',padding:'2px 8px',borderRadius:4,border:'1px solid rgba(122,176,224,.3)',fontFamily:"'DM Mono',monospace"}}>{f.breakdown.bezerro} bzr</span>}
                              {f.breakdown.garrote>0&&<span style={{fontSize:11,background:'rgba(194,140,70,.1)',color:'#c28c46',padding:'2px 8px',borderRadius:4,border:'1px solid rgba(194,140,70,.3)',fontFamily:"'DM Mono',monospace"}}>{f.breakdown.garrote} grr</span>}
                              {f.breakdown.boi>0&&<span style={{fontSize:11,background:'rgba(74,222,128,.1)',color:'#4ade80',padding:'2px 8px',borderRadius:4,border:'1px solid rgba(74,222,128,.3)',fontFamily:"'DM Mono',monospace"}}>{f.breakdown.boi} boi</span>}
                              <span style={{fontSize:11,color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>{f.consumo}kg ração/dia</span>
                            </div>
                            {/* Barra de ocupação */}
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{flex:1,background:T.border,borderRadius:4,height:5,overflow:'hidden'}}>
                                <div style={{width:`${pctCap}%`,height:'100%',background:barCor,borderRadius:4,transition:'width .6s ease'}}/>
                              </div>
                              <span style={{fontSize:10,color:T.textMuted,fontFamily:"'DM Mono',monospace",flexShrink:0}}>{pctCap.toFixed(0)}% cap.</span>
                            </div>
                          </div>
                          {/* Valor estimado */}
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{fontSize:10,color:T.textMuted,marginBottom:4,fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:1}}>Valor est.</div>
                            <div style={{fontSize:20,fontWeight:800,color:T.gold,fontFamily:"'Playfair Display',serif"}}>${fmt(f.valorEst)}</div>
                            <div style={{fontSize:12,color:T.textMuted,marginTop:2,fontFamily:"'DM Mono',monospace"}}>{f.totalCab} cab. · {f.tamanho_ha}ha</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              }
            </>
          })()}

          {/* AJUDA */}
          {page==='ajuda'&&<>
            {/* Hero */}
            <div style={{textAlign:'center',marginBottom:48,paddingBottom:32,borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontSize:56,marginBottom:16}}>🌾</div>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:800,color:T.text,marginBottom:12,letterSpacing:'-.5px'}}>Sistema Rural GVRPNL</h1>
              <p style={{fontSize:15,color:T.textDim,maxWidth:520,margin:'0 auto',lineHeight:1.8}}>Crie gado, gerencie sua fazenda, transporte animais e negocie com outros jogadores. Tudo registrado aqui no site.</p>
            </div>

            {/* Ciclo visual */}
            <div style={{marginBottom:48}}>
              <div style={{textAlign:'center',marginBottom:24}}>
                <span style={{fontSize:11,fontWeight:700,color:T.textMuted,textTransform:'uppercase',letterSpacing:'2px'}}>O ciclo completo</span>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.text,marginTop:6}}>4 semanas, do bezerro ao frigorífico</h2>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:0,overflowX:'auto',paddingBottom:8}}>
                {[
                  {sem:'Sem. 1',animal:'🐄',nome:'Bezerro',peso:'180kg',preco:'$1.100',cor:'#4060d0',desc:'Comprado no Posto Agropecuário'},
                  {sem:'Sem. 2',animal:'🐄',nome:'Garrote',peso:'400kg',preco:'livre',cor:'#c8922a',desc:'Pode vender para outro jogador'},
                  {sem:'Sem. 3',animal:'🐄',nome:'Boi',peso:'540kg',preco:'livre',cor:'#6a9a30',desc:'Pode vender para outro jogador'},
                  {sem:'Sem. 4',animal:'🥩',nome:'Abate',peso:'648kg',preco:'addmoney!',cor:'#c84040',desc:'Vendido ao Frigorífico'},
                ].map((f,i)=>(
                  <div key={f.sem} style={{display:'flex',alignItems:'center',flex:1,minWidth:0}}>
                    <div style={{flex:1,background:T.card,border:`2px solid ${f.cor}`,borderRadius:16,padding:'16px 12px',textAlign:'center',position:'relative',minWidth:120}}>
                      <div style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',background:f.cor,color:'#fff',fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20,whiteSpace:'nowrap'}}>{f.sem}</div>
                      <div style={{fontSize:32,margin:'8px 0 6px'}}>{f.animal}</div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:T.text}}>{f.nome}</div>
                      <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{f.peso}</div>
                      <div style={{fontSize:12,fontWeight:700,color:f.cor,marginTop:6}}>{f.preco}</div>
                      <div style={{fontSize:10,color:T.textMuted,marginTop:4,lineHeight:1.4}}>{f.desc}</div>
                    </div>
                    {i<3&&<div style={{fontSize:20,color:T.textMuted,flexShrink:0,padding:'0 4px'}}>→</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Seções */}
            <div style={{display:'flex',flexDirection:'column',gap:16}}>

              {/* Como comprar */}
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,overflow:'hidden'}}>
                <div style={{background:`linear-gradient(135deg,rgba(64,96,208,.15),rgba(64,96,208,.05))`,borderBottom:`1px solid ${T.border}`,padding:'20px 24px',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:48,height:48,borderRadius:14,background:'rgba(64,96,208,.2)',border:'1px solid rgba(64,96,208,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🛒</div>
                  <div>
                    <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:T.text,marginBottom:2}}>Como comprar bezerros</h3>
                    <p style={{fontSize:12,color:T.textMuted}}>O ponto de entrada no sistema</p>
                  </div>
                </div>
                <div style={{padding:'20px 24px'}}>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {['Vá na aba Comprar e escolha quantos bezerros quer','O site calcula tudo: animais + frete + ração da primeira semana','Pague o valor no servidor e cole o link do comprovante aqui','O admin confere e aprova — os animais aparecem no seu rebanho','Um caminhão é despachado: 30min até o curral + 30min até sua fazenda'].map((s,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12}}>
                        <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(64,96,208,.2)',border:'1px solid rgba(64,96,208,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#6080e0',flexShrink:0,marginTop:1}}>{i+1}</div>
                        <p style={{fontSize:13,color:T.textDim,lineHeight:1.6,margin:0}}>{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fazendas */}
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,overflow:'hidden'}}>
                <div style={{background:`linear-gradient(135deg,rgba(106,154,48,.15),rgba(106,154,48,.05))`,borderBottom:`1px solid ${T.border}`,padding:'20px 24px',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:48,height:48,borderRadius:14,background:'rgba(106,154,48,.2)',border:'1px solid rgba(106,154,48,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🏡</div>
                  <div>
                    <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:T.text,marginBottom:2}}>Fazendas</h3>
                    <p style={{fontSize:12,color:T.textMuted}}>Sua propriedade tem limite de animais</p>
                  </div>
                </div>
                <div style={{padding:'20px 24px'}}>
                  <p style={{fontSize:13,color:T.textDim,lineHeight:1.7,marginBottom:16}}>Cada fazenda tem um limite por hectare. Conforme o gado cresce, ele ocupa mais espaço — você vai precisar vender parte ou alugar pasto.</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                    {[['🐄','Bezerro','3 por hectare'],['🐄','Garrote','2 por hectare'],['🐄','Boi','1 por hectare']].map(([e,n,v])=>(
                      <div key={n} style={{background:T.inputBg,borderRadius:12,padding:'12px 10px',textAlign:'center',border:`1px solid ${T.border}`}}>
                        <div style={{fontSize:22,marginBottom:4}}>{e}</div>
                        <div style={{fontSize:12,fontWeight:600,color:T.text}}>{n}</div>
                        <div style={{fontSize:11,color:T.gold||'#c8922a',fontWeight:600,marginTop:2}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'rgba(200,50,50,.08)',border:'1px solid rgba(200,50,50,.2)',borderRadius:12,padding:'12px 14px',fontSize:12,color:T.textDim,lineHeight:1.7}}>
                    ⚠ Fazenda superlotada? O sistema te avisa e bloqueia o avanço de fase até você resolver.
                  </div>
                  <div style={{marginTop:12,fontSize:13,color:T.textDim,lineHeight:1.7}}>Toda fazenda tem <strong style={{color:T.text}}>custos de manutenção</strong> — cerca, vacinação, pasto e vaqueiro. A cada 60 animais você precisa de 1 vaqueiro contratado. Esses serviços são feitos por outros jogadores no RP.</div>
                </div>
              </div>

              {/* Ração */}
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,overflow:'hidden'}}>
                <div style={{background:`linear-gradient(135deg,rgba(200,146,42,.15),rgba(200,146,42,.05))`,borderBottom:`1px solid ${T.border}`,padding:'20px 24px',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:48,height:48,borderRadius:14,background:'rgba(200,146,42,.2)',border:'1px solid rgba(200,146,42,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🌾</div>
                  <div>
                    <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:T.text,marginBottom:2}}>Ração</h3>
                    <p style={{fontSize:12,color:T.textMuted}}>O equilíbrio econômico do servidor</p>
                  </div>
                </div>
                <div style={{padding:'20px 24px'}}>
                  <p style={{fontSize:13,color:T.textDim,lineHeight:1.7,marginBottom:16}}>A ração que vem na compra dos bezerros cobre só a <strong style={{color:T.text}}>primeira semana</strong>. Para as semanas seguintes, compre no <strong style={{color:T.text}}>Celeiro</strong>.</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                    {[['Garrote (sem. 2)','35kg por animal'],['Boi (sem. 3)','56kg por animal']].map(([f,v])=>(
                      <div key={f} style={{background:T.inputBg,borderRadius:12,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                        <div style={{fontSize:12,color:T.textMuted,marginBottom:4}}>{f}</div>
                        <div style={{fontSize:16,fontWeight:700,color:T.gold||'#c8922a',fontFamily:"'Playfair Display',serif"}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:12,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8}}>Preço varia pelo rebanho do servidor</div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {[['Pouco gado','$2/kg','ok'],['Gado moderado','$2,40/kg','warn'],['Muito gado','$3/kg','danger']].map(([s,v,t])=>(
                      <div key={s} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',borderRadius:8,background:T.inputBg,border:`1px solid ${T.border}`}}>
                        <span style={{fontSize:13,color:T.textDim}}>{s}</span>
                        <span style={{fontSize:13,fontWeight:700,color:t==='ok'?'#4ad4a0':t==='warn'?'#c8922a':'#e06060'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transportadora */}
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,overflow:'hidden'}}>
                <div style={{background:`linear-gradient(135deg,rgba(80,48,192,.15),rgba(80,48,192,.05))`,borderBottom:`1px solid ${T.border}`,padding:'20px 24px',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:48,height:48,borderRadius:14,background:'rgba(80,48,192,.2)',border:'1px solid rgba(80,48,192,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🚛</div>
                  <div>
                    <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:T.text,marginBottom:2}}>Transportadora</h3>
                    <p style={{fontSize:12,color:T.textMuted}}>Compre um caminhão e trabalhe com fretes</p>
                  </div>
                </div>
                <div style={{padding:'20px 24px'}}>
                  <p style={{fontSize:13,color:T.textDim,lineHeight:1.7,marginBottom:16}}>Quando alguém compra gado, um frete aparece para todos os transportadores livres. O primeiro a aceitar pega o serviço. O caminhão fica ocupado por <strong style={{color:T.text}}>1 hora</strong> — 30min indo buscar + 30min entregando.</p>
                  <div style={{background:T.inputBg,borderRadius:12,padding:'14px 16px',marginBottom:16,border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:12,color:T.textMuted,marginBottom:8,fontWeight:600}}>Valor do frete</div>
                    <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                      <div><span style={{fontSize:13,color:T.textDim}}>Cliente paga: </span><span style={{fontSize:14,fontWeight:700,color:T.text}}>$50/cab</span></div>
                      <div><span style={{fontSize:13,color:T.textDim}}>Você recebe: </span><span style={{fontSize:14,fontWeight:700,color:'#4ad4a0'}}>$30/cab</span></div>
                      <div><span style={{fontSize:13,color:T.textDim}}>Combustível: </span><span style={{fontSize:14,fontWeight:700,color:'#e06060'}}>$20/cab</span></div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                    {[['Truck Pequeno','30 animais','$80.000'],['Truck Médio','60 animais','$150.000'],['Carretão','120 animais','$210.000']].map(([m,c,p])=>(
                      <div key={m} style={{background:T.inputBg,borderRadius:12,padding:'12px 10px',textAlign:'center',border:`1px solid ${T.border}`}}>
                        <div style={{fontSize:20,marginBottom:4}}>🚛</div>
                        <div style={{fontSize:11,fontWeight:700,color:T.text}}>{m}</div>
                        <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{c}</div>
                        <div style={{fontSize:12,fontWeight:700,color:'#a080ff',marginTop:4}}>{p}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Venda e Ranking side by side */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
                <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,overflow:'hidden'}}>
                  <div style={{background:`linear-gradient(135deg,rgba(160,80,224,.15),rgba(160,80,224,.05))`,borderBottom:`1px solid ${T.border}`,padding:'16px 20px',display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:40,height:40,borderRadius:12,background:'rgba(160,80,224,.2)',border:'1px solid rgba(160,80,224,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🤝</div>
                    <div>
                      <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:1}}>Venda entre jogadores</h3>
                      <p style={{fontSize:11,color:T.textMuted}}>A partir do Garrote</p>
                    </div>
                  </div>
                  <div style={{padding:'16px 20px'}}>
                    <p style={{fontSize:13,color:T.textDim,lineHeight:1.7}}>Anuncie seus animais a partir do Garrote. Cada anúncio tem um <strong style={{color:T.text}}>chat ao vivo</strong> — clique em 💬 Negociar para conversar e fechar o preço diretamente.</p>
                    <p style={{fontSize:13,color:T.textDim,lineHeight:1.7,marginTop:10}}>Quem compra ganha tempo. Quem vende recebe antes, com margem menor.</p>
                  </div>
                </div>
                <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,overflow:'hidden'}}>
                  <div style={{background:`linear-gradient(135deg,rgba(200,146,42,.15),rgba(200,146,42,.05))`,borderBottom:`1px solid ${T.border}`,padding:'16px 20px',display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:40,height:40,borderRadius:12,background:'rgba(200,146,42,.2)',border:'1px solid rgba(200,146,42,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🏆</div>
                    <div>
                      <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:1}}>Ranking</h3>
                      <p style={{fontSize:11,color:T.textMuted}}>Os maiores criadores</p>
                    </div>
                  </div>
                  <div style={{padding:'16px 20px'}}>
                    <p style={{fontSize:13,color:T.textDim,lineHeight:1.7}}>Veja os maiores criadores do servidor pelo volume total vendido ao Frigorífico. Clique em qualquer jogador para ver o perfil — abates, cabeças criadas e total ganho.</p>
                  </div>
                </div>
              </div>

              {/* Dica final */}
              <div style={{background:`linear-gradient(135deg,rgba(200,146,42,.08),rgba(200,146,42,.03))`,border:`1px solid rgba(200,146,42,.2)`,borderRadius:20,padding:'24px 28px',display:'flex',gap:16,alignItems:'flex-start'}}>
                <div style={{fontSize:32,flexShrink:0}}>💡</div>
                <div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:8}}>Dica de ouro</div>
                  <p style={{fontSize:13,color:T.textDim,lineHeight:1.8,margin:0}}>Compre cedo — com pouco gado no servidor a ração é barata e a margem chega a 30%. Quando o servidor encher, quem já tem gado no pasto ganha mais. O timing é tudo na pecuária.</p>
                </div>
              </div>

            </div>
          </>}


          {/* PERFIL */}
          {page==='perfil'&&!user&&<Alrt type="warn">Faça login para ver seu perfil.</Alrt>}
          {page==='perfil'&&user&&<>
            <SectionTitle T={T} icon="👤" title="Meu Perfil" sub="Edite suas informações e acompanhe suas estatísticas"/>
            <div style={gs(280)}>
              <Card T={T} glow hover={false} style={{textAlign:'center',padding:32}}>
                <div style={{width:90,height:90,borderRadius:'50%',overflow:'hidden',margin:'0 auto 16px',border:`3px solid ${T.gold}`,background:T.inputBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,boxShadow:`0 0 20px rgba(200,146,42,.3)`}}>
                  {perfil?.foto_url?<img src={perfil.foto_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:'🐄'}
                </div>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:T.text,marginBottom:4}}>{perfil?.username}</h2>
                {perfil?.fazenda&&<p style={{fontSize:13,color:T.textMuted,marginBottom:8}}>Fazenda {perfil.fazenda}</p>}
                {perfil?.bio&&<p style={{fontSize:13,color:T.textDim,lineHeight:1.7,marginBottom:16}}>{perfil.bio}</p>}
                <div style={gs(90)}>
                  <Metric T={T} icon="🥩" label="Abates" value={perfil?.stats?.total_abates||0}/>
                  <Metric T={T} icon="🐄" label="Cabeças" value={fmt(perfil?.stats?.total_cabecas||0)}/>
                  <Metric T={T} icon="💰" label="Total ganho" value={`$${fmt(perfil?.stats?.total_ganho||0)}`} color={T.gold}/>
                </div>
              </Card>
              <Card T={T} hover={false}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:16}}>Editar perfil</div>
                <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:18}}>
                  <div>
                    <label style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px',display:'block',marginBottom:6}}>Foto de perfil</label>
                    <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                      <div style={{width:48,height:48,borderRadius:'50%',overflow:'hidden',background:T.inputBg,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                        {editPerfil.foto_url?<img src={editPerfil.foto_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:'🐄'}
                      </div>
                      <div style={{flex:1}}>
                        <input type="file" accept="image/*" onChange={e=>{
                          const file=e.target.files[0];if(!file)return;
                          const reader=new FileReader();
                          reader.onload=ev=>setEditPerfil(f=>({...f,foto_url:ev.target.result}));
                          reader.readAsDataURL(file);
                        }} style={{display:'none'}} id="foto-upload"/>
                        <label htmlFor="foto-upload" style={{display:'block',padding:'7px 12px',background:T.inputBg,border:`1px solid ${T.border2}`,borderRadius:8,fontSize:12,color:T.textDim,cursor:'pointer',marginBottom:6,textAlign:'center'}}>
                          📷 Escolher imagem
                        </label>
                        <input value={editPerfil.foto_url} onChange={e=>setEditPerfil(f=>({...f,foto_url:e.target.value}))} placeholder="ou cole uma URL..." style={{width:'100%',background:T.inputBg,border:`1px solid ${T.border2}`,borderRadius:8,padding:'6px 10px',fontSize:12,color:T.text,fontFamily:'inherit',outline:'none'}}/>
                      </div>
                    </div>
                  </div>
                  <Inp T={T} label="Fazenda" value={editPerfil.fazenda} onChange={e=>setEditPerfil(f=>({...f,fazenda:e.target.value}))} placeholder="0325"/>
                  <Inp T={T} label="Bio" value={editPerfil.bio} onChange={e=>setEditPerfil(f=>({...f,bio:e.target.value}))} placeholder="Criador desde 2024..."/>
                  <Inp T={T} label="Nova senha" type="password" value={editPerfil.nova_senha} onChange={e=>setEditPerfil(f=>({...f,nova_senha:e.target.value}))} placeholder="Deixe em branco para manter"/>
                </div>
                <Btn T={T} onClick={()=>salvarPerfil(null)} style={{width:'100%',padding:12}}>Salvar alterações</Btn>
              </Card>
            </div>
          </>}

          {/* ADMIN */}
          {page==='admin'&&user?.role==='admin'&&<>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
              <div>
                <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:T.text,marginBottom:4}}>⚙️ Painel Admin</h1>
                <p style={{fontSize:13,color:T.textMuted}}>Gestão completa do sistema de pecuária</p>
              </div>
              <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                {confirmReset?<>
                  <span style={{fontSize:12,color:T.red}}>Apaga TUDO. Confirma?</span>
                  <Btn v="red" T={T} onClick={async()=>{const r=await api('/api/admin/reset',{method:'POST',body:JSON.stringify({tipo:'rebanho_completo'})});if(r.ok){notify('✓ Resetado!');reload();setConfirmReset(false)}}}>✓ Confirmar reset</Btn>
                  <Btn v="ghost" T={T} onClick={()=>setConfirmReset(false)}>Cancelar</Btn>
                </>:<Btn v="danger" T={T} onClick={()=>setConfirmReset(true)} style={{fontSize:12}}>🗑 Resetar rebanho</Btn>}
                <Btn v="amber" T={T} onClick={async()=>{const r=await api('/api/admin/reset_transportadora',{method:'POST'});if(r.ok) notify('✓ Transportadora resetada! Caminhões liberados.')}} style={{fontSize:12}}>🚛 Reset transportadora</Btn>
              </div>
            </div>

            <div style={{...gs(140),marginBottom:20}}>
              <Metric T={T} icon="🐄" label="Rebanho total" value={`${mercado?.rebanho?.total||0} cab.`} color={T.gold}/>
              <Metric T={T} icon="🥩" label="Abates pend." value={abatesPend.length} color={abatesPend.length>0?T.amber:T.text}/>
              <Metric T={T} icon="🛒" label="Compras pend." value={solicPend.length} color={solicPend.length>0?T.amber:T.text}/>
              <Metric T={T} icon="👤" label="Cadastros pend." value={usersPend.length} color={usersPend.length>0?'#4a90d0':T.text}/>
              <Metric T={T} icon="💰" label="Volume total" value={`$${fmt(trans.reduce((s,t)=>s+Number(t.valor),0))}`} color={T.gold}/>
            </div>

            {solicPend.length>0&&<Alrt type="warn">🛒 {solicPend.length} solicitação(ões) de compra aguardando aprovação</Alrt>}
            {abatesPend.length>0&&<Alrt type="warn">🥩 {abatesPend.length} abate(s) aguardando addmoney no servidor</Alrt>}
            {usersPend.length>0&&<Alrt type="info">👤 {usersPend.length} cadastro(s) pendente(s) de aprovação</Alrt>}

            <Card T={T} hover={false}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:6}}>Solicitações de compra</div>
              <p style={{fontSize:12,color:T.textMuted,marginBottom:14}}>Verifique o comprovante antes de aprovar.</p>
              <Tbl T={T} headers={['Jogador','Qtd','Total','Comprovante','','']}
                rows={solicPend.map(s=>[
                  <span style={{fontWeight:600}}>{s.jogador_nome}</span>,`${s.quantidade} cab.`,
                  <span style={{color:T.gold,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>${fmt(s.valor_total)}</span>,
                  <a href={s.comprovante} target="_blank" rel="noreferrer" style={{color:'#4a90d0',fontSize:12}}>Ver →</a>,
                  <Btn T={T} onClick={async()=>{const r=await api('/api/solicitacoes',{method:'PATCH',body:JSON.stringify({id:s.id,status:'aprovado'})});if(r.error){notify('Erro: '+r.error,'danger')}else{sounds.coin();notify('✓ Aprovado! Lote '+r.codigo+' criado.');api('/api/solicitacoes').then(d=>setSolic(safeArr(d)));api('/api/lotes').then(d=>setLotes(safeArr(d)))}}} style={{padding:'5px 12px',fontSize:11}}>✓ Aprovar</Btn>,
                  <Btn T={T} v="danger" onClick={async()=>{await api('/api/solicitacoes',{method:'PATCH',body:JSON.stringify({id:s.id,status:'recusado'})});notify('Recusado.','danger');api('/api/solicitacoes').then(d=>setSolic(safeArr(d)))}} style={{padding:'5px 12px',fontSize:11}}>✗</Btn>
                ])}/>
            </Card>

            <div style={gs(300)}>
              <Card T={T} hover={false}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Registrar compra — Gov. NPC</div>
                <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
                  <Sel T={T} label="Jogador" value={nLote.jogador_id} onChange={e=>{const u=users.find(x=>x.id===e.target.value);setNLote(f=>({...f,jogador_id:e.target.value,jogador_nome:u?.username||'',fazenda:u?.fazenda||''}))}}>
                    <option value="">Selecione o jogador...</option>
                    {users.filter(u=>u.role==='jogador'&&u.status==='aprovado').map(u=><option key={u.id} value={u.id}>{u.username}{u.fazenda?` — Faz. ${u.fazenda}`:''}</option>)}
                  </Sel>
                  <div style={gs(120)}>
                    <Sel T={T} label="Fazenda (opcional)" value={nLote.fazenda_id} onChange={e=>setNLote(f=>({...f,fazenda_id:e.target.value}))}>
                    <option value="">Sem fazenda vinculada</option>
                    {fazendas.map(f=><option key={f.id} value={f.id}>{f.codigo} — {f.nome} ({f.tamanho_ha}ha)</option>)}
                  </Sel>
                  <Inp T={T} label="Quantidade" type="number" value={nLote.quantidade} onChange={e=>setNLote(f=>({...f,quantidade:Number(e.target.value)}))}/>
                    <Inp T={T} label="Preço/cab ($)" type="number" value={nLote.valor_compra} onChange={e=>setNLote(f=>({...f,valor_compra:Number(e.target.value)}))}/>
                  </div>
                  <Inp T={T} label="Data compra" type="date" value={nLote.data_compra} onChange={e=>setNLote(f=>({...f,data_compra:e.target.value}))}/>
                  <Inp T={T} label="Comprovante" value={nLote.comprovante} onChange={e=>setNLote(f=>({...f,comprovante:e.target.value}))} placeholder="discord.com/..."/>
                </div>
                <Btn T={T} onClick={async()=>{const r=await api('/api/lotes',{method:'POST',body:JSON.stringify(nLote)});if(!r.error){sounds.success();notify('✓ Lote '+r.codigo+' registrado!');reload()}}}>Registrar lote</Btn>
              </Card>
              <Card T={T} hover={false}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:6}}>Abates — aguardando addmoney</div>
                <p style={{fontSize:12,color:T.textMuted,marginBottom:14}}>Faça o addmoney no servidor, depois marque como pago.</p>
                <Tbl T={T} headers={['Jogador','Lote','Qtd','Valor','']}
                  rows={abatesPend.map(l=>[
                    <span style={{fontWeight:600}}>{l.jogador_nome}</span>,l.codigo,l.quantidade,
                    <span style={{color:T.gold,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>${fmt(l.valor_abate)}</span>,
                    <Btn T={T} v="amber" onClick={async()=>{const r=await api(`/api/lotes/${l.id}`,{method:'PATCH',body:JSON.stringify({action:'marcar_pago'})});if(!r.error){sounds.coin();notify('✓ Pago!');reload()}}} style={{padding:'5px 10px',fontSize:11}}>✓ Pago</Btn>
                  ])}/>
              </Card>
            </div>

            <Card T={T} hover={false}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Todo o rebanho ativo</div>
              <Tbl T={T} headers={['Jogador','Fazenda','Lote','Qtd','Fase','Pronto em','Status','Ação','🗑']}
                rows={todosLotes.filter(l=>!['pago','vendido'].includes(l.status)).map(l=>[
                  <span style={{fontWeight:600}}>{l.jogador_nome}</span>,
                  l.fazenda||'—',l.codigo,l.quantidade,faseBadge(l.fase),
                  <CountdownRing dataFase={l.data_fase4} T={T} size={36}/>,
                  <Badge type={l.status==='ativo'?'gray':l.status==='aguardando_pagamento'?'amber':l.status==='em_transito'?'info':'ok'}>{l.status==='ativo'?'Ativo':l.status==='aguardando_pagamento'?'Aguard.':l.status==='em_transito'?'🚛 A caminho':'✓ Pago'}</Badge>,
                  l.fase!=='abatido'&&l.status==='ativo'?<Btn T={T} v="ghost" onClick={async()=>{const r=await api(`/api/lotes/${l.id}`,{method:'PATCH',body:JSON.stringify({action:'avancar_fase'})});if(!r.error){sounds.phase();notify('Fase avançada!');reload()}}} style={{padding:'5px 10px',fontSize:11}}>Avançar</Btn>:'—',
                  <Btn T={T} v="danger" onClick={async()=>{await api('/api/admin/reset',{method:'POST',body:JSON.stringify({tipo:'lote',lote_id:l.id})});notify('Lote removido.');api('/api/lotes').then(d=>setLotes(safeArr(d)))}} style={{padding:'4px 8px',fontSize:11}}>✕</Btn>
                ])}/>
            </Card>

            <div style={gs(300)}>
              <Card T={T} hover={false}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Registrar ração</div>
                <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:14}}>
                  <Sel T={T} label="Jogador" value={nRacao.jogador_id} onChange={e=>setNRacao(f=>({...f,jogador_id:e.target.value}))}>
                    <option value="">Selecione...</option>
                    {users.filter(u=>u.role==='jogador'&&u.status==='aprovado').map(u=><option key={u.id} value={u.id}>{u.username}</option>)}
                  </Sel>
                  <Inp T={T} label="Quantidade (kg)" type="number" value={nRacao.kg} onChange={e=>setNRacao(f=>({...f,kg:e.target.value}))} placeholder="500"/>
                  <Inp T={T} label="Valor pago ($)" type="number" value={nRacao.valor} onChange={e=>setNRacao(f=>({...f,valor:e.target.value}))} placeholder="1000"/>
                </div>
                <Btn T={T} onClick={async()=>{const r=await api('/api/racao',{method:'POST',body:JSON.stringify(nRacao)});if(!r.error) notify('✓ Ração registrada!')}}>Registrar ração</Btn>
              </Card>
              <Card T={T} hover={false}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:6}}>Cadastros pendentes</div>
                {usersPend.length===0?<p style={{fontSize:13,color:T.textMuted,padding:'8px 0'}}>Nenhum cadastro pendente.</p>
                :<Tbl T={T} headers={['Usuário','Fazenda','','']}
                  rows={usersPend.map(u=>[
                    <span style={{fontWeight:600}}>{u.username}</span>,u.fazenda||'—',
                    <Btn T={T} onClick={async()=>{await api('/api/admin/usuarios',{method:'PATCH',body:JSON.stringify({id:u.id,status:'aprovado'})});sounds.success();notify('✓ Aprovado!');api('/api/admin/usuarios').then(d=>setUsers(safeArr(d)))}} style={{padding:'5px 10px',fontSize:11}}>✓</Btn>,
                    <Btn T={T} v="danger" onClick={async()=>{await api('/api/admin/usuarios',{method:'PATCH',body:JSON.stringify({id:u.id,status:'recusado'})});api('/api/admin/usuarios').then(d=>setUsers(safeArr(d)))}} style={{padding:'5px 10px',fontSize:11}}>✗</Btn>
                  ])}/>}
              </Card>
            </div>

            <Card T={T} hover={false}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Gerenciar jogadores</div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:14,alignItems:'flex-end'}}>
                <div style={{flex:1,minWidth:130}}><Inp T={T} label="Usuário" value={nUser.username} onChange={e=>setNUser(f=>({...f,username:e.target.value}))} placeholder="nome_jogador"/></div>
                <div style={{flex:1,minWidth:110}}><Inp T={T} label="Senha" type="password" value={nUser.password} onChange={e=>setNUser(f=>({...f,password:e.target.value}))} placeholder="senha123"/></div>
                <div style={{flex:1,minWidth:90}}><Inp T={T} label="Fazenda" value={nUser.fazenda} onChange={e=>setNUser(f=>({...f,fazenda:e.target.value}))} placeholder="0325"/></div>
                <Btn T={T} onClick={async()=>{const r=await api('/api/admin/usuarios',{method:'POST',body:JSON.stringify(nUser)});if(!r.error){sounds.success();notify('✓ Criado!');api('/api/admin/usuarios').then(d=>setUsers(safeArr(d)))}}}>Criar</Btn>
              </div>
              <Tbl T={T} headers={['Usuário','Fazenda','Status','Editar','']}
                rows={users.filter(u=>u.status!=='pendente').map(u=>[
                  <span style={{fontWeight:600}}>{u.username}</span>,u.fazenda||'—',
                  <Badge type={u.status==='aprovado'||u.role==='admin'?'ok':'danger'}>{u.role==='admin'?'admin':u.status||'aprovado'}</Badge>,
                  <div style={{display:'flex',gap:4}}>{u.role!=='admin'?<Btn T={T} v="ghost" onClick={()=>{setEditTarget(u);setEditPerfil({fazenda:u.fazenda||'',foto_url:u.foto_url||'',bio:u.bio||'',nova_senha:''})}} style={{padding:'4px 8px',fontSize:11}}>✏ Editar</Btn>:''}<Btn T={T} v="ghost" onClick={()=>{setViewProfile(u.username);setProfileData({...u,stats:{total_abates:0,total_cabecas:0,total_ganho:0}})}} style={{padding:'4px 8px',fontSize:11}}>👤</Btn></div>,
                  u.role!=='admin'?<Btn T={T} v="danger" onClick={async()=>{await api('/api/admin/usuarios',{method:'DELETE',body:JSON.stringify({id:u.id})});api('/api/admin/usuarios').then(d=>setUsers(safeArr(d)))}} style={{padding:'4px 8px',fontSize:11}}>✕</Btn>:'—'
                ])}/>
            </Card>

            {editTarget&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(3px)'}}>
              <div className="page-enter" style={{background:T.card,border:`1px solid ${T.border2}`,borderRadius:20,padding:32,width:'100%',maxWidth:400,boxShadow:'0 30px 80px rgba(0,0,0,.4)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.text}}>Editar — {editTarget.username}</h3>
                  <button onClick={()=>setEditTarget(null)} style={{background:'none',border:'none',color:T.textMuted,fontSize:22,cursor:'pointer'}}>×</button>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:20}}>
                  <Inp T={T} label="Fazenda" value={editPerfil.fazenda} onChange={e=>setEditPerfil(f=>({...f,fazenda:e.target.value}))} placeholder="0325"/>
                  <Inp T={T} label="URL da foto" value={editPerfil.foto_url} onChange={e=>setEditPerfil(f=>({...f,foto_url:e.target.value}))} placeholder="https://..."/>
                  <Inp T={T} label="Bio" value={editPerfil.bio} onChange={e=>setEditPerfil(f=>({...f,bio:e.target.value}))} placeholder="Criador desde 2024..."/>
                  <Inp T={T} label="Nova senha (opcional)" type="password" value={editPerfil.nova_senha} onChange={e=>setEditPerfil(f=>({...f,nova_senha:e.target.value}))} placeholder="••••••"/>
                </div>
                <div style={{display:'flex',gap:10}}>
                  <Btn T={T} v="ghost" onClick={()=>setEditTarget(null)} style={{flex:1}}>Cancelar</Btn>
                  <Btn T={T} onClick={()=>salvarPerfil(editTarget.id)} style={{flex:2}}>Salvar alterações</Btn>
                </div>
              </div>
            </div>}

            <Card T={T} hover={false}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Log de ações</div>
              <Tbl T={T} headers={['Data/hora','Admin','Ação','Detalhes']}
                rows={adminLog.map(l=>[
                  <span style={{fontSize:11,color:T.textMuted}}>{new Date(l.criado_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>,
                  <span style={{fontWeight:600,color:T.gold}}>{l.admin_nome}</span>,
                  <Badge type="info">{l.acao}</Badge>,
                  <span style={{fontSize:12,color:T.textDim}}>{l.detalhes}</span>
                ])}/>
            </Card>
          </>}

          {/* HISTÓRICO */}
          {page==='hist'&&user?.role==='admin'&&<>
            <SectionTitle T={T} icon="📋" title="Histórico de Transações" sub="Visão completa — restrito a administradores"/>
            <div style={{...gs(130),marginBottom:20}}>
              <Metric T={T} icon="📊" label="Total" value={trans.length}/>
              <Metric T={T} icon="🥩" label="Abates" value={trans.filter(t=>t.tipo==='abate').length}/>
              <Metric T={T} icon="🤝" label="Vendas" value={trans.filter(t=>t.tipo==='p2p').length}/>
              <Metric T={T} icon="💰" label="Volume" value={`$${fmt(trans.reduce((s,t)=>s+Number(t.valor),0))}`} color={T.gold}/>
            </div>
            <Card T={T} hover={false}>
              <Tbl T={T} headers={['Data','Tipo','De','Para','Qtd','Total']}
                rows={trans.map(t=>[
                  new Date(t.criado_em).toLocaleDateString('pt-BR'),
                  <Badge type={t.tipo==='abate'?'ok':t.tipo==='p2p'?'purple':t.tipo==='compra_racao'?'amber':'info'}>{t.tipo==='abate'?'Abate':t.tipo==='p2p'?'Venda':t.tipo==='compra_racao'?'Ração':'Compra NPC'}</Badge>,
                  t.de_jogador,t.para_jogador,t.quantidade||'—',
                  <span style={{fontWeight:700,color:T.gold,fontFamily:"'Playfair Display',serif"}}>${fmt(t.valor)}</span>
                ])}/>
            </Card>
          </>}

          {/* ── FAZENDAS ── */}
          {page==='fazendas'&&<FazendasPage T={T} user={user} api={api} notify={notify} users={users}/>}
          {page==='pastagem'&&<PastagemPage T={T} user={user} api={api} notify={notify} sounds={sounds}/>}
          {page==='minha_fazenda'&&<MinhaFazendaPage T={T} user={user} api={api} notify={notify} lotes={lotes} mercado={mercado} racao={racao}/>}
          {page==='celeiro'&&<CeleiroPage T={T} user={user} api={api} notify={notify} mercado={mercado} sounds={sounds}/>}
          {page==='transportadora'&&<TransportadoraPage T={T} user={user} api={api} notify={notify} sounds={sounds}/>}
          {page==='fretes_npc'&&<FretesNPCPage T={T} user={user} api={api} notify={notify} sounds={sounds}/>}
          {page==='concessionaria'&&<ConcessionariaPage T={T} user={user} api={api} notify={notify} sounds={sounds}/>}

          {page==='hist'&&user?.role!=='admin'&&<Alrt type="danger">Acesso restrito — apenas administradores.</Alrt>}

          {/* Profile Modal */}
          {viewProfile&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)'}}>
            <div style={{background:T.card,border:`1px solid ${T.border2}`,borderRadius:20,padding:32,width:'100%',maxWidth:400,boxShadow:'0 30px 80px rgba(0,0,0,.4)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.text}}>👤 Perfil do Jogador</h3>
                <button onClick={()=>{setViewProfile(null);setProfileData(null)}} style={{background:'none',border:'none',color:T.textMuted,fontSize:22,cursor:'pointer'}}>×</button>
              </div>
              <div style={{textAlign:'center',marginBottom:20}}>
                <div style={{width:72,height:72,borderRadius:'50%',overflow:'hidden',margin:'0 auto 12px',border:`2px solid ${T.gold}`,background:T.inputBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>
                  {profileData?.foto_url?<img src={profileData.foto_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:'🐄'}
                </div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:T.text}}>{profileData?.username||viewProfile}</div>
                {profileData?.fazenda&&<div style={{fontSize:12,color:T.textMuted}}>Fazenda {profileData.fazenda}</div>}
                {profileData?.bio&&<div style={{fontSize:13,color:T.textDim,marginTop:8,lineHeight:1.6}}>{profileData.bio}</div>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {[
                  {label:'Abates',value:profileData?.stats?.total_abates||0},
                  {label:'Cabeças',value:fmt(profileData?.stats?.total_cabecas||0)},
                  {label:'Ganho total',value:`$${fmt(profileData?.stats?.total_ganho||0)}`},
                ].map(m=>(
                  <div key={m.label} style={{background:T.inputBg,borderRadius:10,padding:'12px 10px',border:`1px solid ${T.border}`,textAlign:'center'}}>
                    <div style={{fontSize:10,color:T.textMuted,marginBottom:4,textTransform:'uppercase',letterSpacing:'.5px'}}>{m.label}</div>
                    <div style={{fontSize:16,fontWeight:700,color:T.gold,fontFamily:"'Playfair Display',serif"}}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>}

          {/* ─── LAVOURA TEASER ─────────────────────────────── */}
          {page==='lavoura'&&<div style={{animation:'fadeSlideIn .35s ease',maxWidth:900,margin:'0 auto'}}>
            {/* Hero */}
            <div style={{textAlign:'center',padding:'40px 20px 32px',marginBottom:8}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(74,222,128,.08)',border:'1px solid rgba(74,222,128,.25)',borderRadius:20,padding:'5px 16px',marginBottom:20}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',animation:'blinkDot 1.2s step-end infinite'}}/>
                <span style={{fontSize:10,fontWeight:800,letterSpacing:2,color:'#4ade80',fontFamily:'var(--font-data)'}}>EM DESENVOLVIMENTO</span>
              </div>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:48,fontWeight:800,color:'#eaddcf',lineHeight:1.1,marginBottom:14}}>Sistema de<br/><span style={{color:'#4ade80'}}>Lavoura</span></h1>
              <p style={{fontSize:15,color:'#a6968a',maxWidth:540,margin:'0 auto 28px',lineHeight:1.8,fontFamily:'var(--font-mono)'}}>Plante, cultive e colha. Três culturas, equipamentos reais de grandes marcas e uma economia viva — tudo controlado por você, sem passar pelo admin.</p>
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
                  {icon:'🌾',title:'Plantar',sub:'Sementes +\nAdubo',color:'#a6968a'},
                  {icon:'🌤',title:'Crescer',sub:'7 a 14 dias\nautomático',color:'#4ade80'},
                  {icon:'✅',title:'Pronto',sub:'Cultura\nmadura',color:'#4ade80'},
                  {icon:'🌿',title:'Colher',sub:'Colheitadeira\nem campo',color:'#c28c46'},
                  {icon:'💵',title:'Vender',sub:'Ração ou\ndinheiro',color:'#4ade80'},
                ].map((s,i,arr)=>(
                  <div key={s.title} style={{display:'flex',alignItems:'center',flexShrink:0}}>
                    <div style={{textAlign:'center',minWidth:90,padding:'12px 8px',background:'#130d0a',border:`1px solid ${s.color}33`,borderRadius:8}}>
                      <div style={{fontSize:26,marginBottom:6}}>{s.icon}</div>
                      <div style={{fontSize:12,fontWeight:700,color:s.color,fontFamily:'var(--font-data)',marginBottom:2}}>{s.title}</div>
                      <div style={{fontSize:9,color:'#5c4a42',whiteSpace:'pre-line',lineHeight:1.4,fontFamily:'var(--font-data)'}}>{s.sub}</div>
                    </div>
                    {i<arr.length-1&&<div style={{fontSize:16,color:'#36251e',margin:'0 4px',flexShrink:0}}>→</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Equipamentos */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,letterSpacing:2,color:'#5c4a42',textTransform:'uppercase',marginBottom:12,fontFamily:'var(--font-data)',paddingLeft:2}}>Concessionária — Equipamentos</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:10}}>
                {[
                  {brand:'Valtra',img:'/Valtra.jpg',color:'#c0392b',badge:'ENTRADA',items:['A110 — Trator ($28k)','SP-20 — Plantadeira ($20k)','CH-50 — Colheitadeira ($52k)'],desc:'Confiável e acessível. Ideal para começar.'},
                  {brand:'John Deere',img:'/Johndeere.jpg',color:'#27ae60',badge:'INTERMEDIÁRIO',items:['5090E — Trator ($65k)','7000 Precision — Plantadeira ($45k)','S660i — Colheitadeira ($90k)'],desc:'O padrão do mercado. Velocidade e eficiência.'},
                  {brand:'Fendt',img:'/fendt.jpg',color:'#2d6a4f',badge:'PREMIUM',items:['Fendt 828 — Trator ($110k)','Fendt Momentum — Plantadeira ($80k)','Fendt IDEAL 9 — Colheitadeira ($145k)'],desc:'Alta performance. O topo do agronegócio mundial.'},
                ].map(b=>(
                  <div key={b.brand} style={{background:'#1e1612',border:`1px solid ${b.color}44`,borderTop:`3px solid ${b.color}`,borderRadius:8,overflow:'hidden',position:'relative'}}>
                    {/* Foto da máquina */}
                    <div style={{height:160,overflow:'hidden',position:'relative',background:'#0a0706'}}>
                      <img src={b.img} alt={b.brand} style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.6) saturate(.9)',display:'block',transition:'filter .3s'}} onMouseEnter={e=>e.target.style.filter='brightness(.8) saturate(1)'} onMouseLeave={e=>e.target.style.filter='brightness(.6) saturate(.9)'} onError={e=>e.target.style.display='none'}/>
                      <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(30,22,18,.95) 0%,rgba(30,22,18,.2) 60%,transparent 100%)'}}/>
                      <span style={{position:'absolute',top:10,right:10,fontSize:8,fontWeight:800,letterSpacing:1.5,background:`${b.color}cc`,color:'#fff',padding:'3px 8px',borderRadius:4,fontFamily:'var(--font-data)'}}>{b.badge}</span>
                    </div>
                    <div style={{padding:'16px 16px 18px'}}>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800,color:'#eaddcf',marginBottom:6}}>{b.brand}</div>
                      <div style={{fontSize:11,color:'#a6968a',marginBottom:12,lineHeight:1.6,fontFamily:'var(--font-mono)'}}>{b.desc}</div>
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {b.items.map(it=>(
                          <div key={it} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'#a6968a',fontFamily:'var(--font-data)',background:'#130d0a',borderRadius:5,padding:'6px 10px',border:`1px solid ${b.color}22`}}>
                            <div style={{width:5,height:5,borderRadius:'50%',background:b.color,flexShrink:0}}/>
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
                {icon:'🌽',name:'Milho',ciclo:'7 dias',custo:'$1.100/ha',receita:'$1.430/ha',lucro:'$330/ha',use:'→ Ração automática',color:'#f5c542',detalhe:'Mais rápido. Melhor para quem tem gado.'},
                {icon:'🫘',name:'Soja',ciclo:'10 dias',custo:'$1.300/ha',receita:'$1.690/ha',lucro:'$390/ha',use:'→ Dinheiro (addmoney)',color:'#4ade80',detalhe:'Ciclo longo, maior lucro por ciclo.'},
                {icon:'🌿',name:'Capim',ciclo:'14 dias',custo:'$500/ha',receita:'Capacidade',lucro:'+1,5 ha/ha',use:'→ Expande seu pasto',color:'#86efac',detalhe:'Não é cultivo de dinheiro — expande sua fazenda.'},
              ].map(c=>(
                <div key={c.name} style={{background:'#1e1612',border:'1px solid #36251e',borderTop:`2px solid ${c.color}`,borderRadius:8,padding:'16px 14px'}}>
                  <div style={{fontSize:28,marginBottom:8}}>{c.icon}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:'#eaddcf',marginBottom:4}}>{c.name}</div>
                  <div style={{fontSize:10,color:'#5c4a42',marginBottom:12,fontFamily:'var(--font-data)',lineHeight:1.6}}>{c.detalhe}</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
                    {[['Ciclo',c.ciclo],['Custo',c.custo],['Receita',c.receita],['Lucro',c.lucro]].map(([k,v])=>(
                      <div key={k} style={{background:'#130d0a',borderRadius:4,padding:'6px 8px'}}>
                        <div style={{fontSize:8,color:'#5c4a42',letterSpacing:1,fontFamily:'var(--font-data)'}}>{k.toUpperCase()}</div>
                        <div style={{fontSize:11,fontWeight:700,color:k==='Lucro'?c.color:'#eaddcf',fontFamily:'var(--font-data)'}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:10,fontWeight:700,color:c.color,fontFamily:'var(--font-data)',letterSpacing:0.5}}>{c.use}</div>
                </div>
              ))}
            </div>

            {/* Insumos */}
            <div style={{background:'#1e1612',border:'1px solid #36251e',borderRadius:10,padding:'20px 24px',marginBottom:14}}>
              <div style={{fontSize:10,letterSpacing:2,color:'#5c4a42',textTransform:'uppercase',marginBottom:14,fontFamily:'var(--font-data)'}}>Insumos — Você compra, você planta</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
                {[
                  {label:'Semente Milho',preco:'$500/ha',icon:'🌽'},
                  {label:'Semente Soja',preco:'$700/ha',icon:'🫘'},
                  {label:'Semente Capim',preco:'$300/ha',icon:'🌿'},
                  {label:'Adubo NPK',preco:'$400/ha',icon:'🧪'},
                  {label:'Calcário',preco:'$200/ha',icon:'🪨'},
                ].map(i=>(
                  <div key={i.label} style={{background:'#130d0a',border:'1px solid #36251e',borderRadius:6,padding:'10px 12px',display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:20}}>{i.icon}</span>
                    <div>
                      <div style={{fontSize:11,color:'#eaddcf',fontWeight:600,fontFamily:'var(--font-data)'}}>{i.label}</div>
                      <div style={{fontSize:10,color:'#c28c46',fontFamily:'var(--font-data)',fontWeight:700}}>{i.preco}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Economia target */}
            <div style={{background:'rgba(74,222,128,.04)',border:'1px solid rgba(74,222,128,.2)',borderRadius:10,padding:'20px 24px',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
                <span style={{fontSize:16}}>📊</span>
                <div style={{fontSize:14,fontWeight:700,color:'#eaddcf',fontFamily:"'Playfair Display',serif"}}>Meta econômica do sistema</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
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

            {/* CTA */}
            <div style={{textAlign:'center',padding:'24px 0 40px'}}>
              <div style={{fontSize:11,color:'#5c4a42',fontFamily:'var(--font-data)',letterSpacing:1,marginBottom:8}}>SISTEMA EM CONSTRUÇÃO — FIQUE DE OLHO NAS ATUALIZAÇÕES</div>
              <div style={{fontSize:13,color:'#a6968a',fontFamily:'var(--font-mono)',lineHeight:1.8}}>O sistema de lavoura será integrado diretamente à sua fazenda.<br/>Tratores, plantadeiras e colheitadeiras disponíveis na Concessionária.</div>
            </div>
          </div>}

          {/* ─── NOTÍCIAS ────────────────────────────────────── */}
          {page==='noticias'&&<div style={{animation:'fadeSlideIn .35s ease',maxWidth:840,margin:'0 auto'}}>
            {/* Breaking banner */}
            <div style={{background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.35)',borderLeft:'4px solid #f87171',borderRadius:8,padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#f87171',animation:'blinkDot 1s step-end infinite',flexShrink:0}}/>
              <div>
                <div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#f87171',fontFamily:'var(--font-data)',marginBottom:3}}>AO VIVO · URGENTE · 02 ABR 2026</div>
                <div style={{fontSize:15,fontWeight:700,color:'#eaddcf',fontFamily:"'Playfair Display',serif",lineHeight:1.3}}>Preço do Gado Dispara devido à Guerra do Irã</div>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,420px),1fr))',gap:14,alignItems:'start'}}>
              {/* Article */}
              <div style={{background:'#1e1612',border:'1px solid #36251e',borderRadius:10,overflow:'hidden'}}>
                <div style={{height:5,background:'linear-gradient(90deg,#f87171,#c28c46)'}}/>
                <div style={{padding:'24px 26px'}}>
                  <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
                    <span style={{fontSize:9,fontWeight:700,letterSpacing:1.5,background:'rgba(248,113,113,.15)',color:'#f87171',border:'1px solid rgba(248,113,113,.3)',padding:'3px 8px',borderRadius:4,fontFamily:'var(--font-data)'}}>COMMODITIES</span>
                    <span style={{fontSize:9,fontWeight:700,letterSpacing:1.5,background:'rgba(194,140,70,.15)',color:'#c28c46',border:'1px solid rgba(194,140,70,.3)',padding:'3px 8px',borderRadius:4,fontFamily:'var(--font-data)'}}>MERCADO PECUÁRIO</span>
                  </div>
                  <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:800,color:'#eaddcf',lineHeight:1.25,marginBottom:16}}>Escalada militar no Oriente Médio eleva cotação do boi gordo a <span style={{color:'#4ade80'}}>$2.000 por cabeça</span></h2>
                  <div style={{fontSize:11,color:'#5c4a42',fontFamily:'var(--font-data)',letterSpacing:1,marginBottom:20}}>Por GVRPNL Agência de Notícias · 02 abr. 2026 às 09:41</div>

                  <p style={{fontSize:13,color:'#a6968a',lineHeight:1.9,fontFamily:'var(--font-mono)',marginBottom:16}}>O conflito armado entre Israel e Irã, iniciado na madrugada desta quarta-feira, provocou uma corrida imediata por proteínas animais nos mercados internacionais. A incerteza no fornecimento global de grãos, especialmente de milho e soja provenientes do corredor do Mar Negro, pressionou fortemente os custos de produção — mas também elevou o preço final do boi gordo, que alcançou <strong style={{color:'#eaddcf'}}>$2.000 por cabeça no frigorífico</strong> nas primeiras horas do pregão.</p>

                  <p style={{fontSize:13,color:'#a6968a',lineHeight:1.9,fontFamily:'var(--font-mono)',marginBottom:16}}>O bezerro, que ontem era negociado a $800, sofreu reajuste imediato para <strong style={{color:'#eaddcf'}}>$950</strong>, refletindo a antecipação dos criadores pelo aumento do ciclo completo. Garrotes e bois gordos também registraram alta proporcional, com o mercado ajustando as margens para manter a atratividade de cada fase do ciclo.</p>

                  <p style={{fontSize:13,color:'#a6968a',lineHeight:1.9,fontFamily:'var(--font-mono)',marginBottom:20}}>"O mercado de proteínas está respondendo de forma clássica a um choque de oferta geopolítico," afirmou analista do setor. "Quem tem gado em estoque agora está em posição favorável."</p>

                  <div style={{background:'#130d0a',border:'1px solid #36251e',borderLeft:'3px solid #c28c46',borderRadius:4,padding:'14px 16px',marginBottom:16}}>
                    <div style={{fontSize:9,color:'#5c4a42',letterSpacing:2,fontFamily:'var(--font-data)',marginBottom:8}}>VARIAÇÃO NO PREGÃO</div>
                    {[
                      {fase:'Bezerro · S1',antes:800,depois:950,color:'#7ab0e0'},
                      {fase:'Garrote · S2',antes:1060,depois:1200,color:'#c28c46'},
                      {fase:'Boi · S3',antes:1312,depois:1500,color:'#c28c46'},
                      {fase:'Frigorífico · S4',antes:1724,depois:2002,color:'#4ade80'},
                    ].map(row=>(
                      <div key={row.fase} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:12,alignItems:'center',padding:'7px 0',borderBottom:'1px solid #36251e'}}>
                        <div style={{fontSize:11,color:'#a6968a',fontFamily:'var(--font-data)'}}>{row.fase}</div>
                        <div style={{fontSize:11,color:'#5c4a42',fontFamily:'var(--font-data)',textDecoration:'line-through'}}>${row.antes.toLocaleString('pt-BR')}</div>
                        <div style={{fontSize:13,fontWeight:700,color:row.color,fontFamily:'var(--font-data)'}}>${row.depois.toLocaleString('pt-BR')}</div>
                        <div style={{fontSize:11,fontWeight:700,color:'#4ade80',fontFamily:'var(--font-data)',minWidth:40,textAlign:'right'}}>+{((row.depois/row.antes-1)*100).toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>

                  <p style={{fontSize:12,color:'#5c4a42',lineHeight:1.8,fontFamily:'var(--font-mono)'}}>Os preços são dinâmicos e podem oscilar com base no volume do rebanho ativo no servidor. Consulte a aba Mercado para acompanhar as cotações em tempo real.</p>
                </div>
              </div>

              {/* Sidebar de notícias */}
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{background:'#1e1612',border:'1px solid #36251e',borderRadius:8,padding:'16px'}}>
                  <div style={{fontSize:9,color:'#5c4a42',letterSpacing:2,fontFamily:'var(--font-data)',marginBottom:12,textTransform:'uppercase'}}>Impacto no mercado</div>
                  {[
                    {label:'Variação BZR',val:'+18,75%',c:'#4ade80'},
                    {label:'Variação FGR',val:'+16,1%',c:'#4ade80'},
                    {label:'Ração/kg',val:'$2–$3/kg',c:'#c28c46'},
                    {label:'Margem est.',val:'~33%',c:'#4ade80'},
                    {label:'Status',val:'EM ALTA',c:'#f87171'},
                  ].map(r=>(
                    <div key={r.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #36251e'}}>
                      <span style={{fontSize:10,color:'#a6968a',fontFamily:'var(--font-data)'}}>{r.label}</span>
                      <span style={{fontSize:12,fontWeight:700,color:r.c,fontFamily:'var(--font-data)'}}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <div style={{background:'rgba(194,140,70,.06)',border:'1px solid rgba(194,140,70,.25)',borderRadius:8,padding:'16px'}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#c28c46',fontFamily:"'Playfair Display',serif",marginBottom:8}}>💡 Dica do Analista</div>
                  <p style={{fontSize:11,color:'#a6968a',lineHeight:1.7,fontFamily:'var(--font-mono)'}}>Com boi terminado a $2.000, quem fecha o ciclo completo (bezerro → abate) obtém a maior margem histórica do servidor. Mantenha o rebanho saudável e a ração em dia.</p>
                </div>

                <div style={{background:'rgba(74,222,128,.04)',border:'1px solid rgba(74,222,128,.2)',borderRadius:8,padding:'16px'}}>
                  <div style={{fontSize:9,color:'#4ade80',letterSpacing:2,fontFamily:'var(--font-data)',marginBottom:10,fontWeight:700}}>EM BREVE</div>
                  <div style={{fontSize:12,fontWeight:700,color:'#eaddcf',fontFamily:"'Playfair Display',serif",marginBottom:6}}>🌱 Sistema de Lavoura</div>
                  <p style={{fontSize:11,color:'#a6968a',lineHeight:1.6,fontFamily:'var(--font-mono)',marginBottom:10}}>Plante milho, soja e capim. Compre tratores e colheitadeiras das melhores marcas do agro.</p>
                  <button onClick={()=>setPage('lavoura')} style={{width:'100%',background:'rgba(74,222,128,.1)',border:'1px solid rgba(74,222,128,.3)',color:'#4ade80',borderRadius:6,padding:'8px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-data)',letterSpacing:1}}>VER PRÉVIA →</button>
                </div>
              </div>
            </div>
          </div>}

        </div>
      </div>
    </div>
  </>
}
