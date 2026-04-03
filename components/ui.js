import { useState, useEffect } from 'react'
import { useTheme } from '../lib/context'
import { sounds } from '../lib/sounds'
import { FASES, SEMANAS } from '../lib/theme'

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({type, children, T: TProp}) {
  const ctx = useTheme()
  // T prop opcional para compatibilidade com chamadas existentes que passam T={T}
  // eslint-disable-next-line no-unused-vars
  const T = TProp || (ctx ? ctx.T : null)
  const map={ok:{bg:'#002010',color:'#4ade80',border:'#14532d'},warn:{bg:'#2a1a08',color:'#c28c46',border:'#8a602c'},info:{bg:'#0a0f1e',color:'#7ab0e0',border:'#1a3060'},gray:{bg:'#261c17',color:'#a6968a',border:'#5c4a42'},purple:{bg:'#150a28',color:'#9060e0',border:'#3a2060'},danger:{bg:'#2a0808',color:'#f87171',border:'#450a0a'},amber:{bg:'#2a1a08',color:'#c28c46',border:'#8a602c'},gold:{bg:'#261c17',color:'#eaddcf',border:'#5c4a42'},nl:{bg:'#0a0f1e',color:'#7ab0e0',border:'#1a3060'}}
  const s=map[type]||map.gray
  return <span style={{background:s.bg,color:s.color,border:`1px solid ${s.border}`,fontSize:10,padding:'2px 8px',borderRadius:4,fontWeight:700,whiteSpace:'nowrap',display:'inline-block',letterSpacing:'1px',fontFamily:'var(--font-data)',textTransform:'uppercase'}}>{children}</span>
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({children, style, glow, hover=true, T: TProp}) {
  const ctx = useTheme()
  // T não é usado diretamente no JSX (usa CSS vars), mantido para assinatura compatível
  return <div className={hover?'card-hover':''} style={{background:'var(--card)',border:`1px solid ${glow?'var(--rust2)':'var(--border)'}`,borderLeft:glow?'3px solid var(--rust)':'1px solid var(--border)',borderRadius:6,padding:20,marginBottom:16,position:'relative',overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.5)',...style}} onMouseEnter={hover?e=>{e.currentTarget.style.borderColor='var(--rust2)'}:undefined} onMouseLeave={hover?e=>{e.currentTarget.style.borderColor=glow?'var(--rust2)':'var(--border)'}:undefined}>
    {glow&&<div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'var(--rust)',opacity:.6}}/>}
    {children}
  </div>
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────
export function SectionTitle({icon, title, sub, T: TProp}) {
  return <div style={{marginBottom:24,paddingBottom:14,borderBottom:'1px solid var(--border)'}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
      <span style={{fontSize:18}}>{icon}</span>
      <h1 style={{fontFamily:'var(--font-disp)',fontSize:28,letterSpacing:'1px',color:'var(--ice)',fontWeight:700,lineHeight:1}}>{title}</h1>
    </div>
    {sub&&<p style={{fontSize:11,color:'var(--ice3)',marginLeft:28,letterSpacing:'0.5px',fontWeight:400,fontFamily:'var(--font-data)'}}>{sub}</p>}
  </div>
}

// ─── Metric ───────────────────────────────────────────────────────────────────
export function Metric({label, value, sub, color, T: TProp, icon}) {
  return <div style={{background:'var(--input-bg)',border:'1px solid var(--border)',borderTop:`2px solid ${color||'var(--border2)'}`,borderRadius:4,padding:'14px 16px',position:'relative',overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.4)'}}>
    <div style={{fontSize:9,color:'var(--ice3)',marginBottom:6,textTransform:'uppercase',letterSpacing:'2px',fontWeight:500,fontFamily:'var(--font-data)'}}>{label}</div>
    <div style={{fontSize:24,fontWeight:700,color:color||'var(--ice)',fontFamily:'var(--font-data)',letterSpacing:'0.5px',lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:'var(--ice3)',marginTop:4,fontWeight:300,letterSpacing:'1px'}}>{sub}</div>}
  </div>
}

// ─── Inp ──────────────────────────────────────────────────────────────────────
export function Inp({label, T: TProp, hint, ...props}) {
  return <div style={{display:'flex',flexDirection:'column',gap:6}}>
    {label&&<label style={{fontSize:10,color:'var(--ice3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'2px',fontFamily:'var(--font-data)'}}>{label}</label>}
    <input {...props} style={{background:'var(--input-bg)',border:'1px solid var(--border2)',borderRadius:8,padding:'11px 14px',fontSize:13,color:'var(--ice)',fontFamily:"'Inter',sans-serif",outline:'none',transition:'border-color .2s ease,box-shadow .2s ease',...props.style}} onFocus={e=>{e.target.style.borderColor='var(--rust)';e.target.style.boxShadow='0 0 0 3px rgba(194,140,70,.12)';props.onFocus&&props.onFocus(e)}} onBlur={e=>{e.target.style.borderColor='var(--border2)';e.target.style.boxShadow='none';props.onBlur&&props.onBlur(e)}}/>
    {hint&&<div style={{fontSize:10,color:'var(--ice3)',letterSpacing:'1px',fontWeight:300}}>{hint}</div>}
  </div>
}

// ─── Sel ──────────────────────────────────────────────────────────────────────
export function Sel({label, children, T: TProp, ...props}) {
  return <div style={{display:'flex',flexDirection:'column',gap:6}}>
    {label&&<label style={{fontSize:10,color:'var(--ice3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'2px',fontFamily:'var(--font-data)'}}>{label}</label>}
    <select {...props} style={{background:'var(--input-bg)',border:'1px solid var(--border2)',borderRadius:8,padding:'11px 14px',fontSize:13,color:'var(--ice)',fontFamily:"'Inter',sans-serif",outline:'none',cursor:'pointer',transition:'border-color .2s ease',...props.style}} onFocus={e=>e.target.style.borderColor='var(--rust)'} onBlur={e=>e.target.style.borderColor='var(--border2)'}>{children}</select>
  </div>
}

// ─── Btn ──────────────────────────────────────────────────────────────────────
export function Btn({children, onClick, v='primary', style, disabled, T: TProp, sound=true}) {
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
  return <button style={{background:c.bg,border:c.border,color:c.color,borderRadius:8,fontSize:13,fontWeight:600,cursor:disabled?'not-allowed':'pointer',padding:'10px 22px',fontFamily:"'Inter',sans-serif",letterSpacing:'0.3px',opacity:disabled?.4:1,boxShadow:c.shadow||'none',outline:'none',transition:'background .2s ease,color .2s ease,transform .12s ease,box-shadow .2s ease',...style}} onClick={()=>{if(sound&&!disabled) sounds.click();onClick&&onClick()}} disabled={disabled} onMouseEnter={e=>{if(!disabled){e.currentTarget.style.background=c.hbg;e.currentTarget.style.color=c.hc;e.currentTarget.style.boxShadow=`0 4px 16px rgba(0,0,0,.3)`}}} onMouseLeave={e=>{e.currentTarget.style.background=c.bg;e.currentTarget.style.color=c.color;e.currentTarget.style.boxShadow=c.shadow||'none'}} onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform='scale(.97)'}} onMouseUp={e=>{e.currentTarget.style.transform='none'}}>{children}</button>
}

// ─── Tbl ──────────────────────────────────────────────────────────────────────
export function Tbl({headers, rows, T: TProp}) {
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

// ─── Alrt ─────────────────────────────────────────────────────────────────────
export function Alrt({type, children}) {
  const s={warn:{bg:'#2a1a08',color:'#c28c46',border:'#8a602c'},success:{bg:'#002010',color:'#4ade80',border:'#14532d'},info:{bg:'#050f28',color:'#7ab0e0',border:'#103060'},danger:{bg:'#2a0808',color:'#f87171',border:'#450a0a'}}[type]||{bg:'#261c17',color:'#a6968a',border:'#5c4a42'}
  return <div style={{background:s.bg,color:s.color,borderLeft:`3px solid ${s.border}`,padding:'10px 14px',borderRadius:4,fontSize:12,marginBottom:14,lineHeight:1.6,fontFamily:'var(--font-mono)',letterSpacing:'.5px'}}>{children}</div>
}

// ─── faseBadge ────────────────────────────────────────────────────────────────
export function faseBadge(f) {
  const m={bezerro:'info',garrote:'warn',boi:'gray',abatido:'gold'}
  return <Badge type={m[f]||'gray'}>{FASES[f]} · S{SEMANAS[f]}</Badge>
}

// ─── CountdownRing ────────────────────────────────────────────────────────────
export function CountdownRing({dataFase, T: TProp, size=48}) {
  const ctx = useTheme()
  const T = TProp || (ctx ? ctx.T : { border:'#36251e', gold:'#c28c46', textMuted:'#5c4a42' })

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

// ─── MiniChart ────────────────────────────────────────────────────────────────
export function MiniChart({data, color, T: TProp, height=48}) {
  const ctx = useTheme()
  const T = TProp || (ctx ? ctx.T : { textMuted:'#5c4a42' })

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
