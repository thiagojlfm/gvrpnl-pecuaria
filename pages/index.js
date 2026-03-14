import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'

const FASES = { bezerro:'Bezerro', garrote:'Garrote', boi:'Boi', abatido:'Boi abatido' }
const PESOS = { bezerro:180, garrote:400, boi:540, abatido:648 }
const SEMANAS = { bezerro:1, garrote:2, boi:3, abatido:4 }
const fmt = n => Number(n||0).toLocaleString('pt-BR')

// ─── Theme ───────────────────────────────────────────────────────────────────
function getTheme(dark) {
  if (dark) return {
    bg:'#0a0c07', card:'#111608', border:'#1e2a12', border2:'#2a3a1a',
    green:'#7ab648', greenDark:'#4a7a1e', gold:'#c8a832', goldDark:'#8a6e1a',
    text:'#d4d8c8', textDim:'#7a8a6a', textMuted:'#4a5a3a',
    inputBg:'#0d1009', navBg:'#0c1408', isDark:true,
  }
  return {
    bg:'#f4f6f0', card:'#ffffff', border:'#d0dcb8', border2:'#b0c898',
    green:'#4a7a1e', greenDark:'#3a6010', gold:'#8a6e1a', goldDark:'#6a5010',
    text:'#1a2210', textDim:'#4a5a3a', textMuted:'#7a8a6a',
    inputBg:'#f8faf4', navBg:'#e8f0d8', isDark:false,
  }
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Badge({ type, children }) {
  const s = {
    ok:['#1a3a0a','#7ab648','#2a5a12'], warn:['#3a2a00','#c8a832','#6a5010'],
    info:['#0a1a3a','#4a90d0','#1a3a6a'], gray:['#2a2a2a','#aaaaaa','#444444'],
    purple:['#1a1230','#a080e0','#3a2a60'], danger:['#3a0a0a','#e06060','#6a1a1a'],
    amber:['#3a2000','#e09030','#6a3a00'], red:['#3a0a0a','#e06060','#6a1a1a'],
  }[type]||['#2a2a2a','#aaa','#444']
  return <span style={{background:s[0],color:s[1],border:`1px solid ${s[2]}`,fontSize:11,padding:'2px 8px',borderRadius:10,fontWeight:600,whiteSpace:'nowrap',display:'inline-block'}}>{children}</span>
}

function Card({children,style,glow,T}){
  return <div style={{background:T.card,border:`1px solid ${glow?T.border2:T.border}`,borderRadius:14,padding:18,marginBottom:16,boxShadow:glow?'0 0 20px rgba(74,122,30,.15)':'0 2px 8px rgba(0,0,0,.08)',...style}}>{children}</div>
}

function Metric({label,value,sub,color,T}){
  return <div style={{background:T.inputBg,borderRadius:10,padding:'14px 16px',border:`1px solid ${T.border}`}}>
    <div style={{fontSize:11,color:T.textMuted,marginBottom:6,textTransform:'uppercase',letterSpacing:'.8px',fontWeight:600}}>{label}</div>
    <div style={{fontSize:22,fontWeight:700,color:color||T.text}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:T.textMuted,marginTop:3}}>{sub}</div>}
  </div>
}

function Inp({label,T,...props}){
  return <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px'}}>{label}</label>}
    <input {...props} style={{background:T.inputBg,border:`1px solid ${T.border2}`,borderRadius:8,padding:'9px 12px',fontSize:13,color:T.text,fontFamily:'inherit',outline:'none',...props.style}}/>
  </div>
}

function Sel({label,children,T,...props}){
  return <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px'}}>{label}</label>}
    <select {...props} style={{background:T.inputBg,border:`1px solid ${T.border2}`,borderRadius:8,padding:'9px 12px',fontSize:13,color:T.text,fontFamily:'inherit',outline:'none'}}>{children}</select>
  </div>
}

function Btn({children,onClick,v='primary',style,disabled,T}){
  const C = T||{green:'#7ab648',greenDark:'#4a7a1e',border2:'#2a3a1a',textDim:'#7a8a6a'}
  const base={border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:disabled?'not-allowed':'pointer',padding:'9px 18px',fontFamily:'inherit',opacity:disabled?0.5:1,transition:'all .15s'}
  const vars={
    primary:{background:`linear-gradient(135deg,${C.greenDark},${C.green})`,color:'#fff',boxShadow:'0 2px 8px rgba(74,122,30,.3)'},
    ghost:{background:'transparent',border:`1px solid ${C.border2}`,color:C.textDim},
    danger:{background:'#4a1010',color:'#e06060',border:'1px solid #6a1a1a'},
    amber:{background:'#4a2800',color:'#e09030',border:'1px solid #6a3a00'},
    purple:{background:'#281840',color:'#a080e0',border:'1px solid #3a2a60'},
    red:{background:'#3a0808',color:'#e06060',border:'1px solid #6a1a1a'},
  }
  return <button style={{...base,...vars[v],...style}} onClick={onClick} disabled={disabled}>{children}</button>
}

function Tbl({headers,rows,T}){
  return <div style={{overflowX:'auto'}}>
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
      <thead><tr>{headers.map((h,i)=><th key={i} style={{textAlign:'left',padding:'8px 12px',fontSize:11,fontWeight:600,color:T.textMuted,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((row,i)=><tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>{row.map((cell,j)=><td key={j} style={{padding:'10px 12px',color:T.text,verticalAlign:'middle'}}>{cell}</td>)}</tr>)}
        {rows.length===0&&<tr><td colSpan={headers.length} style={{padding:24,textAlign:'center',color:T.textMuted}}>Nenhum registro</td></tr>}
      </tbody>
    </table>
  </div>
}

function Alert({type,children}){
  const s={warn:['#2a1e00','#c8a832','#6a5010'],success:['#0a2010','#7ab648','#2a5a12'],info:['#051020','#4a90d0','#1a3a6a'],danger:['#2a0808','#e06060','#6a1a1a']}[type]||['#1a1e14','#aaa','#444']
  return <div style={{background:s[0],color:s[1],borderLeft:`3px solid ${s[2]}`,padding:'10px 16px',borderRadius:8,fontSize:13,marginBottom:14}}>{children}</div>
}

function Title({t,s,T}){
  return <div style={{marginBottom:20}}>
    <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:3}}>{t}</div>
    {s&&<div style={{fontSize:13,color:T.textMuted}}>{s}</div>}
  </div>
}

function faseBadge(f){
  const m={bezerro:'info',garrote:'warn',boi:'gray',abatido:'ok'}
  return <Badge type={m[f]||'gray'}>{FASES[f]||f} · sem. {SEMANAS[f]}</Badge>
}

function diasRest(d){
  if(!d) return '—'
  const diff=Math.ceil((new Date(d)-new Date())/86400000)
  if(diff<=0) return <Badge type="ok">Pronto!</Badge>
  if(diff<=2) return <span style={{color:'#e09030',fontWeight:600}}>{diff}d ⚠</span>
  return `${diff} dias`
}

// ─── Onboarding Modal ─────────────────────────────────────────────────────────
function Onboarding({onClose,T}){
  const [step,setStep]=useState(0)
  const steps=[
    {emoji:'🐄',title:'Bem-vindo ao Sistema de Pecuária!',text:'Aqui você gerencia todo o ciclo do seu gado — da compra do bezerro até o abate no frigorífico. Vamos te explicar como funciona em 3 passos rápidos.'},
    {emoji:'🌱',title:'O ciclo do gado',text:'Seu gado passa por 4 fases em 4 semanas: Bezerro (sem. 1) → Garrote (sem. 2) → Boi (sem. 3) → Abate (sem. 4). Cada fase o animal cresce e vale mais. Só o abate final gera dinheiro real no servidor.'},
    {emoji:'🌾',title:'Ração é essencial',text:'Cada animal precisa de ração para crescer. O preço da ração sobe quando tem muito gado no servidor — isso é o equilíbrio do sistema. Fique de olho no seu estoque!'},
    {emoji:'🤝',title:'Venda entre jogadores',text:'A partir do Garrote, você pode vender seus animais para outros jogadores pelo chat ao vivo em vez de esperar o abate. Mais rápido, mas com margem menor. Boa sorte na criação!'},
  ]
  const s=steps[step]
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
    <div style={{background:T.card,border:`1px solid ${T.border2}`,borderRadius:20,padding:40,maxWidth:440,width:'100%',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.4)'}}>
      <div style={{fontSize:56,marginBottom:16}}>{s.emoji}</div>
      <div style={{fontSize:18,fontWeight:700,color:T.text,marginBottom:12}}>{s.title}</div>
      <div style={{fontSize:14,color:T.textDim,lineHeight:1.7,marginBottom:28}}>{s.text}</div>
      <div style={{display:'flex',justifyContent:'center',gap:6,marginBottom:24}}>
        {steps.map((_,i)=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:i===step?T.green:T.border2,transition:'background .2s'}}/>)}
      </div>
      <div style={{display:'flex',gap:10}}>
        {step>0&&<Btn v="ghost" onClick={()=>setStep(step-1)} T={T} style={{flex:1}}>Anterior</Btn>}
        {step<steps.length-1
          ?<Btn onClick={()=>setStep(step+1)} T={T} style={{flex:1}}>Próximo</Btn>
          :<Btn onClick={onClose} T={T} style={{flex:1}}>Começar! 🚀</Btn>
        }
      </div>
    </div>
  </div>
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({anuncio,user,token,onClose,T}){
  const [msgs,setMsgs]=useState([])
  const [txt,setTxt]=useState('')
  const lastIdRef=useRef(0)
  const bottomRef=useRef(null)

  const fetchMsgs=useCallback(async(since=0)=>{
    if(!anuncio?.id) return
    try{
      const h={'Content-Type':'application/json'}
      if(token) h['Authorization']=`Bearer ${token}`
      const r=await fetch(`/api/chat?anuncio_id=${anuncio.id}&since=${since}`,{headers:h})
      if(!r.ok) return
      const data=await r.json()
      if(Array.isArray(data)&&data.length){
        setMsgs(prev=>{
          const ids=new Set(prev.map(m=>m.id))
          const novos=data.filter(m=>!ids.has(m.id))
          if(!novos.length) return prev
          const merged=[...prev,...novos]
          lastIdRef.current=merged[merged.length-1]?.id||0
          return merged
        })
      }
    }catch(e){}
  },[anuncio?.id,token])

  useEffect(()=>{
    lastIdRef.current=0; setMsgs([]); fetchMsgs(0)
    const iv=setInterval(()=>fetchMsgs(lastIdRef.current),3000)
    return ()=>clearInterval(iv)
  },[fetchMsgs])

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  async function send(){
    if(!txt.trim()||!user) return
    const h={'Content-Type':'application/json',Authorization:`Bearer ${token}`}
    await fetch('/api/chat',{method:'POST',headers:h,body:JSON.stringify({anuncio_id:anuncio.id,mensagem:txt.trim()})})
    setTxt(''); fetchMsgs(lastIdRef.current)
  }

  return <div style={{position:'fixed',top:0,right:0,width:340,height:'100vh',background:T.card,borderLeft:`1px solid ${T.border2}`,zIndex:200,display:'flex',flexDirection:'column',boxShadow:'-4px 0 24px rgba(0,0,0,.2)'}}>
    <div style={{padding:'14px 16px',borderBottom:`1px solid ${T.border}`,background:T.navBg}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
        <div style={{fontSize:13,fontWeight:700,color:T.text}}>💬 Negociação</div>
        <button onClick={onClose} style={{background:'none',border:'none',color:T.textMuted,fontSize:18,cursor:'pointer'}}>×</button>
      </div>
      <div style={{fontSize:11,color:T.textMuted}}>{faseBadge(anuncio.fase)} &nbsp;{anuncio.quantidade} cab. &nbsp;<span style={{color:T.gold,fontWeight:700}}>${fmt(anuncio.preco_pedido)}</span></div>
      <div style={{fontSize:11,color:T.textMuted,marginTop:3}}>Vendedor: <span style={{color:T.text}}>{anuncio.vendedor_nome}</span></div>
    </div>
    <div style={{flex:1,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
      {msgs.length===0&&<div style={{fontSize:12,color:T.textMuted,textAlign:'center',marginTop:40}}>Seja o primeiro a fazer uma oferta!</div>}
      {msgs.map(m=>{
        const isMine=m.jogador_nome===user?.username
        return <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:isMine?'flex-end':'flex-start'}}>
          <div style={{fontSize:10,color:T.textMuted,marginBottom:2,display:'flex',gap:6}}>
            <span style={{color:isMine?T.green:T.textDim,fontWeight:600}}>{m.jogador_nome}</span>
            <span>{new Date(m.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
            {user?.role==='admin'&&<button onClick={async()=>{const h={'Content-Type':'application/json',Authorization:`Bearer ${token}`};await fetch('/api/chat',{method:'DELETE',headers:h,body:JSON.stringify({id:m.id})});setMsgs(x=>x.filter(y=>y.id!==m.id))}} style={{background:'none',border:'none',color:T.textMuted,cursor:'pointer',fontSize:10,padding:0}}>✕</button>}
          </div>
          <div style={{background:isMine?'#1a3a0a':'transparent',border:`1px solid ${isMine?T.border2:T.border}`,borderRadius:isMine?'12px 12px 2px 12px':'12px 12px 12px 2px',padding:'8px 12px',fontSize:13,color:T.text,maxWidth:'85%',lineHeight:1.5}}>{m.mensagem}</div>
        </div>
      })}
      <div ref={bottomRef}/>
    </div>
    {user?<div style={{padding:'12px 14px',borderTop:`1px solid ${T.border}`,background:T.navBg,display:'flex',gap:8}}>
      <input value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Faça sua oferta..." style={{flex:1,background:T.inputBg,border:`1px solid ${T.border2}`,borderRadius:8,padding:'9px 12px',fontSize:13,color:T.text,fontFamily:'inherit',outline:'none'}}/>
      <Btn onClick={send} T={T} style={{padding:'9px 14px'}}>→</Btn>
    </div>:<div style={{padding:14,borderTop:`1px solid ${T.border}`,fontSize:12,color:T.textMuted,textAlign:'center'}}>Faça login para enviar ofertas</div>}
  </div>
}

// ─── Notification Bell ────────────────────────────────────────────────────────
function NotifBell({notifs,onRead,T}){
  const [open,setOpen]=useState(false)
  const naoLidas=notifs.filter(n=>!n.lida).length
  return <div style={{position:'relative'}}>
    <button onClick={()=>setOpen(!open)} style={{background:'none',border:`1px solid ${T.border2}`,borderRadius:8,padding:'6px 10px',cursor:'pointer',color:T.text,position:'relative',fontSize:16}}>
      🔔
      {naoLidas>0&&<span style={{position:'absolute',top:-4,right:-4,background:'#e06060',color:'#fff',borderRadius:'50%',width:16,height:16,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{naoLidas}</span>}
    </button>
    {open&&<div style={{position:'absolute',right:0,top:42,width:300,background:T.card,border:`1px solid ${T.border2}`,borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,.2)',zIndex:150}}>
      <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:13,fontWeight:700,color:T.text}}>Notificações</span>
        {naoLidas>0&&<button onClick={()=>{onRead('all');setOpen(false)}} style={{background:'none',border:'none',color:T.green,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Marcar todas como lidas</button>}
      </div>
      <div style={{maxHeight:320,overflowY:'auto'}}>
        {notifs.length===0&&<div style={{padding:24,textAlign:'center',color:T.textMuted,fontSize:13}}>Nenhuma notificação</div>}
        {notifs.map(n=><div key={n.id} onClick={()=>onRead(n.id)} style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,cursor:'pointer',background:n.lida?'transparent':T.inputBg,transition:'background .15s'}}>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:3}}>{n.titulo}</div>
          <div style={{fontSize:12,color:T.textDim,lineHeight:1.5}}>{n.mensagem}</div>
          <div style={{fontSize:10,color:T.textMuted,marginTop:4}}>{new Date(n.criado_em).toLocaleDateString('pt-BR')}</div>
        </div>)}
      </div>
    </div>}
  </div>
}

// ─── Animal Card ──────────────────────────────────────────────────────────────
function AnimalCard({fase,mercado,T}){
  const imgs={bezerro:'/bezerro.jpg',garrote:'/garrote.jpg',boi:'/boi.jpg',abatido:'/boi.jpg'}
  const precoMap={bezerro:mercado?.precos?.bezerro,garrote:mercado?.precos?.garrote,boi:mercado?.precos?.boi,abatido:mercado?.precos?.abate}
  const origem={bezerro:'Gov. NPC — fixo',garrote:'Livre entre jogadores',boi:'Livre entre jogadores',abatido:'Frigorífico NPC'}
  const badgeT={bezerro:'info',garrote:'purple',boi:'gray',abatido:'ok'}
  return <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.08)'}}>
    <div style={{height:130,overflow:'hidden',position:'relative',background:'#0a0c07'}}>
      <img src={imgs[fase]} alt={FASES[fase]} style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.8)'}} onError={e=>e.target.style.display='none'}/>
      <div style={{position:'absolute',top:8,left:8}}><Badge type={badgeT[fase]}>Semana {SEMANAS[fase]}</Badge></div>
    </div>
    <div style={{padding:'12px 14px'}}>
      <div style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:2}}>{FASES[fase]}</div>
      <div style={{fontSize:11,color:T.textMuted,marginBottom:8}}>{PESOS[fase]} kg</div>
      <div style={{fontSize:20,fontWeight:800,color:fase==='abatido'?T.green:T.text}}>${fmt(precoMap[fase])}</div>
      <div style={{fontSize:11,color:T.textMuted,marginTop:3}}>{origem[fase]}</div>
    </div>
  </div>
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo(){
  return <div style={{display:'flex',alignItems:'center',gap:10}}>
    <div style={{width:40,height:40,borderRadius:10,overflow:'hidden',background:'#000',flexShrink:0}}>
      <img src="/logo.png" alt="GVRPNL" style={{width:40,height:40,objectFit:'cover'}}/>
    </div>
    <div>
      <div style={{fontSize:15,fontWeight:800,color:'#7ab648',letterSpacing:'.5px',lineHeight:1}}>GVRPNL</div>
      <div style={{fontSize:10,color:'#4a5a3a',letterSpacing:'1px',fontWeight:600}}>PECUÁRIA</div>
    </div>
  </div>
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App(){
  const [dark,setDark]=useState(true)
  const T=getTheme(dark)
  const [page,setPage]=useState('mercado')
  const [user,setUser]=useState(null)
  const [token,setToken]=useState(null)
  const [authTab,setAuthTab]=useState('login')
  const [loginForm,setLoginForm]=useState({username:'',password:''})
  const [loginErr,setLoginErr]=useState('')
  const [regForm,setRegForm]=useState({username:'',password:'',fazenda:''})
  const [regErr,setRegErr]=useState('')
  const [regOk,setRegOk]=useState(false)
  const [showOnboarding,setShowOnboarding]=useState(false)
  const [mercado,setMercado]=useState(null)
  const [lotes,setLotes]=useState([])
  const [anuncios,setAnuncios]=useState([])
  const [trans,setTrans]=useState([])
  const [users,setUsers]=useState([])
  const [solic,setSolic]=useState([])
  const [racao,setRacao]=useState(null)
  const [notifs,setNotifs]=useState([])
  const [ranking,setRanking]=useState([])
  const [adminLog,setAdminLog]=useState([])
  const [perfil,setPerfil]=useState(null)
  const [editPerfil,setEditPerfil]=useState({fazenda:'',foto_url:'',bio:'',nova_senha:''})
  const [editTarget,setEditTarget]=useState(null)
  const [msg,setMsg]=useState('')
  const [msgT,setMsgT]=useState('success')
  const [chatAnuncio,setChatAnuncio]=useState(null)
  const [compraQt,setCompraQt]=useState(1)
  const [compraComp,setCompraComp]=useState('')
  const [compraStep,setCompraStep]=useState(1)
  const [confirmReset,setConfirmReset]=useState(false)
  const [nLote,setNLote]=useState({jogador_id:'',jogador_nome:'',fazenda:'',quantidade:1,valor_compra:1100,data_compra:'',comprovante:''})
  const [nUser,setNUser]=useState({username:'',password:'',fazenda:''})
  const [nAnuncio,setNAnuncio]=useState({lote_id:'',preco_pedido:'',obs:''})
  const [p2p,setP2p]=useState({anuncio_id:'',comprador_nome:'',preco_final:'',lote_id:''})
  const [nRacao,setNRacao]=useState({jogador_id:'',kg:'',valor:''})

  const api=useCallback(async(path,opts={})=>{
    const h={'Content-Type':'application/json'}
    if(token) h['Authorization']=`Bearer ${token}`
    const r=await fetch(path,{...opts,headers:h})
    return r.json()
  },[token])

  useEffect(()=>{
    const d=localStorage.getItem('gvrpnl_dark')
    if(d!==null) setDark(d==='true')
    const t=localStorage.getItem('gvrpnl_token')
    const u=localStorage.getItem('gvrpnl_user')
    if(t&&u){setToken(t);setUser(JSON.parse(u))}
  },[])

  useEffect(()=>{fetch('/api/mercado').then(r=>r.json()).then(setMercado)},[])
  useEffect(()=>{fetch('/api/ranking').then(r=>r.json()).then(setRanking)},[])

  const reload=useCallback(()=>{
    if(!token) return
    api('/api/lotes').then(setLotes)
    api('/api/anuncios').then(setAnuncios)
    api('/api/transacoes').then(setTrans)
    api('/api/solicitacoes').then(setSolic)
    api('/api/racao').then(setRacao)
    api('/api/notificacoes').then(setNotifs)
    api('/api/perfil').then(p=>{setPerfil(p);setEditPerfil({fazenda:p.fazenda||'',foto_url:p.foto_url||'',bio:p.bio||'',nova_senha:''})})
    if(user?.role==='admin'){api('/api/admin/usuarios').then(setUsers);api('/api/admin/log').then(setAdminLog)}
  },[token,api,user])

  useEffect(()=>{reload()},[reload])

  // Poll notifs
  useEffect(()=>{
    if(!token) return
    const iv=setInterval(()=>api('/api/notificacoes').then(setNotifs),15000)
    return ()=>clearInterval(iv)
  },[token,api])

  const notify=(m,t='success')=>{setMsg(m);setMsgT(t);setTimeout(()=>setMsg(''),4000)}

  function toggleDark(){const nd=!dark;setDark(nd);localStorage.setItem('gvrpnl_dark',nd)}

  async function login(){
    setLoginErr('')
    const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(loginForm)})
    const d=await r.json()
    if(d.error) return setLoginErr(d.error)
    localStorage.setItem('gvrpnl_token',d.token)
    localStorage.setItem('gvrpnl_user',JSON.stringify(d.user))
    setToken(d.token);setUser(d.user)
    if(!d.user.onboarding_ok) setShowOnboarding(true)
    setPage(d.user.role==='admin'?'admin':'rebanho')
  }

  async function register(){
    setRegErr('')
    const r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(regForm)})
    const d=await r.json()
    if(d.error) return setRegErr(d.error)
    setRegOk(true)
  }

  function logout(){
    localStorage.removeItem('gvrpnl_token');localStorage.removeItem('gvrpnl_user')
    setToken(null);setUser(null);setPage('mercado')
  }

  async function finishOnboarding(){
    await api('/api/perfil',{method:'POST'})
    setShowOnboarding(false)
  }

  async function readNotif(id){
    await api('/api/notificacoes',{method:'PATCH',body:JSON.stringify({id})})
    setNotifs(n=>id==='all'?n.map(x=>({...x,lida:true})):n.map(x=>x.id===id?{...x,lida:true}:x))
  }

  async function salvarPerfil(targetId){
    const body=targetId?{...editPerfil,target_id:targetId}:editPerfil
    const r=await api('/api/perfil',{method:'PATCH',body:JSON.stringify(body)})
    if(r.error) return notify('Erro: '+r.error,'danger')
    notify('✓ Perfil atualizado!')
    reload()
    setEditTarget(null)
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

  const meusLotes=user?.role==='admin'?lotes:lotes.filter(l=>l.jogador_id===user?.id)
  const abatesPend=lotes.filter(l=>l.status==='aguardando_pagamento')
  const solicPend=solic.filter(s=>s.status==='pendente')
  const usersPend=users.filter(u=>u.status==='pendente')
  const consumoDiario=meusLotes.filter(l=>l.status==='ativo').reduce((s,l)=>s+({bezerro:3,garrote:5,boi:8,abatido:0}[l.fase]||0)*l.quantidade,0)
  const diasRacaoLeft=racao?.kg_disponivel>0&&consumoDiario>0?Math.floor(racao.kg_disponivel/consumoDiario):null
  const cot=calcCot(compraQt)

  const nav=[
    {id:'mercado',label:'📈 Mercado',pub:true},
    {id:'comprar',label:'🛒 Comprar',pub:false},
    {id:'rebanho',label:'🐄 Rebanho',pub:false},
    {id:'venda',label:'🤝 Venda',pub:false},
    {id:'ranking',label:'🏆 Ranking',pub:true},
    {id:'ajuda',label:'❓ Ajuda',pub:true},
    {id:'perfil',label:'👤 Perfil',pub:false},
    {id:'admin',label:'⚙️ Admin',pub:false,admin:true},
    {id:'hist',label:'📋 Histórico',pub:false,admin:true},
  ]

  const gs=(size)=>({display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(${size}px,1fr))`,gap:14})

  return <>
    <Head>
      <title>GVRPNL — Pecuária</title>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
    </Head>

    {showOnboarding&&<Onboarding onClose={finishOnboarding} T={T}/>}
    {chatAnuncio&&<ChatPanel anuncio={chatAnuncio} user={user} token={token} onClose={()=>setChatAnuncio(null)} T={T}/>}

    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:T.bg,minHeight:'100vh',color:T.text,marginRight:chatAnuncio?340:0,transition:'margin-right .25s'}}>

      {/* Topbar */}
      <div style={{background:T.navBg,borderBottom:`1px solid ${T.border}`,padding:'0 16px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,flexWrap:'wrap',gap:8}}>
        <Logo/>
        <div style={{display:'flex',gap:2,flexWrap:'wrap'}}>
          {nav.filter(n=>n.pub||user).filter(n=>!n.admin||user?.role==='admin').map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{background:page===n.id?'rgba(122,182,72,.15)':'transparent',border:page===n.id?`1px solid ${T.border2}`:'1px solid transparent',color:page===n.id?T.green:T.textMuted,fontSize:12,padding:'5px 10px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontWeight:page===n.id?600:400,transition:'all .15s'}}>{n.label}</button>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={toggleDark} style={{background:'none',border:`1px solid ${T.border2}`,borderRadius:8,padding:'6px 10px',cursor:'pointer',fontSize:16,color:T.text}}>{dark?'☀️':'🌙'}</button>
          {user&&<NotifBell notifs={notifs} onRead={readNotif} T={T}/>}
          {user?<>
            <div style={{fontSize:12,color:T.textMuted,textAlign:'right',display:'none'}} className="hide-sm">
              <div style={{color:T.text,fontWeight:600}}>{user.username}</div>
            </div>
            <Btn v="ghost" onClick={logout} T={T} style={{padding:'5px 12px',fontSize:12}}>Sair</Btn>
          </>:<Btn onClick={()=>setPage('login')} T={T} style={{padding:'6px 14px'}}>Entrar</Btn>}
        </div>
      </div>

      {msg&&<div style={{background:msgT==='success'?'#0a2010':'#2a0808',color:msgT==='success'?T.green:'#e06060',padding:'10px 24px',fontSize:13,textAlign:'center',borderBottom:`1px solid ${msgT==='success'?T.border2:'#6a1a1a'}`,fontWeight:500}}>{msg}</div>}

      <div style={{padding:'16px 16px',maxWidth:1280,margin:'0 auto'}}>

        {/* LOGIN */}
        {(page==='login'||page==='cadastro')&&!user&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'70vh'}}>
            <div style={{background:T.card,border:`1px solid ${T.border2}`,borderRadius:16,padding:36,width:'100%',maxWidth:360,boxShadow:'0 8px 32px rgba(0,0,0,.15)'}}>
              <div style={{textAlign:'center',marginBottom:28}}>
                <div style={{width:64,height:64,borderRadius:14,overflow:'hidden',margin:'0 auto 12px',boxShadow:'0 4px 16px rgba(0,0,0,.2)'}}>
                  <img src="/logo.png" alt="GVRPNL" style={{width:64,height:64,objectFit:'cover'}}/>
                </div>
                <div style={{fontSize:20,fontWeight:800,color:T.text,marginBottom:4}}>GVRPNL</div>
                <div style={{fontSize:12,color:T.textMuted,letterSpacing:'1px',fontWeight:600}}>SISTEMA DE PECUÁRIA</div>
              </div>
              <div style={{display:'flex',marginBottom:24,background:T.inputBg,borderRadius:10,padding:4}}>
                {['login','cadastro'].map(tb=>(
                  <button key={tb} onClick={()=>{setAuthTab(tb);setPage(tb);setLoginErr('');setRegErr('');setRegOk(false)}} style={{flex:1,background:authTab===tb?`linear-gradient(135deg,${T.greenDark},${T.green})`:'transparent',border:'none',color:authTab===tb?'#fff':T.textMuted,fontSize:13,padding:'7px 0',borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontWeight:authTab===tb?600:400}}>
                    {tb==='login'?'Entrar':'Cadastrar'}
                  </button>
                ))}
              </div>
              {authTab==='login'?<>
                <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:18}}>
                  <Inp label="Usuário" T={T} value={loginForm.username} onChange={e=>setLoginForm(f=>({...f,username:e.target.value}))} placeholder="seu_usuario"/>
                  <Inp label="Senha" T={T} type="password" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))} placeholder="••••••" onKeyDown={e=>e.key==='Enter'&&login()}/>
                </div>
                {loginErr&&<Alert type="danger">{loginErr}</Alert>}
                <Btn onClick={login} T={T} style={{width:'100%',padding:11,fontSize:14}}>Entrar no servidor</Btn>
              </>:regOk?<div style={{textAlign:'center',padding:'16px 0'}}>
                <div style={{fontSize:40,marginBottom:12}}>✅</div>
                <div style={{fontSize:15,color:T.green,fontWeight:700,marginBottom:8}}>Cadastro enviado!</div>
                <div style={{fontSize:13,color:T.textMuted,lineHeight:1.6}}>Aguarde o admin aprovar sua conta.</div>
                <Btn v="ghost" onClick={()=>{setRegOk(false);setAuthTab('login');setPage('login')}} T={T} style={{marginTop:16,width:'100%'}}>Ir para login</Btn>
              </div>:<>
                <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:18}}>
                  <Inp label="Usuário" T={T} value={regForm.username} onChange={e=>setRegForm(f=>({...f,username:e.target.value}))} placeholder="nome_no_servidor"/>
                  <Inp label="Senha" T={T} type="password" value={regForm.password} onChange={e=>setRegForm(f=>({...f,password:e.target.value}))} placeholder="mínimo 6 caracteres"/>
                  <Inp label="Fazenda (opcional)" T={T} value={regForm.fazenda} onChange={e=>setRegForm(f=>({...f,fazenda:e.target.value}))} placeholder="Ex: 0325"/>
                </div>
                {regErr&&<Alert type="danger">{regErr}</Alert>}
                <Btn onClick={register} T={T} style={{width:'100%',padding:11,fontSize:14}}>Solicitar cadastro</Btn>
                <div style={{fontSize:12,color:T.textMuted,textAlign:'center',marginTop:12}}>O admin irá aprovar seu acesso</div>
              </>}
            </div>
          </div>
        )}

        {/* MERCADO */}
        {page==='mercado'&&<>
          <Title t="📈 Mercado" s="Preços em tempo real baseados no rebanho ativo" T={T}/>
          <div style={gs(180)}>{['bezerro','garrote','boi','abatido'].map(f=><AnimalCard key={f} fase={f} mercado={mercado} T={T}/>)}</div>
          <div style={{...gs(300),marginTop:4}}>
            <Card glow T={T}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Indicadores agora {mercado&&<span style={{fontSize:12,color:T.textMuted,fontWeight:400}}>· ${mercado.precos.precoKg}/kg · Ração ${mercado.precos.precoRacao}/kg</span>}</div>
              <div style={gs(120)}>
                <Metric T={T} label="Rebanho" value={`${mercado?.rebanho?.total||0} cab.`} color={mercado?.rebanho?.total>600?'#e06060':mercado?.rebanho?.total>400?T.gold:T.green} sub={mercado?.rebanho?.total>600?'ração +50%':mercado?.rebanho?.total>400?'ração +20%':'base'}/>
                <Metric T={T} label="Margem est." value={`${mercado?.margem||'~30'}%`} sub="bezerro→abate" color={T.green}/>
                <Metric T={T} label="Preço ração" value={`$${mercado?.precos?.precoRacao||2}/kg`} sub="112kg/cabeça"/>
                <Metric T={T} label="Custo ração/cab" value={`$${fmt(mercado?.precos?.custoRacao)}`} sub="ciclo completo"/>
              </div>
            </Card>
            <Card T={T}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Rebanho por fase</div>
              {['bezerro','garrote','boi'].map(f=>{
                const qty=mercado?.rebanho?.[f]||0
                return <div key={f} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                  <span style={{color:T.textMuted,fontSize:12,minWidth:70,fontWeight:500}}>{FASES[f]}</span>
                  <div style={{flex:1,background:T.inputBg,borderRadius:4,height:8,overflow:'hidden'}}>
                    <div style={{width:`${Math.min((qty/150)*100,100)}%`,height:'100%',background:`linear-gradient(90deg,${T.greenDark},${T.green})`,borderRadius:4}}/>
                  </div>
                  <span style={{fontSize:12,color:T.textDim,minWidth:50,textAlign:'right'}}>{qty} cab.</span>
                </div>
              })}
              <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10,marginTop:6,display:'flex',justifyContent:'space-between',fontSize:12}}>
                <span style={{color:T.textMuted}}>Limite: 400 cab.</span>
                <Badge type={mercado?.rebanho?.total>600?'red':mercado?.rebanho?.total>400?'warn':'ok'}>{mercado?.rebanho?.total>600?'Ração cara':mercado?.rebanho?.total>400?'Ração elevada':'Preço base'}</Badge>
              </div>
            </Card>
          </div>
        </>}

        {/* COMPRAR */}
        {page==='comprar'&&!user&&<Alert type="warn">Faça login para solicitar uma compra.</Alert>}
        {page==='comprar'&&user&&<>
          <Title t="🛒 Comprar Bezerros" s="O sistema calcula tudo — você só paga e envia o comprovante" T={T}/>
          {compraStep===3?<Card T={T} style={{maxWidth:480,margin:'0 auto',textAlign:'center',padding:40}}>
            <div style={{fontSize:48,marginBottom:16}}>🎉</div>
            <div style={{fontSize:18,fontWeight:700,color:T.green,marginBottom:8}}>Solicitação enviada!</div>
            <div style={{fontSize:13,color:T.textMuted,marginBottom:24,lineHeight:1.7}}>O admin irá verificar e aprovar. Seu lote aparecerá no Rebanho após aprovação.</div>
            <Btn onClick={()=>{setCompraStep(1);setCompraComp('');setCompraQt(1)}} T={T}>Nova cotação</Btn>
          </Card>:<div style={gs(300)}>
            <Card glow T={T}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:18}}>{compraStep===1?'1. Simule':'2. Pague e confirme'}</div>
              {compraStep===1&&<>
                <div style={{marginBottom:20}}>
                  <label style={{fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px',display:'block',marginBottom:10}}>Quantos bezerros?</label>
                  <div style={{display:'flex',alignItems:'center',gap:14}}>
                    <button onClick={()=>setCompraQt(Math.max(1,compraQt-1))} style={{width:38,height:38,borderRadius:8,background:T.border,border:'none',color:T.text,fontSize:20,cursor:'pointer'}}>−</button>
                    <input type="number" value={compraQt} onChange={e=>setCompraQt(Math.max(1,parseInt(e.target.value)||1))} style={{width:80,textAlign:'center',background:T.inputBg,border:`1px solid ${T.border2}`,borderRadius:8,padding:'8px',fontSize:22,color:T.text,fontFamily:'inherit',fontWeight:700,outline:'none'}}/>
                    <button onClick={()=>setCompraQt(compraQt+1)} style={{width:38,height:38,borderRadius:8,background:T.border,border:'none',color:T.text,fontSize:20,cursor:'pointer'}}>+</button>
                  </div>
                </div>
                {cot&&<>
                  <div style={{background:T.inputBg,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${T.border}`}}>
                    {[[`${cot.qty}× Bezerro ($${fmt(mercado.precos.bezerro)}/cab)`,cot.custoBezerros],['Frete ($50/cab)',cot.custoFrete],[`Ração (${mercado.precos.racaoPorCabeca}kg × ${cot.qty} × $${mercado.precos.precoRacao}/kg)`,cot.custoRacao]].map(([l,v])=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8,color:T.textDim}}><span>{l}</span><span>${fmt(v)}</span></div>
                    ))}
                    <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10,display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:700}}>
                      <span>Total</span><span style={{color:T.gold}}>${fmt(cot.total)}</span>
                    </div>
                  </div>
                  <div style={gs(120)}><Metric T={T} label="Receita est." value={`$${fmt(cot.receita)}`} color={T.green}/><Metric T={T} label="Margem est." value={`${cot.margem}%`} color={Number(cot.margem)>20?T.green:Number(cot.margem)>10?T.gold:'#e06060'}/></div>
                  <Btn onClick={()=>setCompraStep(2)} T={T} style={{width:'100%',padding:12,fontSize:14,marginTop:14}}>Tenho interesse — pagar ${fmt(cot.total)}</Btn>
                </>}
              </>}
              {compraStep===2&&cot&&<>
                <Alert type="info">Pague <strong>${fmt(cot.total)}</strong> no servidor e cole o link do comprovante.</Alert>
                <div style={{marginBottom:16}}><Inp T={T} label="Link do comprovante (Discord)" value={compraComp} onChange={e=>setCompraComp(e.target.value)} placeholder="https://discord.com/channels/..."/></div>
                <div style={{display:'flex',gap:10}}>
                  <Btn v="ghost" onClick={()=>setCompraStep(1)} T={T} style={{flex:1}}>Voltar</Btn>
                  <Btn onClick={async()=>{if(!compraComp) return notify('Cole o comprovante!','danger');const r=await api('/api/solicitacoes',{method:'POST',body:JSON.stringify({quantidade:compraQt,valor_total:cot.total,custo_racao:cot.custoRacao,comprovante:compraComp})});if(!r.error){setCompraStep(3);api('/api/solicitacoes').then(setSolic)}}} T={T} style={{flex:2,padding:12}}>Enviar solicitação</Btn>
                </div>
              </>}
            </Card>
            <Card T={T}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Minhas solicitações</div>
              <Tbl T={T} headers={['Data','Qtd','Total','Status']} rows={solic.map(s=>[new Date(s.criado_em).toLocaleDateString('pt-BR'),`${s.quantidade} cab.`,`$${fmt(s.valor_total)}`,<Badge type={s.status==='aprovado'?'ok':s.status==='recusado'?'danger':'warn'}>{s.status==='aprovado'?'✓ Aprovado':s.status==='recusado'?'✗ Recusado':'⏳ Pendente'}</Badge>])}/>
            </Card>
          </div>}
        </>}

        {/* REBANHO */}
        {page==='rebanho'&&!user&&<Alert type="warn">Faça login para ver seu rebanho.</Alert>}
        {page==='rebanho'&&user&&<>
          <Title t="🐄 Meu Rebanho" s={`${user.username}${user.fazenda?` · Fazenda ${user.fazenda}`:''}`} T={T}/>
          {diasRacaoLeft!==null&&diasRacaoLeft<=3&&<Alert type="danger">⚠ Ração acabando! Estoque para {diasRacaoLeft} dia(s) — {consumoDiario}kg/dia consumidos.</Alert>}
          <div style={{...gs(160),marginBottom:16}}>
            <Metric T={T} label="Cabeças ativas" value={meusLotes.filter(l=>['ativo','aguardando_pagamento'].includes(l.status)).reduce((s,l)=>s+l.quantidade,0)}/>
            <Metric T={T} label="Estoque ração" value={`${fmt(racao?.kg_disponivel||0)} kg`} sub={diasRacaoLeft!==null?`${diasRacaoLeft} dias`:'sem gado'} color={diasRacaoLeft!==null&&diasRacaoLeft<=3?'#e06060':T.green}/>
            <Metric T={T} label="Consumo/dia" value={`${consumoDiario} kg`}/>
            <Metric T={T} label="Receita est." value={`$${fmt(meusLotes.filter(l=>l.fase==='abatido'&&l.status==='ativo').reduce((s,l)=>s+(mercado?.precos?.abate||0)*l.quantidade,0))}`} color={T.green}/>
          </div>
          <Card T={T}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Lotes ativos</div>
            <Tbl T={T} headers={['Lote','Qtd','Fase','Pronto em','Ração/dia','Valor','Status','']}
              rows={meusLotes.map(l=>{
                const cons=({bezerro:3,garrote:5,boi:8,abatido:0}[l.fase]||0)*l.quantidade
                return[<span style={{fontWeight:700,color:T.text}}>{l.codigo}</span>,l.quantidade,faseBadge(l.fase),diasRest(l.data_fase4),
                  <span style={{color:cons>0?T.gold:T.textMuted}}>{cons}kg</span>,
                  <span style={{color:T.green,fontWeight:600}}>${fmt((mercado?.precos?.abate||0)*l.quantidade)}</span>,
                  <Badge type={l.status==='ativo'?'gray':l.status==='aguardando_pagamento'?'amber':l.status==='pago'?'ok':'purple'}>{l.status==='ativo'?'Ativo':l.status==='aguardando_pagamento'?'Aguard.':l.status==='pago'?'✓ Pago':'Vendido'}</Badge>,
                  l.fase==='abatido'&&l.status==='ativo'?<Btn T={T} onClick={async()=>{const r=await api(`/api/lotes/${l.id}`,{method:'PATCH',body:JSON.stringify({action:'solicitar_abate',preco_kg:mercado?.precos?.precoKg||3})});if(!r.error){notify('Abate solicitado!');api('/api/lotes').then(setLotes)}}} style={{padding:'4px 10px',fontSize:11}}>Solicitar abate</Btn>
                  :l.status==='pago'?<Badge type="ok">✓ Pago</Badge>
                  :l.fase!=='abatido'&&l.status==='ativo'?<Btn T={T} v="purple" onClick={()=>{setNAnuncio(f=>({...f,lote_id:l.id}));setPage('venda')}} style={{padding:'4px 10px',fontSize:11}}>Anunciar</Btn>:'—']
              })}/>
          </Card>
        </>}

        {/* VENDA */}
        {page==='venda'&&<>
          <Title t="🤝 Venda entre Jogadores" s="Garrote e Boi · preço livre · chat ao vivo" T={T}/>
          <Alert type="info">Clique em 💬 Negociar para abrir o chat do anúncio e fazer sua oferta.</Alert>
          <Card T={T}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Animais à venda</div>
            <Tbl T={T} headers={['Vendedor','Fazenda','Fase','Qtd','Preço','','']}
              rows={anuncios.filter(a=>a.status==='ativo').map(a=>[
                <span style={{fontWeight:600}}>{a.vendedor_nome}</span>,a.fazenda||'—',faseBadge(a.fase),a.quantidade,
                <span style={{fontWeight:700,color:T.gold}}>${fmt(a.preco_pedido)}</span>,
                a.obs?<span style={{fontSize:11,color:T.textMuted}}>{a.obs}</span>:'',
                <Btn T={T} v="purple" style={{padding:'5px 12px',fontSize:12}} onClick={()=>setChatAnuncio(a)}>💬 Negociar</Btn>
              ])}/>
          </Card>
          {user&&<div style={gs(280)}>
            <Card T={T}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Anunciar meu animal</div>
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:14}}>
                <Sel T={T} label="Lote" value={nAnuncio.lote_id} onChange={e=>setNAnuncio(f=>({...f,lote_id:e.target.value}))}>
                  <option value="">Selecione...</option>
                  {meusLotes.filter(l=>l.status==='ativo'&&l.fase!=='bezerro'&&l.fase!=='abatido').map(l=><option key={l.id} value={l.id}>{l.codigo} — {FASES[l.fase]} ({l.quantidade} cab.)</option>)}
                </Sel>
                <Inp T={T} label="Preço ($)" type="number" value={nAnuncio.preco_pedido} onChange={e=>setNAnuncio(f=>({...f,preco_pedido:e.target.value}))} placeholder="1800"/>
                <Inp T={T} label="Observação" value={nAnuncio.obs} onChange={e=>setNAnuncio(f=>({...f,obs:e.target.value}))} placeholder="Negociável..."/>
              </div>
              <Btn T={T} onClick={async()=>{const l=lotes.find(x=>x.id===nAnuncio.lote_id);if(!l) return notify('Selecione um lote','danger');const r=await api('/api/anuncios',{method:'POST',body:JSON.stringify({...nAnuncio,lote_codigo:l.codigo,fase:l.fase,quantidade:l.quantidade,peso_kg:l.peso_kg})});if(!r.error){notify('✓ Anúncio publicado!');api('/api/anuncios').then(setAnuncios)}}}>Publicar anúncio</Btn>
            </Card>
            {user?.role==='admin'&&<Card T={T}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Registrar venda <Badge type="amber">Admin</Badge></div>
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:14}}>
                <Sel T={T} label="Anúncio" value={p2p.anuncio_id} onChange={e=>{const a=anuncios.find(x=>x.id===e.target.value);setP2p(f=>({...f,anuncio_id:e.target.value,lote_id:a?.lote_id||''}))}}>
                  <option value="">Selecione...</option>
                  {anuncios.filter(a=>a.status==='ativo').map(a=><option key={a.id} value={a.id}>{a.lote_codigo} — {a.vendedor_nome}</option>)}
                </Sel>
                <Inp T={T} label="Comprador" value={p2p.comprador_nome} onChange={e=>setP2p(f=>({...f,comprador_nome:e.target.value}))} placeholder="NomeJogador"/>
                <Inp T={T} label="Preço final ($)" type="number" value={p2p.preco_final} onChange={e=>setP2p(f=>({...f,preco_final:e.target.value}))}/>
              </div>
              <Btn T={T} onClick={async()=>{const r=await api('/api/anuncios',{method:'PATCH',body:JSON.stringify(p2p)});if(!r.error){notify('✓ Venda registrada!');reload()}}}>Registrar venda</Btn>
            </Card>}
          </div>}
        </>}

        {/* RANKING */}
        {page==='ranking'&&<>
          <Title t="🏆 Ranking de Criadores" s="Top produtores do servidor" T={T}/>
          <Card T={T}>
            <Tbl T={T} headers={['#','Criador','Abates','Cabeças','Total ganho']}
              rows={ranking.map((r,i)=>[
                <span style={{fontWeight:700,color:i===0?T.gold:i===1?T.textDim:T.textMuted}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}º`}</span>,
                <span style={{fontWeight:600,color:T.text}}>{r.nome}</span>,
                r.total_abates,r.total_cabecas,
                <span style={{fontWeight:700,color:T.green}}>${fmt(r.total_ganho)}</span>
              ])}/>
          </Card>
        </>}

        {/* AJUDA */}
        {page==='ajuda'&&<>
          <Title t="❓ Ajuda — Como funciona" s="Tudo que você precisa saber sobre o sistema" T={T}/>
          <div style={gs(280)}>
            {[
              {emoji:'🌱',title:'O ciclo completo',text:'Seu gado passa por 4 fases em 4 semanas: Bezerro → Garrote → Boi → Abate. Só o abate final gera dinheiro no servidor via addmoney do admin.'},
              {emoji:'🛒',title:'Como comprar',text:'Vá na aba Comprar, escolha a quantidade, veja o breakdown completo (bezerro + frete + ração), pague no servidor e cole o comprovante. O admin aprova e o lote aparece no seu Rebanho.'},
              {emoji:'🌾',title:'Ração',text:'Cada animal precisa de ração. Com mais de 400 cabeças no servidor a ração fica +20% mais cara. Acima de 600 cabeças fica +50%. Fique de olho no estoque!'},
              {emoji:'🥩',title:'Solicitar abate',text:'Quando seu lote chegar na semana 4 (Boi abatido), clique em "Solicitar abate". O admin faz o addmoney no servidor e marca como pago.'},
              {emoji:'🤝',title:'Venda entre jogadores',text:'A partir do Garrote (semana 2) você pode vender para outro jogador pelo chat ao vivo. Mais rápido, mas com margem menor para quem vende.'},
              {emoji:'🔔',title:'Notificações',text:'Você recebe notificações quando seu lote avança de fase e quando o abate é pago. Veja o sino 🔔 no topo da página.'},
            ].map(c=><Card key={c.title} T={T}>
              <div style={{fontSize:32,marginBottom:10}}>{c.emoji}</div>
              <div style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:8}}>{c.title}</div>
              <div style={{fontSize:13,color:T.textDim,lineHeight:1.7}}>{c.text}</div>
            </Card>)}
          </div>
          <Card T={T}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>Tabela de preços e fases</div>
            <Tbl T={T} headers={['Fase','Peso','Compra de','Venda para','Consumo ração']}
              rows={[
                ['🐄 Bezerro — Sem. 1','180kg','Gov. NPC ($1.100)','—','21kg/cabeça'],
                ['🐄 Garrote — Sem. 2','400kg','Outro jogador','Outro jogador','35kg/cabeça'],
                ['🐄 Boi — Sem. 3','540kg','Outro jogador','Outro jogador','56kg/cabeça'],
                ['🥩 Boi Abatido — Sem. 4','648kg','—','Frigorífico NPC','—'],
              ].map(r=>r.map((c,i)=><span style={{color:i===0?T.text:T.textDim,fontWeight:i===0?600:400}}>{c}</span>))}/>
          </Card>
        </>}

        {/* PERFIL */}
        {page==='perfil'&&!user&&<Alert type="warn">Faça login para ver seu perfil.</Alert>}
        {page==='perfil'&&user&&<>
          <Title t="👤 Meu Perfil" s="Edite suas informações e veja suas estatísticas" T={T}/>
          <div style={gs(280)}>
            <Card T={T} glow>
              <div style={{textAlign:'center',marginBottom:20}}>
                <div style={{width:80,height:80,borderRadius:'50%',overflow:'hidden',margin:'0 auto 12px',border:`3px solid ${T.green}`,background:T.inputBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36}}>
                  {perfil?.foto_url?<img src={perfil.foto_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:'🐄'}
                </div>
                <div style={{fontSize:18,fontWeight:700,color:T.text}}>{perfil?.username}</div>
                <div style={{fontSize:13,color:T.textMuted}}>{perfil?.fazenda?`Fazenda ${perfil.fazenda}`:''}</div>
                {perfil?.bio&&<div style={{fontSize:13,color:T.textDim,marginTop:8,lineHeight:1.6}}>{perfil.bio}</div>}
              </div>
              <div style={gs(100)}>
                <Metric T={T} label="Abates" value={perfil?.stats?.total_abates||0}/>
                <Metric T={T} label="Cabeças" value={fmt(perfil?.stats?.total_cabecas||0)}/>
                <Metric T={T} label="Total ganho" value={`$${fmt(perfil?.stats?.total_ganho||0)}`} color={T.green}/>
              </div>
            </Card>
            <Card T={T}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>Editar perfil</div>
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
                <Inp T={T} label="URL da foto de perfil" value={editPerfil.foto_url} onChange={e=>setEditPerfil(f=>({...f,foto_url:e.target.value}))} placeholder="https://i.imgur.com/..."/>
                <Inp T={T} label="Fazenda" value={editPerfil.fazenda} onChange={e=>setEditPerfil(f=>({...f,fazenda:e.target.value}))} placeholder="0325"/>
                <Inp T={T} label="Bio (opcional)" value={editPerfil.bio} onChange={e=>setEditPerfil(f=>({...f,bio:e.target.value}))} placeholder="Criador desde 2024..."/>
                <Inp T={T} label="Nova senha (deixe em branco para manter)" type="password" value={editPerfil.nova_senha} onChange={e=>setEditPerfil(f=>({...f,nova_senha:e.target.value}))} placeholder="••••••"/>
              </div>
              <Btn T={T} onClick={()=>salvarPerfil(null)}>Salvar alterações</Btn>
            </Card>
          </div>
        </>}

        {/* ADMIN */}
        {page==='admin'&&user?.role==='admin'&&<>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
            <div><div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:3}}>⚙️ Admin</div><div style={{fontSize:13,color:T.textMuted}}>Gerenciar o servidor de pecuária</div></div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              {confirmReset?<>
                <span style={{fontSize:12,color:'#e06060'}}>Apaga TUDO. Confirma?</span>
                <Btn v="red" T={T} onClick={async()=>{const r=await api('/api/admin/reset',{method:'POST',body:JSON.stringify({tipo:'rebanho_completo'})});if(r.ok){notify('✓ Resetado!');reload();setConfirmReset(false)}}}>✓ Confirmar</Btn>
                <Btn v="ghost" T={T} onClick={()=>setConfirmReset(false)}>Cancelar</Btn>
              </>:<Btn v="danger" T={T} onClick={()=>setConfirmReset(true)} style={{fontSize:12}}>🗑 Resetar rebanho</Btn>}
            </div>
          </div>

          {/* Dashboard */}
          <div style={{...gs(140),marginBottom:16}}>
            <Metric T={T} label="Rebanho total" value={`${mercado?.rebanho?.total||0} cab.`} color={T.green}/>
            <Metric T={T} label="Abates pendentes" value={abatesPend.length} color={abatesPend.length>0?T.gold:T.text}/>
            <Metric T={T} label="Compras pendentes" value={solicPend.length} color={solicPend.length>0?T.gold:T.text}/>
            <Metric T={T} label="Cadastros pendentes" value={usersPend.length} color={usersPend.length>0?'#4a90d0':T.text}/>
            <Metric T={T} label="Volume total" value={`$${fmt(trans.reduce((s,t)=>s+Number(t.valor),0))}`} color={T.green}/>
          </div>

          {solicPend.length>0&&<Alert type="warn">🛒 {solicPend.length} solicitação(ões) de compra pendente(s)</Alert>}
          {abatesPend.length>0&&<Alert type="warn">🥩 {abatesPend.length} abate(s) aguardando addmoney</Alert>}
          {usersPend.length>0&&<Alert type="info">👤 {usersPend.length} cadastro(s) pendente(s)</Alert>}

          <Card T={T}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:6}}>Solicitações de compra</div>
            <div style={{fontSize:12,color:T.textMuted,marginBottom:14}}>Verifique o comprovante antes de aprovar.</div>
            <Tbl T={T} headers={['Jogador','Qtd','Total','Comprovante','','']}
              rows={solicPend.map(s=>[
                <span style={{fontWeight:600}}>{s.jogador_nome}</span>,`${s.quantidade} cab.`,
                <span style={{color:T.gold,fontWeight:700}}>${fmt(s.valor_total)}</span>,
                <a href={s.comprovante} target="_blank" rel="noreferrer" style={{color:'#4a90d0',fontSize:12}}>Ver →</a>,
                <Btn T={T} onClick={async()=>{await api('/api/solicitacoes',{method:'PATCH',body:JSON.stringify({id:s.id,status:'aprovado'})});notify('✓ Aprovado!');api('/api/solicitacoes').then(setSolic)}} style={{padding:'4px 10px',fontSize:11}}>✓ Aprovar</Btn>,
                <Btn T={T} v="danger" onClick={async()=>{await api('/api/solicitacoes',{method:'PATCH',body:JSON.stringify({id:s.id,status:'recusado'})});notify('Recusado.');api('/api/solicitacoes').then(setSolic)}} style={{padding:'4px 10px',fontSize:11}}>✗</Btn>
              ])}/>
          </Card>

          <div style={gs(320)}>
            <Card T={T}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Registrar compra — Gov. NPC</div>
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:14}}>
                <Sel T={T} label="Jogador" value={nLote.jogador_id} onChange={e=>{const u=users.find(x=>x.id===e.target.value);setNLote(f=>({...f,jogador_id:e.target.value,jogador_nome:u?.username||'',fazenda:u?.fazenda||''}))}}>
                  <option value="">Selecione...</option>
                  {users.filter(u=>u.role==='jogador'&&u.status==='aprovado').map(u=><option key={u.id} value={u.id}>{u.username}{u.fazenda?` — Faz. ${u.fazenda}`:''}</option>)}
                </Sel>
                <Inp T={T} label="Quantidade" type="number" value={nLote.quantidade} onChange={e=>setNLote(f=>({...f,quantidade:Number(e.target.value)}))}/>
                <Inp T={T} label="Preço/cab ($)" type="number" value={nLote.valor_compra} onChange={e=>setNLote(f=>({...f,valor_compra:Number(e.target.value)}))}/>
                <Inp T={T} label="Data compra" type="date" value={nLote.data_compra} onChange={e=>setNLote(f=>({...f,data_compra:e.target.value}))}/>
                <Inp T={T} label="Comprovante" value={nLote.comprovante} onChange={e=>setNLote(f=>({...f,comprovante:e.target.value}))} placeholder="discord.com/..."/>
              </div>
              <Btn T={T} onClick={async()=>{const r=await api('/api/lotes',{method:'POST',body:JSON.stringify(nLote)});if(!r.error){notify('✓ Lote '+r.codigo+' criado!');reload()}}}>Registrar lote</Btn>
            </Card>
            <Card T={T}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:8}}>Abates — aguardando addmoney</div>
              <div style={{fontSize:12,color:T.textMuted,marginBottom:14}}>Faça o addmoney no servidor, depois marque como pago.</div>
              <Tbl T={T} headers={['Jogador','Lote','Qtd','Valor','']}
                rows={abatesPend.map(l=>[
                  <span style={{fontWeight:600}}>{l.jogador_nome}</span>,l.codigo,l.quantidade,
                  <span style={{color:T.green,fontWeight:700}}>${fmt(l.valor_abate)}</span>,
                  <Btn T={T} v="amber" onClick={async()=>{const r=await api(`/api/lotes/${l.id}`,{method:'PATCH',body:JSON.stringify({action:'marcar_pago'})});if(!r.error){notify('✓ Pago!');reload()}}} style={{padding:'4px 8px',fontSize:11}}>✓ Pago</Btn>
                ])}/>
            </Card>
          </div>

          <Card T={T}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Todo o rebanho</div>
            <Tbl T={T} headers={['Jogador','Fazenda','Lote','Qtd','Fase','Pronto em','Status','Ação','🗑']}
              rows={lotes.filter(l=>!['pago','vendido'].includes(l.status)).map(l=>[
                <span style={{fontWeight:600}}>{l.jogador_nome}</span>,l.fazenda,l.codigo,l.quantidade,faseBadge(l.fase),diasRest(l.data_fase4),
                <Badge type={l.status==='ativo'?'gray':l.status==='aguardando_pagamento'?'amber':'ok'}>{l.status}</Badge>,
                l.fase!=='abatido'&&l.status==='ativo'?<Btn T={T} v="ghost" onClick={async()=>{const r=await api(`/api/lotes/${l.id}`,{method:'PATCH',body:JSON.stringify({action:'avancar_fase'})});if(!r.error){notify('Fase avançada!');reload()}}} style={{padding:'4px 8px',fontSize:11}}>Avançar</Btn>:'—',
                <Btn T={T} v="danger" onClick={async()=>{await api('/api/admin/reset',{method:'POST',body:JSON.stringify({tipo:'lote',lote_id:l.id})});notify('Lote removido.');api('/api/lotes').then(setLotes)}} style={{padding:'3px 8px',fontSize:11}}>✕</Btn>
              ])}/>
          </Card>

          <div style={gs(320)}>
            <Card T={T}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Registrar ração</div>
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:14}}>
                <Sel T={T} label="Jogador" value={nRacao.jogador_id} onChange={e=>setNRacao(f=>({...f,jogador_id:e.target.value}))}>
                  <option value="">Selecione...</option>
                  {users.filter(u=>u.role==='jogador'&&u.status==='aprovado').map(u=><option key={u.id} value={u.id}>{u.username}</option>)}
                </Sel>
                <Inp T={T} label="Quantidade (kg)" type="number" value={nRacao.kg} onChange={e=>setNRacao(f=>({...f,kg:e.target.value}))} placeholder="500"/>
                <Inp T={T} label="Valor pago ($)" type="number" value={nRacao.valor} onChange={e=>setNRacao(f=>({...f,valor:e.target.value}))} placeholder="1000"/>
              </div>
              <Btn T={T} onClick={async()=>{const r=await api('/api/racao',{method:'POST',body:JSON.stringify(nRacao)});if(!r.error) notify('✓ Ração registrada!')}}>Registrar</Btn>
            </Card>

            <Card T={T}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:6}}>Cadastros pendentes</div>
              {usersPend.length===0?<div style={{fontSize:13,color:T.textMuted,padding:'8px 0'}}>Nenhum pendente.</div>
              :<Tbl T={T} headers={['Usuário','Fazenda','']}
                rows={usersPend.map(u=>[
                  <span style={{fontWeight:600}}>{u.username}</span>,u.fazenda||'—',
                  <div style={{display:'flex',gap:6}}>
                    <Btn T={T} onClick={async()=>{await api('/api/admin/usuarios',{method:'PATCH',body:JSON.stringify({id:u.id,status:'aprovado'})});notify('✓ Aprovado!');api('/api/admin/usuarios').then(setUsers)}} style={{padding:'4px 8px',fontSize:11}}>✓</Btn>
                    <Btn T={T} v="danger" onClick={async()=>{await api('/api/admin/usuarios',{method:'PATCH',body:JSON.stringify({id:u.id,status:'recusado'})});api('/api/admin/usuarios').then(setUsers)}} style={{padding:'4px 8px',fontSize:11}}>✗</Btn>
                  </div>
                ])}/>}
            </Card>
          </div>

          <Card T={T}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Gerenciar jogadores</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:14,alignItems:'flex-end'}}>
              <div style={{flex:1,minWidth:140}}><Inp T={T} label="Usuário" value={nUser.username} onChange={e=>setNUser(f=>({...f,username:e.target.value}))} placeholder="nome_jogador"/></div>
              <div style={{flex:1,minWidth:120}}><Inp T={T} label="Senha" type="password" value={nUser.password} onChange={e=>setNUser(f=>({...f,password:e.target.value}))} placeholder="senha123"/></div>
              <div style={{flex:1,minWidth:100}}><Inp T={T} label="Fazenda" value={nUser.fazenda} onChange={e=>setNUser(f=>({...f,fazenda:e.target.value}))} placeholder="0325"/></div>
              <Btn T={T} onClick={async()=>{const r=await api('/api/admin/usuarios',{method:'POST',body:JSON.stringify(nUser)});if(!r.error){notify('✓ Criado!');api('/api/admin/usuarios').then(setUsers)}}}>Criar</Btn>
            </div>
            <Tbl T={T} headers={['Usuário','Fazenda','Status','Editar','']}
              rows={users.filter(u=>u.status!=='pendente').map(u=>[
                <span style={{fontWeight:600}}>{u.username}</span>,u.fazenda||'—',
                <Badge type={u.status==='aprovado'||u.role==='admin'?'ok':'danger'}>{u.role==='admin'?'admin':u.status||'aprovado'}</Badge>,
                u.role!=='admin'?<Btn T={T} v="ghost" onClick={()=>{setEditTarget(u);setEditPerfil({fazenda:u.fazenda||'',foto_url:u.foto_url||'',bio:u.bio||'',nova_senha:''})}} style={{padding:'3px 8px',fontSize:11}}>✏ Editar</Btn>:'—',
                u.role!=='admin'?<Btn T={T} v="danger" onClick={async()=>{await api('/api/admin/usuarios',{method:'DELETE',body:JSON.stringify({id:u.id})});api('/api/admin/usuarios').then(setUsers)}} style={{padding:'3px 8px',fontSize:11}}>✕</Btn>:'—'
              ])}/>
          </Card>

          {/* Modal editar jogador */}
          {editTarget&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
            <Card T={T} style={{width:'100%',maxWidth:400,margin:0}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:700,color:T.text}}>Editar — {editTarget.username}</div>
                <button onClick={()=>setEditTarget(null)} style={{background:'none',border:'none',color:T.textMuted,fontSize:20,cursor:'pointer'}}>×</button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
                <Inp T={T} label="Fazenda" value={editPerfil.fazenda} onChange={e=>setEditPerfil(f=>({...f,fazenda:e.target.value}))} placeholder="0325"/>
                <Inp T={T} label="URL da foto" value={editPerfil.foto_url} onChange={e=>setEditPerfil(f=>({...f,foto_url:e.target.value}))} placeholder="https://..."/>
                <Inp T={T} label="Bio" value={editPerfil.bio} onChange={e=>setEditPerfil(f=>({...f,bio:e.target.value}))} placeholder="Criador desde 2024..."/>
                <Inp T={T} label="Nova senha (opcional)" type="password" value={editPerfil.nova_senha} onChange={e=>setEditPerfil(f=>({...f,nova_senha:e.target.value}))} placeholder="••••••"/>
              </div>
              <div style={{display:'flex',gap:10}}>
                <Btn T={T} v="ghost" onClick={()=>setEditTarget(null)} style={{flex:1}}>Cancelar</Btn>
                <Btn T={T} onClick={()=>salvarPerfil(editTarget.id)} style={{flex:2}}>Salvar</Btn>
              </div>
            </Card>
          </div>}

          <Card T={T}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Log de ações do admin</div>
            <Tbl T={T} headers={['Data','Admin','Ação','Detalhes']}
              rows={adminLog.map(l=>[
                new Date(l.criado_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}),
                <span style={{fontWeight:600,color:T.green}}>{l.admin_nome}</span>,
                <Badge type="info">{l.acao}</Badge>,
                <span style={{fontSize:12,color:T.textMuted}}>{l.detalhes}</span>
              ])}/>
          </Card>
        </>}

        {/* HISTÓRICO */}
        {page==='hist'&&user?.role==='admin'&&<>
          <Title t="📋 Histórico de Transações" s="Apenas admins" T={T}/>
          <div style={{...gs(140),marginBottom:16}}>
            <Metric T={T} label="Total" value={trans.length}/>
            <Metric T={T} label="Abates" value={trans.filter(t=>t.tipo==='abate').length}/>
            <Metric T={T} label="Vendas" value={trans.filter(t=>t.tipo==='p2p').length}/>
            <Metric T={T} label="Volume" value={`$${fmt(trans.reduce((s,t)=>s+Number(t.valor),0))}`} color={T.green}/>
          </div>
          <Card T={T}>
            <Tbl T={T} headers={['Data','Tipo','De','Para','Qtd','Total']}
              rows={trans.map(t=>[
                new Date(t.criado_em).toLocaleDateString('pt-BR'),
                <Badge type={t.tipo==='abate'?'ok':t.tipo==='p2p'?'purple':t.tipo==='compra_racao'?'amber':'info'}>{t.tipo==='abate'?'Abate':t.tipo==='p2p'?'Venda p2p':t.tipo==='compra_racao'?'Ração':'Compra NPC'}</Badge>,
                t.de_jogador,t.para_jogador,t.quantidade||'—',
                <span style={{color:T.green,fontWeight:700}}>${fmt(t.valor)}</span>
              ])}/>
          </Card>
        </>}
        {page==='hist'&&user?.role!=='admin'&&<Alert type="danger">Acesso restrito — apenas administradores.</Alert>}

      </div>
    </div>
  </>
}
