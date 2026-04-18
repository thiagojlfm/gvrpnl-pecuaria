import { useState } from 'react'
import { useRouter } from 'next/router'
import { useTheme, useAuth } from '../lib/context'
import { NAV_ITEMS, Sidebar, Drawer, NotifBell } from './layout'
import { Btn } from './ui'

/**
 * AppShell — chrome visual compartilhado entre páginas.
 *
 * Renderiza header, sidebar (desktop), drawer (mobile) e a barra de notificação.
 * O conteúdo da página entra via `children`.
 *
 * @param {Object}   props
 * @param {string}   props.currentPage    — id do nav item ativo (ex.: 'mercado', 'lavoura')
 * @param {Function} props.setPage        — handler de clique em items da Sidebar/Drawer
 *                                          (a própria Sidebar lida com /lavoura via <Link>)
 * @param {Function} [props.onLoginClick] — override opcional do botão "Entrar"
 * @param {ReactNode} props.children      — conteúdo da página
 */
export default function AppShell({ currentPage, setPage, onLoginClick, children }) {
  const router = useRouter()
  const { T, dark, soundOn, toggleDark, toggleSound } = useTheme()
  const { user, logout, notifs, readNotif, notification, notifType } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogin = () => {
    if (onLoginClick) return onLoginClick()
    if (router.pathname === '/') return setPage('login')
    if (typeof window !== 'undefined') sessionStorage.setItem('gvrpnl_targetPage', 'login')
    router.push('/')
  }

  return (
    <div style={{display:'flex',height:'100vh',background:T.bg,color:T.text,overflow:'hidden'}}>
      {/* Desktop Sidebar */}
      <div className="desktop-only">
        <Sidebar page={currentPage} setPage={setPage} user={user} T={T} collapsed={sidebarCollapsed}/>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} page={currentPage} setPage={setPage} user={user} T={T}/>

      {/* Main column */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Header */}
        <div style={{background:T.navBg,borderBottom:`1px solid ${T.border}`,padding:'0 20px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button className="mobile-only" onClick={()=>setDrawerOpen(true)} style={{background:'none',border:`1px solid ${T.border2}`,borderRadius:8,padding:'6px 10px',cursor:'pointer',fontSize:18,color:T.text}}>☰</button>
            <div className="desktop-only" style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setSidebarCollapsed(!sidebarCollapsed)}>
              <div style={{width:34,height:34,borderRadius:8,overflow:'hidden',flexShrink:0}}>
                <img src="/logo.png" alt="GVRPNL" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:T.gold,letterSpacing:'.5px',lineHeight:1}}>GVRPNL</div>
                <div style={{fontSize:9,color:T.textMuted,letterSpacing:'1px',fontWeight:600}}>PECUÁRIA</div>
              </div>
            </div>
            <div className="mobile-only" style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:"'Playfair Display',serif"}}>
              {NAV_ITEMS.find(n=>n.id===currentPage)?.icon} {NAV_ITEMS.find(n=>n.id===currentPage)?.label}
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
            </>:<Btn onClick={handleLogin} T={T} style={{padding:'7px 16px'}}>Entrar</Btn>}
          </div>
        </div>

        {/* Barra de notificação flutuante */}
        {notification&&<div style={{background:notifType==='success'?'#011a08':'#1a0404',color:notifType==='success'?T.green:'#f87171',padding:'10px 20px',fontSize:13,textAlign:'center',borderBottom:`1px solid ${notifType==='success'?T.greenDark:'#450a0a'}`,fontWeight:500,fontFamily:"'DM Mono',monospace",animation:'fadeIn .3s ease'}}>{notification}</div>}

        {/* Page content slot */}
        <div style={{flex:1,overflowY:'auto',padding:'24px 24px',maxWidth:1200,width:'100%',margin:'0 auto',boxSizing:'border-box'}}>
          {children}
        </div>
      </div>
    </div>
  )
}
