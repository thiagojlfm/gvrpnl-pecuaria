import '../styles/globals.css'
import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { ThemeContext, AuthContext } from '../lib/context'
import { D, L, CSS } from '../lib/theme'
import { sounds } from '../lib/sounds'

/**
 * App — ponto de entrada único do Next.
 *
 * Responsabilidades:
 *   - Bootstrap de sessão (token/user vindos do localStorage)
 *   - Preferências persistidas (tema, som)
 *   - Cliente HTTP centralizado (api)
 *   - Sistema de notificação flutuante (notify + barra no AppShell)
 *   - Polling global de notificações do sidebar
 *   - Providers de Theme e Auth para todas as páginas
 *
 * Regra: páginas consomem via useTheme()/useAuth(). Nada de localStorage/fetch
 * de bootstrap espalhado nas páginas.
 */
export default function App({ Component, pageProps }) {
  const [dark, setDark]               = useState(true)
  const [soundOn, setSoundOn]         = useState(true)
  const [user, setUser]               = useState(null)
  const [token, setToken]             = useState(null)
  const [notifs, setNotifs]           = useState([])
  const [notification, setNotification] = useState('')
  const [notifType, setNotifType]     = useState('success')
  const T = dark ? D : L

  // ─── Bootstrap de localStorage (só client) ─────────────────────────────────
  useEffect(() => {
    const d = localStorage.getItem('gvrpnl_dark')
    if (d !== null) setDark(d === 'true')
    const s = localStorage.getItem('gvrpnl_sound')
    if (s !== null) setSoundOn(s === 'true')
    const t = localStorage.getItem('gvrpnl_token')
    const u = localStorage.getItem('gvrpnl_user')
    if (t && u) {
      try { setToken(t); setUser(JSON.parse(u)) } catch {}
    }
  }, [])

  // ─── Reflete tema no <html data-theme="..."> ───────────────────────────────
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    }
  }, [dark])

  // ─── Cliente HTTP: envia Bearer, faz logout em 401 ─────────────────────────
  const api = useCallback(async (path, opts = {}) => {
    const h = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    const r = await fetch(path, { ...opts, headers: h })
    if (r.status === 401) {
      localStorage.removeItem('gvrpnl_token')
      localStorage.removeItem('gvrpnl_user')
      if (typeof window !== 'undefined') window.location.reload()
      return {}
    }
    return r.json()
  }, [token])

  // ─── Notificação flutuante (a barra é renderizada pelo AppShell) ───────────
  const notify = useCallback((m, t = 'success') => {
    setNotification(m); setNotifType(t)
    if (soundOn) { t === 'success' ? sounds.success() : sounds.error() }
    setTimeout(() => setNotification(''), 4000)
  }, [soundOn])

  // ─── Polling global do sino de notificações ────────────────────────────────
  useEffect(() => {
    if (!token) { setNotifs([]); return }
    let cancel = false
    const fetchIt = () => api('/api/notificacoes').then(d => {
      if (!cancel && Array.isArray(d)) setNotifs(d)
    })
    fetchIt()
    const iv = setInterval(() => { if (!document.hidden) fetchIt() }, 60000)
    return () => { cancel = true; clearInterval(iv) }
  }, [token, api])

  const readNotif = useCallback(async (id) => {
    await api('/api/notificacoes', { method: 'PATCH', body: JSON.stringify({ id }) })
    setNotifs(n => id === 'all'
      ? n.map(x => ({ ...x, lida: true }))
      : n.map(x => x.id === id ? { ...x, lida: true } : x))
  }, [api])

  const toggleDark = useCallback(() => {
    setDark(d => { const nd = !d; localStorage.setItem('gvrpnl_dark', nd); return nd })
  }, [])
  const toggleSound = useCallback(() => {
    setSoundOn(s => { const ns = !s; localStorage.setItem('gvrpnl_sound', ns); return ns })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('gvrpnl_token')
    localStorage.removeItem('gvrpnl_user')
    setToken(null); setUser(null)
    if (typeof window !== 'undefined') window.location.href = '/'
  }, [])

  return (
    <>
      <Head>
        <title>GVRPNL — Pecuária</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <style dangerouslySetInnerHTML={{ __html: CSS }}/>
      </Head>
      <ThemeContext.Provider value={{ T, dark, setDark, toggleDark, soundOn, toggleSound }}>
        <AuthContext.Provider value={{
          user, setUser, token, setToken, api,
          notify, notification, notifType,
          notifs, setNotifs, readNotif,
          logout,
        }}>
          <Component {...pageProps} />
        </AuthContext.Provider>
      </ThemeContext.Provider>
    </>
  )
}
