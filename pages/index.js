import { FazendasPage, MinhaFazendaPage, CeleiroPage, TransportadoraPage, ConcessionariaPage } from '../components/fazendas_components'
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

// ─── CSS Globals ──────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{font-family:'DM Sans',sans-serif;background:#1a0f00}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#5a3a1a;border-radius:2px}
  @keyframes fadeSlideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes countSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes slideRight{from{transform:translateX(-100%)}to{transform:translateX(0)}}
  @keyframes slideLeft{from{transform:translateX(0)}to{transform:translateX(-100%)}}
  .page-enter{animation:fadeSlideIn .35s cubic-bezier(.4,0,.2,1) both}
  .card-hover{transition:transform .2s ease,box-shadow .2s ease}
  .card-hover:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(200,146,42,.2)!important}
  .btn-hover{transition:all .15s ease}
  .btn-hover:hover{filter:brightness(1.1);transform:translateY(-1px)}
  .btn-hover:active{transform:translateY(0)}
  .drawer-open{animation:slideRight .28s cubic-bezier(.4,0,.2,1) both}
  @media(max-width:768px){
    .desktop-only{display:none!important}
    .mobile-header{display:flex!important}
  }
  @media(min-width:769px){
    .mobile-only{display:none!important}
    .mobile-header{display:none!important}
  }
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
`

// ─── Theme ────────────────────────────────────────────────────────────────────
const D = {
  // Dark: Rural Premium
  bg:'#120a00', panel:'#1e1208', card:'#241608', cardHover:'#2a1c0a',
  border:'#3a2510', border2:'#5a3a18', gold:'#c8922a', goldLight:'#e8b84a',
  goldDark:'#8a5e10', cream:'#f0ddb0', creamDim:'#b09870', creamMuted:'#7a6040',
  green:'#6a9a30', greenDark:'#4a7a1e', red:'#c84040', amber:'#d08020',
  inputBg:'#1a0f04', navBg:'#160c02', isDark:true,
  text:'#f0ddb0', textDim:'#b09870', textMuted:'#7a6040',
}
const L = {
  // Light: Rural Day
  bg:'#faf5e8', panel:'#fff8ea', card:'#ffffff', cardHover:'#fffbf0',
  border:'#e0cc9a', border2:'#c8aa68', gold:'#8a5e10', goldLight:'#a07828',
  goldDark:'#6a4808', cream:'#3d1f0a', creamDim:'#6a4020', creamMuted:'#9a7050',
  green:'#3a6010', greenDark:'#2a4808', red:'#a02020', amber:'#a06010',
  inputBg:'#fdf8ee', navBg:'#f5e8c8', isDark:false,
  text:'#3d1f0a', textDim:'#6a4020', textMuted:'#9a7050',
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Badge({type, children}) {
  const s = {
    ok:['#0a2a1a','#4ad4a0','#1a6a4a'], warn:['#3a2a00','#c8922a','#6a5010'],
    info:['#0a0a30','#7060f0','#2010a0'], gray:['#2a2018','#9a8060','#4a3020'],
    purple:['#100a30','#9060e0','#3020a0'], danger:['#3a0808','#e06060','#6a1818'],
    amber:['#3a2000','#d08020','#6a3800'], gold:['#1a0a30','#a080ff','#5030c0'],
    nl:['#0a0818','linear-gradient(135deg,#4060d0,#8040c0)','#3020a0'],
  }[type]||['#2a2018','#9a8060','#4a3020']
  return <span style={{background:s[0],color:s[1],border:`1px solid ${s[2]}`,fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:600,whiteSpace:'nowrap',display:'inline-block',letterSpacing:'.4px'}}>{children}</span>
}

function Card({children, style, glow, hover=true, T}) {
  return <div className={hover?'card-hover':''} style={{background:T.card,border:`1px solid ${glow?T.border2:T.border}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:glow?`0 0 30px rgba(200,146,42,.12),0 2px 12px rgba(0,0,0,.3)`:'0 2px 12px rgba(0,0,0,.15)',position:'relative',overflow:'hidden',...style}}>
    {glow&&<div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${T.gold},transparent)`,opacity:.4}}/>}
    {children}
  </div>
}

function SectionTitle({icon, title, sub, T}) {
  return <div style={{marginBottom:28,paddingBottom:16,borderBottom:`1px solid ${T.border}`}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
      <span style={{fontSize:24}}>{icon}</span>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:T.text,letterSpacing:'-.3px'}}>{title}</h1>
    </div>
    {sub&&<p style={{fontSize:13,color:T.textMuted,marginLeft:36}}>{sub}</p>}
  </div>
}

function Metric({label, value, sub, color, T, icon}) {
  return <div style={{background:T.inputBg,borderRadius:12,padding:'16px 18px',border:`1px solid ${T.border}`,position:'relative',overflow:'hidden'}}>
    <div style={{position:'absolute',top:10,right:12,fontSize:20,opacity:.15}}>{icon}</div>
    <div style={{fontSize:10,color:T.textMuted,marginBottom:8,textTransform:'uppercase',letterSpacing:'1px',fontWeight:600}}>{label}</div>
    <div style={{fontSize:24,fontWeight:700,color:color||T.text,fontFamily:"'Playfair Display',serif"}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:T.textMuted,marginTop:4}}>{sub}</div>}
  </div>
}

function Inp({label, T, hint, ...props}) {
  return <div style={{display:'flex',flexDirection:'column',gap:6}}>
    {label&&<label style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px'}}>{label}</label>}
    <input {...props} style={{background:T.inputBg,border:`1px solid ${T.border2}`,borderRadius:10,padding:'10px 14px',fontSize:13,color:T.text,fontFamily:"'DM Sans',sans-serif",outline:'none',transition:'border-color .15s',...props.style}} onFocus={e=>{e.target.style.borderColor=T.gold;props.onFocus&&props.onFocus(e)}} onBlur={e=>{e.target.style.borderColor=T.border2;props.onBlur&&props.onBlur(e)}}/>
    {hint&&<div style={{fontSize:11,color:T.textMuted}}>{hint}</div>}
  </div>
}

function Sel({label, children, T, ...props}) {
  return <div style={{display:'flex',flexDirection:'column',gap:6}}>
    {label&&<label style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px'}}>{label}</label>}
    <select {...props} style={{background:T.inputBg,border:`1px solid ${T.border2}`,borderRadius:10,padding:'10px 14px',fontSize:13,color:T.text,fontFamily:"'DM Sans',sans-serif",outline:'none'}}>{children}</select>
  </div>
}

function Btn({children, onClick, v='primary', style, disabled, T, sound=true}) {
  const C = T||D
  const vars = {
    primary:{background:`linear-gradient(135deg,${C.goldDark},${C.gold})`,color:'#fff',boxShadow:`0 4px 16px rgba(200,146,42,.35)`},
    ghost:{background:'transparent',border:`1px solid ${C.border2}`,color:C.textDim},
    danger:{background:'#3a0808',color:'#e06060',border:'1px solid #6a1818'},
    amber:{background:'#3a2000',color:'#d08020',border:'1px solid #6a3800'},
    purple:{background:'#1a1030',color:'#a080e0',border:'1px solid #3a2060'},
    red:{background:'#3a0808',color:'#e06060',border:'1px solid #6a1818'},
    green:{background:`linear-gradient(135deg,${C.greenDark},${C.green})`,color:'#fff',boxShadow:'0 4px 16px rgba(74,122,30,.3)'},
  }
  return <button className="btn-hover" style={{border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:disabled?'not-allowed':'pointer',padding:'10px 20px',fontFamily:"'DM Sans',sans-serif",opacity:disabled?.5:1,...vars[v],...style}} onClick={()=>{if(sound&&!disabled) sounds.click();onClick&&onClick()}} disabled={disabled}>{children}</button>
}

function Tbl({headers, rows, T}) {
  return <div style={{overflowX:'auto',borderRadius:12,border:`1px solid ${T.border}`}}>
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
      <thead style={{background:T.inputBg}}>
        <tr>{headers.map((h,i)=><th key={i} style={{textAlign:'left',padding:'10px 14px',fontSize:10,fontWeight:600,color:T.textMuted,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'.8px'}}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row,i)=><tr key={i} style={{borderBottom:`1px solid ${T.border}`,transition:'background .15s'}} onMouseEnter={e=>e.currentTarget.style.background=T.inputBg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          {row.map((cell,j)=><td key={j} style={{padding:'11px 14px',color:T.text,verticalAlign:'middle'}}>{cell}</td>)}
        </tr>)}
        {rows.length===0&&<tr><td colSpan={headers.length} style={{padding:32,textAlign:'center',color:T.textMuted,fontSize:13}}>Nenhum registro encontrado</td></tr>}
      </tbody>
    </table>
  </div>
}

function Alrt({type, children}) {
  const s = {warn:['#2a1800','#c8922a','#6a4010'],success:['#0a2008','#6a9a30','#2a5010'],info:['#050f28','#4a80d0','#103060'],danger:['#280606','#e06060','#601818']}[type]||['#1a1008','#9a8060','#4a3020']
  return <div style={{background:s[0],color:s[1],borderLeft:`3px solid ${s[2]}`,padding:'12px 16px',borderRadius:10,fontSize:13,marginBottom:14,lineHeight:1.6}}>{children}</div>
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
  const color = days<=1?'#e06060':days<=3?'#d08020':T.gold

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
    const iv = setInterval(()=>fetchMsgs(lastIdRef.current), 3000)
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
  {id:'minha_fazenda',icon:'🌾',label:'Minha Fazenda',pub:false},
  {id:'celeiro',icon:'🏚',label:'Celeiro',pub:false},
  {id:'transportadora',icon:'🚛',label:'Transportadora',pub:false},
  {id:'concessionaria',icon:'🏢',label:'Concessionária',pub:false},
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
      return <button key={n.id} onClick={()=>{sounds.click();setPage(n.id)}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:'none',cursor:'pointer',background:active?`rgba(200,146,42,.15)`:'transparent',color:active?T.gold:T.textMuted,transition:'all .15s',whiteSpace:'nowrap',fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:active?600:400,textAlign:'left'}} onMouseEnter={e=>{if(!active){e.currentTarget.style.background=T.inputBg;e.currentTarget.style.color=T.text}}} onMouseLeave={e=>{if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color=T.textMuted}}}>
        <span style={{fontSize:18,flexShrink:0}}>{n.icon}</span>
        {!collapsed&&<span>{n.label}</span>}
        {active&&!collapsed&&<div style={{marginLeft:'auto',width:4,height:4,borderRadius:'50%',background:T.gold}}/>}
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
        return <button key={n.id} onClick={()=>{sounds.click();setPage(n.id);onClose()}} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:10,border:'none',cursor:'pointer',background:active?`rgba(200,146,42,.15)`:'transparent',color:active?T.gold:T.textMuted,transition:'all .15s',fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:active?600:400,textAlign:'left'}}>
          <span style={{fontSize:20}}>{n.icon}</span>
          <span>{n.label}</span>
          {active&&<div style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:T.gold}}/>}
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
  const [compraComp, setCompraComp] = useState('')
  const [compraStep, setCompraStep] = useState(1)
  const [confirmReset, setConfirmReset] = useState(false)
  const [dividirLote, setDividirLote] = useState(null)
  const [dividirQtd, setDividirQtd] = useState('')
  const [viewProfile, setViewProfile] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [nLote, setNLote] = useState({jogador_id:'',jogador_nome:'',fazenda:'',fazenda_id:'',quantidade:1,valor_compra:1100,data_compra:'',comprovante:''})
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

  const reload = useCallback(()=>{
    if(!token) return
    api('/api/lotes').then(setLotes)
    api('/api/anuncios').then(setAnuncios)
    api('/api/transacoes').then(setTrans)
    api('/api/solicitacoes').then(setSolic)
    api('/api/racao').then(setRacao)
    api('/api/notificacoes').then(setNotifs)
    api('/api/fazendas?minha=1').then(setMinhasFazendas)
    api('/api/perfil').then(p=>{if(!p?.error){setPerfil(p);setEditPerfil({fazenda:p.fazenda||'',foto_url:p.foto_url||'',bio:p.bio||'',nova_senha:''})}})
    if(user?.role==='admin'){api('/api/admin/usuarios').then(setUsers);api('/api/admin/log').then(setAdminLog)}
  },[token,api,user])

  useEffect(()=>{reload()},[reload])

  useEffect(()=>{
    if(!token) return
    const iv = setInterval(()=>api('/api/notificacoes').then(setNotifs), 15000)
    return ()=>clearInterval(iv)
  },[token,api])

  const notify = (m, t='success') => {
    setNotification(m); setNotifType(t)
    if(soundOn) { t==='success'?sounds.success():sounds.error() }
    setTimeout(()=>setNotification(''), 4000)
  }

  function toggleDark(){const nd=!dark;setDark(nd);localStorage.setItem('gvrpnl_dark',nd)}
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
    const custoBezerros=qty*precos.bezerro
    const custoFrete=qty*precos.frete
    const custoRacao=qty*precos.racaoPorCabeca*precos.precoRacao
    const total=custoBezerros+custoFrete+custoRacao
    const receita=qty*precos.abate
    const margem=((receita-total)/receita*100).toFixed(1)
    return{custoBezerros,custoFrete,custoRacao,total,receita,margem,qty}
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
        {notification&&<div style={{background:notifType==='success'?'#0a1a04':'#1a0404',color:notifType==='success'?T.green:'#e06060',padding:'10px 20px',fontSize:13,textAlign:'center',borderBottom:`1px solid ${notifType==='success'?T.greenDark:'#6a1818'}`,fontWeight:500,animation:'fadeIn .3s ease'}}>{notification}</div>}

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
            <SectionTitle T={T} icon="📈" title="Mercado" sub="Preços em tempo real baseados no rebanho ativo do servidor"/>
            <div style={{...gs(160),marginBottom:20}}>
              {['bezerro','garrote','boi','abatido'].map(f=><AnimalCard key={f} fase={f} mercado={mercado} T={T}/>)}
            </div>
            <div style={gs(280)}>
              <Card T={T} glow>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:16}}>Indicadores agora</div>
                <div style={gs(110)}>
                  <Metric T={T} icon="🐄" label="Rebanho" value={`${mercado?.rebanho?.total||0}`} sub="cabeças ativas" color={mercado?.rebanho?.total>600?T.red:mercado?.rebanho?.total>400?T.amber:T.gold}/>
                  <Metric T={T} icon="💰" label="Margem est." value={`${mercado?.margem||'~30'}%`} sub="bezerro→abate" color={T.gold}/>
                  <Metric T={T} icon="🌾" label="Ração" value={`$${mercado?.precos?.precoRacao||2}/kg`} sub="112kg/cabeça"/>
                  <Metric T={T} icon="📦" label="Custo/cab" value={`$${fmt(mercado?.precos?.custoRacao)}`} sub="ração total"/>
                </div>
                <div style={{marginTop:16}}>
                  <div style={{fontSize:11,color:T.textMuted,marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px'}}>Rebanho (últimas entradas)</div>
                  <MiniChart data={rebanhoHist.length>1?rebanhoHist:[0,mercado?.rebanho?.total||0]} color={T.gold} T={T}/>
                </div>
              </Card>
              <Card T={T}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:16}}>Rebanho por fase</div>
                {['bezerro','garrote','boi'].map(f=>{
                  const qty = mercado?.rebanho?.[f]||0
                  const pct = Math.min((qty/200)*100,100)
                  return <div key={f} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:12}}>
                      <span style={{color:T.textDim,fontWeight:500}}>{FASES[f]}</span>
                      <span style={{color:T.text,fontWeight:600}}>{qty} cab.</span>
                    </div>
                    <div style={{background:T.inputBg,borderRadius:6,height:8,overflow:'hidden'}}>
                      <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${T.greenDark},${T.gold})`,borderRadius:6,transition:'width .6s cubic-bezier(.4,0,.2,1)'}}/>
                    </div>
                  </div>
                })}
                <div style={{marginTop:8,paddingTop:12,borderTop:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:11,color:T.textMuted}}>Limite de ração normal: 400 cab.</span>
                  <Badge type={mercado?.rebanho?.total>600?'danger':mercado?.rebanho?.total>400?'warn':'ok'}>{mercado?.rebanho?.total>600?'Ração cara':mercado?.rebanho?.total>400?'Elevada':'Normal'}</Badge>
                </div>
              </Card>
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
                    <div style={{background:T.inputBg,borderRadius:12,padding:18,marginBottom:16,border:`1px solid ${T.border}`}}>
                      <div style={{fontSize:11,color:T.textMuted,marginBottom:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px'}}>Breakdown</div>
                      {[[`${cot.qty}× Bezerro ($${fmt(mercado.precos.bezerro)}/cab)`,cot.custoBezerros],['Frete ($50/cab)',cot.custoFrete],[`Ração (${mercado.precos.racaoPorCabeca}kg × ${cot.qty} × $${mercado.precos.precoRacao}/kg)`,cot.custoRacao]].map(([l,v])=>(
                        <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:10,color:T.textDim,paddingBottom:10,borderBottom:`1px solid ${T.border}`}}>
                          <span>{l}</span><span style={{fontWeight:500}}>${fmt(v)}</span>
                        </div>
                      ))}
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:18,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>
                        <span style={{color:T.text}}>Total</span><span style={{color:T.gold}}>${fmt(cot.total)}</span>
                      </div>
                    </div>
                    <div style={gs(110)}>
                      <Metric T={T} icon="💵" label="Receita est." value={`$${fmt(cot.receita)}`} color={T.gold}/>
                      <Metric T={T} icon="📊" label="Margem est." value={`${cot.margem}%`} color={Number(cot.margem)>20?T.green:Number(cot.margem)>10?T.amber:T.red}/>
                    </div>
                    <Btn onClick={()=>setCompraStep(2)} T={T} style={{width:'100%',padding:13,fontSize:14,marginTop:16}}>Tenho interesse — ${fmt(cot.total)}</Btn>
                  </>}
                </>}
                {compraStep===2&&cot&&<>
                  <Alrt type="info">Pague <strong>${fmt(cot.total)}</strong> no servidor e cole o comprovante abaixo.</Alrt>
                  <div style={{background:T.inputBg,borderRadius:12,padding:14,marginBottom:16,border:`1px solid ${T.border}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:6}}><span style={{color:T.textMuted}}>Total</span><span style={{fontWeight:700,color:T.gold,fontFamily:"'Playfair Display',serif"}}>${fmt(cot.total)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:T.textMuted}}>Margem est.</span><span style={{fontWeight:600,color:T.green}}>{cot.margem}%</span></div>
                  </div>
                  <div style={{marginBottom:16}}><Inp T={T} label="Link do comprovante (Discord)" value={compraComp} onChange={e=>setCompraComp(e.target.value)} placeholder="https://discord.com/channels/..."/></div>
                  <div style={{display:'flex',gap:10}}>
                    <Btn v="ghost" onClick={()=>setCompraStep(1)} T={T} style={{flex:1}}>Voltar</Btn>
                    <Btn onClick={async()=>{if(!compraComp) return notify('Cole o comprovante!','danger');const r=await api('/api/solicitacoes',{method:'POST',body:JSON.stringify({quantidade:compraQt,valor_total:cot.total,custo_racao:cot.custoRacao,comprovante:compraComp})});if(!r.error){setCompraStep(3);sounds.coin();api('/api/solicitacoes').then(setSolic)}}} T={T} style={{flex:2,padding:12}}>Enviar solicitação</Btn>
                  </div>
                </>}
              </Card>
              <Card T={T} hover={false}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Minhas solicitações</div>
                <Tbl T={T} headers={['Data','Qtd','Total','Status']} rows={solic.map(s=>[
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
              <Metric T={T} icon="🐄" label="Cabeças ativas" value={meusLotes.filter(l=>['ativo','aguardando_pagamento'].includes(l.status)).reduce((s,l)=>s+l.quantidade,0)}/>
              <Metric T={T} icon="🌾" label="Estoque ração" value={`${fmt(racao?.kg_disponivel||0)} kg`} sub={diasRacaoLeft!==null?`${diasRacaoLeft} dias restantes`:'sem gado ativo'} color={diasRacaoLeft!==null&&diasRacaoLeft<=3?T.red:T.gold}/>
              <Metric T={T} icon="📉" label="Consumo/dia" value={`${consumoDiario} kg`} sub="todos os lotes"/>
              <Metric T={T} icon="💰" label="Valor do rebanho" value={`$${fmt(meusLotes.filter(l=>['ativo','em_transito'].includes(l.status)).reduce((s,l)=>{const precoFase={bezerro:mercado?.precos?.bezerro||1100,garrote:mercado?.precos?.garrote||0,boi:mercado?.precos?.boi||0,abatido:mercado?.precos?.abate||0};return s+(precoFase[l.fase]||0)*l.quantidade},0))}`} color={T.gold}/>
            </div>
            {meusLotes.length===0?<Card T={T} hover={false} style={{textAlign:'center',padding:48}}>
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
                        {l.fase==='abatido'&&l.status==='ativo'?<Btn T={T} onClick={async()=>{const r=await api(`/api/lotes/${l.id}`,{method:'PATCH',body:JSON.stringify({action:'solicitar_abate',preco_kg:mercado?.precos?.precoKg||3})});if(!r.error){sounds.coin();notify('Abate solicitado!');api('/api/lotes').then(setLotes)}}}>🥩 Solicitar abate</Btn>
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
                  api('/api/lotes').then(setLotes)
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
                  <Btn T={T} v="amber" style={{padding:'6px 12px',fontSize:12}} onClick={()=>{sounds.click();setChatAnuncio(a)}}>💬 Negociar</Btn>
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
                <Btn T={T} onClick={async()=>{const l=lotes.find(x=>x.id===nAnuncio.lote_id);if(!l) return notify('Selecione um lote','danger');const r=await api('/api/anuncios',{method:'POST',body:JSON.stringify({...nAnuncio,lote_codigo:l.codigo,fase:l.fase,quantidade:l.quantidade,peso_kg:l.peso_kg})});if(!r.error){notify('✓ Anúncio publicado!');api('/api/anuncios').then(setAnuncios)}}}>Publicar anúncio</Btn>
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
                <Btn T={T} onClick={async()=>{const r=await api('/api/anuncios',{method:'PATCH',body:JSON.stringify(p2p)});if(!r.error){sounds.coin();notify('✓ Venda registrada!');reload()}}}>Registrar venda</Btn>
              </Card>}
            </div>}
          </>}

          {/* RANKING */}
          {page==='ranking'&&<>
            <SectionTitle T={T} icon="🏆" title="Ranking de Criadores" sub="Top produtores do servidor — ordenado por volume total abatido"/>
            <Card T={T} hover={false}>
              {ranking.length===0?<div style={{textAlign:'center',padding:48,color:T.textMuted}}>Nenhum abate registrado ainda.</div>:
              <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {ranking.map((r,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:16,padding:'16px 4px',borderBottom:i<ranking.length-1?`1px solid ${T.border}`:'none',transition:'background .15s'}} onMouseEnter={e=>e.currentTarget.style.background=T.inputBg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{width:40,textAlign:'center',fontSize:i<3?24:16,flexShrink:0}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}º`}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Playfair Display',serif"}}>{r.nome}</div>
                    <div style={{fontSize:12,color:T.textMuted}}>{r.total_abates} abates · {fmt(r.total_cabecas)} cabeças</div>
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:T.gold,fontFamily:"'Playfair Display',serif"}}>${fmt(r.total_ganho)}</div>
                </div>)}
              </div>}
            </Card>
          </>}

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
                  <Inp T={T} label="URL da foto de perfil" value={editPerfil.foto_url} onChange={e=>setEditPerfil(f=>({...f,foto_url:e.target.value}))} placeholder="https://i.imgur.com/..." hint="Cole o link direto da imagem"/>
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
                  <Btn T={T} onClick={async()=>{await api('/api/solicitacoes',{method:'PATCH',body:JSON.stringify({id:s.id,status:'aprovado'})});sounds.coin();notify('✓ Aprovado!');api('/api/solicitacoes').then(setSolic)}} style={{padding:'5px 12px',fontSize:11}}>✓ Aprovar</Btn>,
                  <Btn T={T} v="danger" onClick={async()=>{await api('/api/solicitacoes',{method:'PATCH',body:JSON.stringify({id:s.id,status:'recusado'})});notify('Recusado.','danger');api('/api/solicitacoes').then(setSolic)}} style={{padding:'5px 12px',fontSize:11}}>✗</Btn>
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
                  <Badge type={l.status==='ativo'?'gray':l.status==='aguardando_pagamento'?'amber':'ok'}>{l.status==='ativo'?'Ativo':l.status==='aguardando_pagamento'?'Aguard.':l.status}</Badge>,
                  l.fase!=='abatido'&&l.status==='ativo'?<Btn T={T} v="ghost" onClick={async()=>{const r=await api(`/api/lotes/${l.id}`,{method:'PATCH',body:JSON.stringify({action:'avancar_fase'})});if(!r.error){sounds.phase();notify('Fase avançada!');reload()}}} style={{padding:'5px 10px',fontSize:11}}>Avançar</Btn>:'—',
                  <Btn T={T} v="danger" onClick={async()=>{await api('/api/admin/reset',{method:'POST',body:JSON.stringify({tipo:'lote',lote_id:l.id})});notify('Lote removido.');api('/api/lotes').then(setLotes)}} style={{padding:'4px 8px',fontSize:11}}>✕</Btn>
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
                    <Btn T={T} onClick={async()=>{await api('/api/admin/usuarios',{method:'PATCH',body:JSON.stringify({id:u.id,status:'aprovado'})});sounds.success();notify('✓ Aprovado!');api('/api/admin/usuarios').then(setUsers)}} style={{padding:'5px 10px',fontSize:11}}>✓</Btn>,
                    <Btn T={T} v="danger" onClick={async()=>{await api('/api/admin/usuarios',{method:'PATCH',body:JSON.stringify({id:u.id,status:'recusado'})});api('/api/admin/usuarios').then(setUsers)}} style={{padding:'5px 10px',fontSize:11}}>✗</Btn>
                  ])}/>}
              </Card>
            </div>

            <Card T={T} hover={false}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Gerenciar jogadores</div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:14,alignItems:'flex-end'}}>
                <div style={{flex:1,minWidth:130}}><Inp T={T} label="Usuário" value={nUser.username} onChange={e=>setNUser(f=>({...f,username:e.target.value}))} placeholder="nome_jogador"/></div>
                <div style={{flex:1,minWidth:110}}><Inp T={T} label="Senha" type="password" value={nUser.password} onChange={e=>setNUser(f=>({...f,password:e.target.value}))} placeholder="senha123"/></div>
                <div style={{flex:1,minWidth:90}}><Inp T={T} label="Fazenda" value={nUser.fazenda} onChange={e=>setNUser(f=>({...f,fazenda:e.target.value}))} placeholder="0325"/></div>
                <Btn T={T} onClick={async()=>{const r=await api('/api/admin/usuarios',{method:'POST',body:JSON.stringify(nUser)});if(!r.error){sounds.success();notify('✓ Criado!');api('/api/admin/usuarios').then(setUsers)}}}>Criar</Btn>
              </div>
              <Tbl T={T} headers={['Usuário','Fazenda','Status','Editar','']}
                rows={users.filter(u=>u.status!=='pendente').map(u=>[
                  <span style={{fontWeight:600}}>{u.username}</span>,u.fazenda||'—',
                  <Badge type={u.status==='aprovado'||u.role==='admin'?'ok':'danger'}>{u.role==='admin'?'admin':u.status||'aprovado'}</Badge>,
                  <div style={{display:'flex',gap:4}}>{u.role!=='admin'?<Btn T={T} v="ghost" onClick={()=>{setEditTarget(u);setEditPerfil({fazenda:u.fazenda||'',foto_url:u.foto_url||'',bio:u.bio||'',nova_senha:''})}} style={{padding:'4px 8px',fontSize:11}}>✏ Editar</Btn>:''}<Btn T={T} v="ghost" onClick={()=>{setViewProfile(u.username);setProfileData({...u,stats:{total_abates:0,total_cabecas:0,total_ganho:0}})}} style={{padding:'4px 8px',fontSize:11}}>👤</Btn></div>,
                  u.role!=='admin'?<Btn T={T} v="danger" onClick={async()=>{await api('/api/admin/usuarios',{method:'DELETE',body:JSON.stringify({id:u.id})});api('/api/admin/usuarios').then(setUsers)}} style={{padding:'4px 8px',fontSize:11}}>✕</Btn>:'—'
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
          {page==='minha_fazenda'&&<MinhaFazendaPage T={T} user={user} api={api} notify={notify} lotes={lotes} mercado={mercado}/>}
          {page==='celeiro'&&<CeleiroPage T={T} user={user} api={api} notify={notify} mercado={mercado} sounds={sounds}/>}
          {page==='transportadora'&&<TransportadoraPage T={T} user={user} api={api} notify={notify} sounds={sounds}/>}
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

        </div>
      </div>
    </div>
  </>
}
