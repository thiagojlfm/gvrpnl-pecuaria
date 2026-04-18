import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTheme } from '../lib/context'
import { sounds } from '../lib/sounds'
import { FASES, SEMANAS, PESOS, fmt } from '../lib/theme'
import { Badge, Btn, faseBadge } from './ui'

// ─── Helpers de navegação ─────────────────────────────────────────────────────
// Cada nav item pode ter uma rota própria. Itens sem `href` seguem no fluxo
// legado do index.js via setPage (SPA interna). Para saltar entre rotas
// mantendo a intenção do clique, usamos sessionStorage.
const NAV_HREFS = { lavoura: '/lavoura' }

function navigateFromAnywhere(router, id, setPage) {
  const href = NAV_HREFS[id]
  if (href) {
    if (router.pathname !== href) router.push(href)
    return
  }
  // Alvo mora em /. Se já estamos em /, só setPage. Senão, guarda o destino e rota.
  if (router.pathname === '/') return setPage?.(id)
  if (typeof window !== 'undefined') sessionStorage.setItem('gvrpnl_targetPage', id)
  router.push('/')
}

function isNavActive(router, page, n) {
  const href = NAV_HREFS[n.id]
  if (href) return router.pathname === href
  return router.pathname === '/' && page === n.id
}

// ─── NAV_ITEMS ────────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
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
  {id:'lavoura',icon:'🌱',label:'Lavoura',pub:true,badge:'NOVO'},
  {id:'noticias',icon:'📰',label:'Notícias',pub:true,hot:true},
  {id:'ranking',icon:'🏆',label:'Ranking',pub:true},
  {id:'ajuda',icon:'❓',label:'Ajuda',pub:true},
  {id:'perfil',icon:'👤',label:'Perfil',pub:false},
  {id:'admin',icon:'⚙️',label:'Admin',pub:false,admin:true},
  {id:'hist',icon:'📋',label:'Histórico',pub:false,admin:true},
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar({page, setPage, user, T: TProp, collapsed}) {
  const ctx = useTheme()
  const router = useRouter()
  const T = TProp || (ctx ? ctx.T : null)
  const items = NAV_ITEMS.filter(n=>n.pub||user).filter(n=>!n.admin||user?.role==='admin')
  return <div style={{width:collapsed?68:212,flexShrink:0,background:T.navBg,borderRight:`1px solid ${T.border}`,display:'flex',flexDirection:'column',padding:'12px 8px',gap:2,transition:'width .25s ease',overflowX:'hidden'}}>
    {items.map(n=>{
      const active = isNavActive(router, page, n)
      const href = NAV_HREFS[n.id]
      const idleColor = active ? T.gold : n.hot ? '#f87171' : T.textMuted
      const activeBg = n.hot ? 'rgba(248,113,113,.18)' : 'rgba(194,140,70,.16)'
      const btnStyle = {display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:10,border:'none',cursor:'pointer',background:active?activeBg:n.hot&&!active?'rgba(248,113,113,.05)':'transparent',color:idleColor,whiteSpace:'nowrap',fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:active?600:400,textAlign:'left',width:'100%',outline:'none',textDecoration:'none'}
      const onEnter = e=>{if(!active){e.currentTarget.style.background=T.isDark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';e.currentTarget.style.color=T.text}}
      const onLeave = e=>{if(!active){e.currentTarget.style.background=n.hot?'rgba(248,113,113,.05)':'transparent';e.currentTarget.style.color=idleColor}}
      const inner = <>
        <span style={{fontSize:17,flexShrink:0,lineHeight:1}}>{n.icon}</span>
        {!collapsed&&<span style={{lineHeight:1}}>{n.label}</span>}
        {!collapsed&&n.badge&&!active&&<span style={{marginLeft:'auto',fontSize:8,fontWeight:700,letterSpacing:.8,background:n.hot?'rgba(248,113,113,.18)':'rgba(194,140,70,.18)',color:n.hot?'#f87171':T.gold,padding:'2px 6px',borderRadius:5,border:`1px solid ${n.hot?'rgba(248,113,113,.35)':'rgba(194,140,70,.35)'}`}}>{n.badge}</span>}
        {active&&!collapsed&&!n.badge&&<div style={{marginLeft:'auto',width:5,height:5,borderRadius:'50%',background:n.hot?'#f87171':T.gold,boxShadow:`0 0 6px ${n.hot?'#f87171':T.gold}`}}/>}
        {n.hot&&!active&&!collapsed&&<div style={{marginLeft:n.badge?4:'auto',width:6,height:6,borderRadius:'50%',background:'#f87171',animation:'blinkDot 1s step-end infinite',flexShrink:0}}/>}
      </>
      if (href) {
        return <Link key={n.id} href={href} className="nav-btn" onClick={()=>sounds.click()} onMouseEnter={onEnter} onMouseLeave={onLeave} style={btnStyle}>{inner}</Link>
      }
      return <button key={n.id} className="nav-btn" onClick={()=>{sounds.click();navigateFromAnywhere(router, n.id, setPage)}} style={btnStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{inner}</button>
    })}
  </div>
}

// ─── Drawer (Mobile) ──────────────────────────────────────────────────────────
export function Drawer({open, onClose, page, setPage, user, T: TProp}) {
  const ctx = useTheme()
  const router = useRouter()
  const T = TProp || (ctx ? ctx.T : null)
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
        const active = isNavActive(router, page, n)
        const href = NAV_HREFS[n.id]
        const btnStyle = {display:'flex',alignItems:'center',gap:12,padding:'13px 16px',borderRadius:10,border:'none',cursor:'pointer',background:active?`rgba(194,140,70,.16)`:n.hot&&!active?'rgba(248,113,113,.05)':'transparent',color:active?T.gold:n.hot?'#f87171':T.textMuted,fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:active?600:400,textAlign:'left',width:'100%',outline:'none',textDecoration:'none'}
        const onEnter = e=>{if(!active){e.currentTarget.style.background=T.isDark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';e.currentTarget.style.color=T.text}}
        const onLeave = e=>{if(!active){e.currentTarget.style.background=n.hot?'rgba(248,113,113,.05)':'transparent';e.currentTarget.style.color=active?T.gold:n.hot?'#f87171':T.textMuted}}
        const inner = <>
          <span style={{fontSize:20,lineHeight:1}}>{n.icon}</span>
          <span style={{lineHeight:1}}>{n.label}</span>
          {n.badge&&!active&&<span style={{marginLeft:'auto',fontSize:8,fontWeight:700,letterSpacing:.8,background:n.hot?'rgba(248,113,113,.18)':'rgba(194,140,70,.18)',color:n.hot?'#f87171':T.gold,padding:'2px 6px',borderRadius:5,border:`1px solid ${n.hot?'rgba(248,113,113,.35)':'rgba(194,140,70,.35)'}`}}>{n.badge}</span>}
          {active&&!n.badge&&<div style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:T.gold,boxShadow:`0 0 6px ${T.gold}`}}/>}
          {n.hot&&!active&&<div style={{marginLeft:n.badge?4:'auto',width:7,height:7,borderRadius:'50%',background:'#f87171',animation:'blinkDot 1s step-end infinite'}}/>}
        </>
        if (href) {
          return <Link key={n.id} href={href} className="nav-btn" onClick={()=>{sounds.click();onClose()}} onMouseEnter={onEnter} onMouseLeave={onLeave} style={btnStyle}>{inner}</Link>
        }
        return <button key={n.id} className="nav-btn" onClick={()=>{sounds.click();navigateFromAnywhere(router, n.id, setPage);onClose()}} style={btnStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{inner}</button>
      })}
    </div>
  </>
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────
export function ChatPanel({anuncio, user, token, onClose, T: TProp}) {
  const ctx = useTheme()
  const T = TProp || (ctx ? ctx.T : null)

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

// ─── NotifBell ────────────────────────────────────────────────────────────────
export function NotifBell({notifs, onRead, T: TProp}) {
  const ctx = useTheme()
  const T = TProp || (ctx ? ctx.T : null)

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

// ─── Onboarding ───────────────────────────────────────────────────────────────
export function Onboarding({onClose, T: TProp}) {
  const ctx = useTheme()
  const T = TProp || (ctx ? ctx.T : null)

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

// ─── AnimalCard ───────────────────────────────────────────────────────────────
export function AnimalCard({fase, mercado, T: TProp}) {
  const ctx = useTheme()
  const T = TProp || (ctx ? ctx.T : null)

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
