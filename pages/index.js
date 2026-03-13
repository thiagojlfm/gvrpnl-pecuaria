import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import Image from 'next/image'

const FASES = { bezerro: 'Bezerro', garrote: 'Garrote', boi: 'Boi', abatido: 'Boi abatido' }
const PESOS = { bezerro: 180, garrote: 400, boi: 540, abatido: 648 }
const SEMANAS = { bezerro: 1, garrote: 2, boi: 3, abatido: 4 }

const C = {
  bg: '#0a0c07', card: '#111608', border: '#1e2a12', border2: '#2a3a1a',
  green: '#7ab648', greenDark: '#4a7a1e', gold: '#c8a832', goldDark: '#8a6e1a',
  text: '#d4d8c8', textDim: '#7a8a6a', textMuted: '#4a5a3a',
  red: '#c84040', amber: '#c87820', purple: '#8060c0',
}

const fmt = n => Number(n || 0).toLocaleString('pt-BR')

// ─── Primitives ──────────────────────────────────────────────────────────────

function Badge({ type, children }) {
  const s = {
    ok: ['#1a3a0a','#7ab648','#2a5a12'], warn: ['#3a2a00','#c8a832','#6a5010'],
    info: ['#0a1a3a','#4a90d0','#1a3a6a'], gray: ['#1a1e14','#7a8a6a','#2a3a1a'],
    purple: ['#1a1230','#a080e0','#3a2a60'], danger: ['#3a0a0a','#e06060','#6a1a1a'],
    amber: ['#3a2000','#e09030','#6a3a00'], red: ['#3a0a0a','#e06060','#6a1a1a'],
  }[type] || ['#1a1e14','#7a8a6a','#2a3a1a']
  return <span style={{ background: s[0], color: s[1], border: `1px solid ${s[2]}`, fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block', letterSpacing: '.3px' }}>{children}</span>
}

function Card({ children, style, glow }) {
  return <div style={{ background: C.card, border: `1px solid ${glow ? C.border2 : C.border}`, borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: glow ? '0 0 20px rgba(74,122,30,.15)' : '0 2px 8px rgba(0,0,0,.4)', ...style }}>{children}</div>
}

function Metric({ label, value, sub, color }) {
  return (
    <div style={{ background: '#0d1009', borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || C.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function Inp({ label, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px' }}>{label}</label>}
      <input {...props} style={{ background: '#0d1009', border: `1px solid ${C.border2}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.text, fontFamily: 'inherit', outline: 'none', ...props.style }} />
    </div>
  )
}

function Sel({ label, children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px' }}>{label}</label>}
      <select {...props} style={{ background: '#0d1009', border: `1px solid ${C.border2}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.text, fontFamily: 'inherit', outline: 'none' }}>{children}</select>
    </div>
  )
}

function Btn({ children, onClick, v = 'primary', style, disabled }) {
  const base = { border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', padding: '9px 18px', fontFamily: 'inherit', opacity: disabled ? 0.5 : 1, transition: 'all .15s', letterSpacing: '.2px' }
  const vars = {
    primary: { background: `linear-gradient(135deg,${C.greenDark},${C.green})`, color: '#fff', boxShadow: '0 2px 8px rgba(74,122,30,.4)' },
    ghost: { background: 'transparent', border: `1px solid ${C.border2}`, color: C.textDim },
    danger: { background: '#4a1010', color: '#e06060', border: '1px solid #6a1a1a' },
    amber: { background: '#4a2800', color: '#e09030', border: '1px solid #6a3a00' },
    purple: { background: '#281840', color: '#a080e0', border: '1px solid #3a2a60' },
    gold: { background: `linear-gradient(135deg,${C.goldDark},${C.gold})`, color: '#fff' },
    red: { background: '#3a0808', color: '#e06060', border: '1px solid #6a1a1a' },
  }
  return <button style={{ ...base, ...vars[v], ...style }} onClick={onClick} disabled={disabled}>{children}</button>
}

function Tbl({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr>{headers.map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: C.textMuted, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>{row.map((cell, j) => <td key={j} style={{ padding: '10px 12px', color: C.text, verticalAlign: 'middle' }}>{cell}</td>)}</tr>)}
          {rows.length === 0 && <tr><td colSpan={headers.length} style={{ padding: 24, textAlign: 'center', color: C.textMuted }}>Nenhum registro</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function Alert({ type, children }) {
  const s = { warn: ['#2a1e00','#c8a832','#6a5010'], success: ['#0a2010','#7ab648','#2a5a12'], info: ['#051020','#4a90d0','#1a3a6a'], danger: ['#2a0808','#e06060','#6a1a1a'] }[type] || ['#1a1e14',C.textDim,C.border]
  return <div style={{ background: s[0], color: s[1], borderLeft: `3px solid ${s[2]}`, padding: '10px 16px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{children}</div>
}

function Title({ t, s }) {
  return <div style={{ marginBottom: 20 }}><div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 3 }}>{t}</div>{s && <div style={{ fontSize: 13, color: C.textMuted }}>{s}</div>}</div>
}

function faseBadge(f) {
  const m = { bezerro: 'info', garrote: 'warn', boi: 'gray', abatido: 'ok' }
  return <Badge type={m[f] || 'gray'}>{FASES[f] || f} · sem. {SEMANAS[f]}</Badge>
}

function diasRest(d) {
  if (!d) return '—'
  const diff = Math.ceil((new Date(d) - new Date()) / 86400000)
  if (diff <= 0) return <Badge type="ok">Pronto!</Badge>
  if (diff <= 2) return <span style={{ color: '#e09030', fontWeight: 600 }}>{diff}d ⚠</span>
  return `${diff} dias`
}

// ─── Chat Lateral ────────────────────────────────────────────────────────────

function ChatPanel({ anuncio, user, token, onClose }) {
  const [msgs, setMsgs] = useState([])
  const [txt, setTxt] = useState('')
  const [lastId, setLastId] = useState(0)
  const lastIdRef = useRef(0)
  const bottomRef = useRef(null)

  const fetchMsgs = useCallback(async (since = 0) => {
    if (!anuncio?.id) return
    try {
      const h = { 'Content-Type': 'application/json' }
      if (token) h['Authorization'] = `Bearer ${token}`
      const r = await fetch(`/api/chat?anuncio_id=${anuncio.id}&since=${since}`, { headers: h })
      if (!r.ok) return
      const data = await r.json()
      if (Array.isArray(data) && data.length) {
        setMsgs(prev => {
          const ids = new Set(prev.map(m => m.id))
          const novos = data.filter(m => !ids.has(m.id))
          if (!novos.length) return prev
          const merged = [...prev, ...novos]
          const newLastId = merged[merged.length - 1]?.id || 0
          lastIdRef.current = newLastId
          setLastId(newLastId)
          return merged
        })
      }
    } catch(e) { console.error('chat fetch error', e) }
  }, [anuncio?.id, token])

  useEffect(() => {
    lastIdRef.current = 0
    setLastId(0)
    setMsgs([])
    fetchMsgs(0)
    const iv = setInterval(() => fetchMsgs(lastIdRef.current), 3000)
    return () => clearInterval(iv)
  }, [fetchMsgs])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send() {
    if (!txt.trim() || !user) return
    const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    await fetch('/api/chat', { method: 'POST', headers: h, body: JSON.stringify({ anuncio_id: anuncio.id, mensagem: txt.trim() }) })
    setTxt('')
    fetchMsgs(lastIdRef.current)
  }

  async function deletMsg(id) {
    const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    await fetch('/api/chat', { method: 'DELETE', headers: h, body: JSON.stringify({ id }) })
    setMsgs(m => m.filter(x => x.id !== id))
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 340, height: '100vh', background: '#0d1209', borderLeft: `1px solid ${C.border2}`, zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,.6)' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, background: '#0a0f06' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>💬 Negociação</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: 11, color: C.textMuted }}>
          {faseBadge(anuncio.fase)} &nbsp;{anuncio.quantidade} cab. &nbsp;
          <span style={{ color: C.gold, fontWeight: 700 }}>${fmt(anuncio.preco_pedido)}</span>
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>Vendedor: <span style={{ color: C.text }}>{anuncio.vendedor_nome}</span></div>
      </div>

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 40 }}>Seja o primeiro a fazer uma oferta!</div>}
        {msgs.map(m => {
          const isMine = m.jogador_nome === user?.username
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: isMine ? C.green : C.textDim, fontWeight: 600 }}>{m.jogador_nome}</span>
                <span>{new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                {user?.role === 'admin' && <button onClick={() => deletMsg(m.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 10, padding: 0 }}>✕</button>}
              </div>
              <div style={{ background: isMine ? '#1a3a0a' : '#181e10', border: `1px solid ${isMine ? C.border2 : C.border}`, borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '8px 12px', fontSize: 13, color: C.text, maxWidth: '85%', lineHeight: 1.5 }}>
                {m.mensagem}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {user ? (
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, background: '#0a0f06', display: 'flex', gap: 8 }}>
          <input
            value={txt}
            onChange={e => setTxt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Faça sua oferta..."
            style={{ flex: 1, background: '#0d1009', border: `1px solid ${C.border2}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.text, fontFamily: 'inherit', outline: 'none' }}
          />
          <Btn onClick={send} style={{ padding: '9px 14px' }}>→</Btn>
        </div>
      ) : (
        <div style={{ padding: 14, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted, textAlign: 'center' }}>Faça login para enviar ofertas</div>
      )}
    </div>
  )
}

// ─── Animal Card ─────────────────────────────────────────────────────────────

function AnimalCard({ fase, mercado }) {
  const imgs = { bezerro: '/bezerro.jpg', garrote: '/garrote.jpg', boi: '/boi.jpg', abatido: '/boi.jpg' }
  const precoMap = { bezerro: mercado?.precos?.bezerro, garrote: mercado?.precos?.garrote, boi: mercado?.precos?.boi, abatido: mercado?.precos?.abate }
  const origem = { bezerro: 'Gov. NPC — fixo', garrote: 'Livre entre jogadores', boi: 'Livre entre jogadores', abatido: 'Frigorífico NPC' }
  const badgeT = { bezerro: 'info', garrote: 'purple', boi: 'gray', abatido: 'ok' }
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.4)' }}>
      <div style={{ height: 130, overflow: 'hidden', position: 'relative', background: '#0a0c07' }}>
        <img src={imgs[fase]} alt={FASES[fase]} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.8) saturate(.9)' }} onError={e => e.target.style.display='none'} />
        <div style={{ position: 'absolute', top: 8, left: 8 }}><Badge type={badgeT[fase]}>Semana {SEMANAS[fase]}</Badge></div>
        {fase === 'abatido' && <div style={{ position: 'absolute', top: 8, right: 8 }}><Badge type="ok">🥩 Abate</Badge></div>}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>{FASES[fase]}</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>{PESOS[fase]} kg vivo</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: fase === 'abatido' ? C.green : C.text }}>${fmt(precoMap[fase])}</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{origem[fase]}</div>
      </div>
    </div>
  )
}

// ─── Logo ────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <img src="/logo.png" alt="GVRPNL" style={{ width: 40, height: 40, objectFit: 'cover' }} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.green, letterSpacing: '.5px', lineHeight: 1 }}>GVRPNL</div>
        <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '1px', fontWeight: 600 }}>PECUÁRIA</div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState('mercado')
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [authTab, setAuthTab] = useState('login')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginErr, setLoginErr] = useState('')
  const [regForm, setRegForm] = useState({ username: '', password: '', fazenda: '' })
  const [regErr, setRegErr] = useState('')
  const [regOk, setRegOk] = useState(false)
  const [mercado, setMercado] = useState(null)
  const [lotes, setLotes] = useState([])
  const [anuncios, setAnuncios] = useState([])
  const [trans, setTrans] = useState([])
  const [users, setUsers] = useState([])
  const [solic, setSolic] = useState([])
  const [racao, setRacao] = useState(null)
  const [msg, setMsg] = useState('')
  const [msgT, setMsgT] = useState('success')
  const [chatAnuncio, setChatAnuncio] = useState(null)
  const [compraQt, setCompraQt] = useState(1)
  const [compraComp, setCompraComp] = useState('')
  const [compraStep, setCompraStep] = useState(1)
  const [confirmReset, setConfirmReset] = useState(false)
  const [nLote, setNLote] = useState({ jogador_id:'', jogador_nome:'', fazenda:'', quantidade:1, valor_compra:1100, data_compra:'', comprovante:'' })
  const [nUser, setNUser] = useState({ username:'', password:'', fazenda:'' })
  const [nAnuncio, setNAnuncio] = useState({ lote_id:'', preco_pedido:'', obs:'' })
  const [p2p, setP2p] = useState({ anuncio_id:'', comprador_nome:'', preco_final:'', lote_id:'' })
  const [nRacao, setNRacao] = useState({ jogador_id:'', kg:'', valor:'' })

  const api = useCallback(async (path, opts = {}) => {
    const h = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    const r = await fetch(path, { ...opts, headers: h })
    return r.json()
  }, [token])

  useEffect(() => {
    const t = localStorage.getItem('gvrpnl_token')
    const u = localStorage.getItem('gvrpnl_user')
    if (t && u) { setToken(t); setUser(JSON.parse(u)) }
  }, [])

  useEffect(() => { fetch('/api/mercado').then(r => r.json()).then(setMercado) }, [])

  const reload = useCallback(() => {
    if (!token) return
    api('/api/lotes').then(setLotes)
    api('/api/anuncios').then(setAnuncios)
    api('/api/transacoes').then(setTrans)
    api('/api/solicitacoes').then(setSolic)
    api('/api/racao').then(setRacao)
    if (user?.role === 'admin') api('/api/admin/usuarios').then(setUsers)
  }, [token, api, user])

  useEffect(() => { reload() }, [reload])

  const notify = (m, t = 'success') => { setMsg(m); setMsgT(t); setTimeout(() => setMsg(''), 4000) }

  async function login() {
    setLoginErr('')
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginForm) })
    const d = await r.json()
    if (d.error) return setLoginErr(d.error)
    localStorage.setItem('gvrpnl_token', d.token)
    localStorage.setItem('gvrpnl_user', JSON.stringify(d.user))
    setToken(d.token); setUser(d.user)
    setPage(d.user.role === 'admin' ? 'admin' : 'rebanho')
  }

  async function register() {
    setRegErr('')
    const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(regForm) })
    const d = await r.json()
    if (d.error) return setRegErr(d.error)
    setRegOk(true)
  }

  function logout() {
    localStorage.removeItem('gvrpnl_token'); localStorage.removeItem('gvrpnl_user')
    setToken(null); setUser(null); setPage('mercado')
  }

  function calcCot(qty) {
    if (!mercado || !qty) return null
    const { precos } = mercado
    const custoBezerros = qty * precos.bezerro
    const custoFrete = qty * precos.frete
    const custoRacao = qty * precos.racaoPorCabeca * precos.precoRacao
    const total = custoBezerros + custoFrete + custoRacao
    const receita = qty * precos.abate
    const margem = ((receita - total) / receita * 100).toFixed(1)
    return { custoBezerros, custoFrete, custoRacao, total, receita, margem, qty }
  }

  async function enviarSolic() {
    if (!compraComp) return notify('Cole o link do comprovante!', 'warn')
    const cot = calcCot(compraQt)
    const r = await api('/api/solicitacoes', { method: 'POST', body: JSON.stringify({ quantidade: compraQt, valor_total: cot.total, custo_racao: cot.custoRacao, comprovante: compraComp }) })
    if (r.error) return notify('Erro: ' + r.error, 'danger')
    setCompraStep(3); api('/api/solicitacoes').then(setSolic)
  }

  async function resetRebanho() {
    const r = await api('/api/admin/reset', { method: 'POST', body: JSON.stringify({ tipo: 'rebanho_completo' }) })
    if (r.ok) { notify('✓ Rebanho resetado!'); reload(); setConfirmReset(false) }
  }

  async function deletarLote(id) {
    const r = await api('/api/admin/reset', { method: 'POST', body: JSON.stringify({ tipo: 'lote', lote_id: id }) })
    if (r.ok) { notify('Lote removido.'); api('/api/lotes').then(setLotes) }
  }

  const meusLotes = user?.role === 'admin' ? lotes : lotes.filter(l => l.jogador_id === user?.id)
  const abatesPend = lotes.filter(l => l.status === 'aguardando_pagamento')
  const solicPend = solic.filter(s => s.status === 'pendente')
  const usersPend = users.filter(u => u.status === 'pendente')
  const consumoDiario = meusLotes.filter(l => l.status === 'ativo').reduce((s, l) => s + ({ bezerro:3, garrote:5, boi:8, abatido:0 }[l.fase] || 0) * l.quantidade, 0)
  const diasRacaoLeft = racao?.kg_disponivel > 0 && consumoDiario > 0 ? Math.floor(racao.kg_disponivel / consumoDiario) : null
  const cot = calcCot(compraQt)

  // Nome da operação amigável
  function tipoLabel(tipo) {
    return { abate: 'Abate Frigorífico', p2p: 'Venda entre jogadores', compra_racao: 'Compra de Ração', compra_npc: 'Compra Gov. NPC' }[tipo] || tipo
  }

  const nav = [
    { id: 'mercado', label: '📈 Mercado', pub: true },
    { id: 'comprar', label: '🛒 Comprar', pub: false },
    { id: 'rebanho', label: '🐄 Meu rebanho', pub: false },
    { id: 'p2p', label: '🤝 Venda', pub: false },
    { id: 'admin', label: '⚙️ Admin', pub: false, admin: true },
    { id: 'hist', label: '📋 Histórico', pub: false, admin: true },
  ]

  return (
    <>
      <Head>
        <title>GVRPNL — Pecuária</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* Chat lateral */}
      {chatAnuncio && <ChatPanel anuncio={chatAnuncio} user={user} token={token} onClose={() => setChatAnuncio(null)} />}

      <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background: C.bg, minHeight: '100vh', color: C.text, marginRight: chatAnuncio ? 340 : 0, transition: 'margin-right .25s' }}>

        {/* Topbar */}
        <div style={{ background: '#0c1408', borderBottom: `1px solid ${C.border}`, padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <Logo />
          <div style={{ display: 'flex', gap: 2 }}>
            {nav.filter(n => n.pub || user).filter(n => !n.admin || user?.role === 'admin').map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ background: page===n.id ? 'rgba(122,182,72,.15)' : 'transparent', border: page===n.id ? `1px solid ${C.border2}` : '1px solid transparent', color: page===n.id ? C.green : C.textMuted, fontSize: 13, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: page===n.id ? 600 : 400, transition: 'all .15s' }}>{n.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user ? <>
              <div style={{ fontSize: 12, color: C.textMuted, textAlign: 'right' }}>
                <div style={{ color: C.text, fontWeight: 600 }}>{user.username}</div>
                <div>{user.fazenda ? `Faz. ${user.fazenda}` : user.role}</div>
              </div>
              <Btn v="ghost" onClick={logout} style={{ padding: '5px 12px', fontSize: 12 }}>Sair</Btn>
            </> : <Btn onClick={() => setPage('login')} style={{ padding: '6px 14px' }}>Entrar</Btn>}
          </div>
        </div>

        {msg && <div style={{ background: msgT==='success' ? '#0a2010' : '#2a0808', color: msgT==='success' ? C.green : '#e06060', padding: '10px 24px', fontSize: 13, textAlign: 'center', borderBottom: `1px solid ${msgT==='success' ? C.border2 : '#6a1a1a'}`, fontWeight: 500 }}>{msg}</div>}

        <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>

          {/* ── LOGIN / CADASTRO ── */}
          {(page === 'login' || page === 'cadastro') && !user && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
              <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 16, padding: 36, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 14, overflow: 'hidden', margin: '0 auto 12px', boxShadow: '0 4px 16px rgba(0,0,0,.5)' }}>
                    <img src="/logo.png" alt="GVRPNL" style={{ width: 64, height: 64, objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>GVRPNL</div>
                  <div style={{ fontSize: 12, color: C.textMuted, letterSpacing: '1px', fontWeight: 600 }}>SISTEMA DE PECUÁRIA</div>
                </div>
                <div style={{ display: 'flex', marginBottom: 24, background: '#0d1009', borderRadius: 10, padding: 4 }}>
                  {['login','cadastro'].map(t => (
                    <button key={t} onClick={() => { setAuthTab(t); setPage(t); setLoginErr(''); setRegErr(''); setRegOk(false) }} style={{ flex: 1, background: authTab===t ? 'linear-gradient(135deg,#2a4a10,#3a6a18)' : 'transparent', border: 'none', color: authTab===t ? C.green : C.textMuted, fontSize: 13, padding: '7px 0', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontWeight: authTab===t ? 600 : 400 }}>
                      {t === 'login' ? 'Entrar' : 'Cadastrar'}
                    </button>
                  ))}
                </div>
                {authTab === 'login' ? <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                    <Inp label="Usuário" value={loginForm.username} onChange={e => setLoginForm(f => ({...f, username: e.target.value}))} placeholder="seu_usuario" />
                    <Inp label="Senha" type="password" value={loginForm.password} onChange={e => setLoginForm(f => ({...f, password: e.target.value}))} placeholder="••••••" onKeyDown={e => e.key==='Enter' && login()} />
                  </div>
                  {loginErr && <Alert type="danger">{loginErr}</Alert>}
                  <Btn onClick={login} style={{ width: '100%', padding: 11, fontSize: 14 }}>Entrar no servidor</Btn>
                </> : regOk ? (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                    <div style={{ fontSize: 15, color: C.green, fontWeight: 700, marginBottom: 8 }}>Cadastro enviado!</div>
                    <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>Aguarde o admin aprovar sua conta.</div>
                    <Btn v="ghost" onClick={() => { setRegOk(false); setAuthTab('login'); setPage('login') }} style={{ marginTop: 16, width: '100%' }}>Ir para login</Btn>
                  </div>
                ) : <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                    <Inp label="Usuário" value={regForm.username} onChange={e => setRegForm(f => ({...f, username: e.target.value}))} placeholder="nome_no_servidor" />
                    <Inp label="Senha" type="password" value={regForm.password} onChange={e => setRegForm(f => ({...f, password: e.target.value}))} placeholder="mínimo 6 caracteres" />
                    <Inp label="Fazenda (opcional)" value={regForm.fazenda} onChange={e => setRegForm(f => ({...f, fazenda: e.target.value}))} placeholder="Ex: 0325" />
                  </div>
                  {regErr && <Alert type="danger">{regErr}</Alert>}
                  <Btn onClick={register} style={{ width: '100%', padding: 11, fontSize: 14 }}>Solicitar cadastro</Btn>
                  <div style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 12 }}>O admin irá aprovar seu acesso</div>
                </>}
              </div>
            </div>
          )}

          {/* ── MERCADO ── */}
          {page === 'mercado' && (
            <>
              <Title t="📈 Mercado — Pecuária" s="Preços dinâmicos baseados no rebanho ativo do servidor" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
                {['bezerro','garrote','boi','abatido'].map(f => <AnimalCard key={f} fase={f} mercado={mercado} />)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card glow>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Indicadores agora {mercado && <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>· ${mercado.precos.precoKg}/kg · Ração ${mercado.precos.precoRacao}/kg</span>}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Metric label="Rebanho total" value={`${mercado?.rebanho?.total||0} cab.`} color={mercado?.rebanho?.total>600?'#e06060':mercado?.rebanho?.total>400?C.gold:C.green} sub={mercado?.rebanho?.total>600?'ração +50%':mercado?.rebanho?.total>400?'ração +20%':'preço base'} />
                    <Metric label="Margem estimada" value={`${mercado?.margem||'~30'}%`} sub="bezerro → abate" color={C.green} />
                    <Metric label="Preço ração" value={`$${mercado?.precos?.precoRacao||2}/kg`} sub={`${mercado?.precos?.racaoPorCabeca||112}kg/cabeça`} />
                    <Metric label="Custo ração/cab" value={`$${fmt(mercado?.precos?.custoRacao)}`} sub="ciclo completo" />
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Rebanho por fase</div>
                  {['bezerro','garrote','boi'].map(f => {
                    const qty = mercado?.rebanho?.[f]||0
                    return <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span style={{ color: C.textMuted, fontSize: 12, minWidth: 80, fontWeight: 500 }}>{FASES[f]}</span>
                      <div style={{ flex: 1, background: '#0d1009', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min((qty/150)*100,100)}%`, height: '100%', background: `linear-gradient(90deg,${C.greenDark},${C.green})`, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, color: C.textDim, minWidth: 55, textAlign: 'right' }}>{qty} cab.</span>
                    </div>
                  })}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: C.textMuted }}>Limite ração normal: 400 cab.</span>
                    <Badge type={mercado?.rebanho?.total>600?'red':mercado?.rebanho?.total>400?'warn':'ok'}>{mercado?.rebanho?.total>600?'Ração cara':mercado?.rebanho?.total>400?'Ração elevada':'Preço base'}</Badge>
                  </div>
                </Card>
              </div>
              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Margem por ponto de entrada</div>
                <Tbl headers={['Entra em','Custo total (c/ ração)','Receita abate','Margem est.']}
                  rows={mercado ? [
                    ['Bezerro', `$${fmt(mercado.precos.bezerro + mercado.precos.frete + mercado.precos.custoRacao)}`, <span style={{color:C.green,fontWeight:700}}>${fmt(mercado.precos.abate)}</span>, <Badge type="ok">~{mercado.margem}%</Badge>],
                    ['Garrote', `$${fmt(mercado.precos.garrote)}+`, <span style={{color:C.green,fontWeight:700}}>${fmt(mercado.precos.abate)}</span>, <Badge type="warn">~10–20%</Badge>],
                    ['Boi', `$${fmt(mercado.precos.boi)}+`, <span style={{color:C.green,fontWeight:700}}>${fmt(mercado.precos.abate)}</span>, <Badge type="gray">~5–15%</Badge>],
                  ] : []} />
              </Card>
            </>
          )}

          {/* ── COMPRAR ── */}
          {page === 'comprar' && !user && <Alert type="warn">Faça login para solicitar uma compra.</Alert>}
          {page === 'comprar' && user && (
            <>
              <Title t="🛒 Comprar Bezerros" s="Simule sua compra — o sistema calcula tudo automaticamente" />
              {compraStep === 3 ? (
                <Card style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.green, marginBottom: 8 }}>Solicitação enviada!</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24, lineHeight: 1.7 }}>O admin irá verificar seu comprovante. Seu lote aparecerá no rebanho após aprovação.</div>
                  <Btn onClick={() => { setCompraStep(1); setCompraComp(''); setCompraQt(1) }}>Nova cotação</Btn>
                </Card>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Card glow>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 18 }}>{compraStep===1 ? '1. Simule sua compra' : '2. Pague e envie comprovante'}</div>
                    {compraStep===1 && <>
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 10 }}>Quantos bezerros?</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <button onClick={() => setCompraQt(Math.max(1,compraQt-1))} style={{ width: 38, height: 38, borderRadius: 8, background: C.border, border: 'none', color: C.text, fontSize: 20, cursor: 'pointer' }}>−</button>
                          <input type="number" value={compraQt} onChange={e => setCompraQt(Math.max(1,parseInt(e.target.value)||1))} style={{ width: 80, textAlign: 'center', background: '#0d1009', border: `1px solid ${C.border2}`, borderRadius: 8, padding: '8px', fontSize: 22, color: C.text, fontFamily: 'inherit', fontWeight: 700, outline: 'none' }} />
                          <button onClick={() => setCompraQt(compraQt+1)} style={{ width: 38, height: 38, borderRadius: 8, background: C.border, border: 'none', color: C.text, fontSize: 20, cursor: 'pointer' }}>+</button>
                        </div>
                      </div>
                      {cot && <>
                        <div style={{ background: '#0d1009', borderRadius: 10, padding: 16, marginBottom: 16, border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Breakdown</div>
                          {[
                            [`${cot.qty}× Bezerro ($${fmt(mercado.precos.bezerro)}/cab)`, cot.custoBezerros],
                            [`Frete ($50/cab)`, cot.custoFrete],
                            [`Ração (${mercado.precos.racaoPorCabeca}kg × ${cot.qty} × $${mercado.precos.precoRacao}/kg)`, cot.custoRacao],
                          ].map(([l,v]) => (
                            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: C.textDim }}>
                              <span>{l}</span><span>${fmt(v)}</span>
                            </div>
                          ))}
                          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                            <span>Total</span><span style={{ color: C.gold }}>${fmt(cot.total)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                          <Metric label="Receita est." value={`$${fmt(cot.receita)}`} color={C.green} />
                          <Metric label="Margem est." value={`${cot.margem}%`} color={Number(cot.margem)>20?C.green:Number(cot.margem)>10?C.gold:'#e06060'} />
                        </div>
                        <Btn onClick={() => setCompraStep(2)} style={{ width: '100%', padding: 12, fontSize: 14 }}>Tenho interesse — pagar ${fmt(cot.total)}</Btn>
                      </>}
                    </>}
                    {compraStep===2 && cot && <>
                      <Alert type="info">Pague <strong>${fmt(cot.total)}</strong> no servidor e cole o link do comprovante.</Alert>
                      <div style={{ background: '#0d1009', borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: C.textMuted }}>Total</span><span style={{ fontWeight: 700, color: C.gold }}>${fmt(cot.total)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: C.textMuted }}>Margem est.</span><span style={{ fontWeight: 600, color: C.green }}>{cot.margem}%</span>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <Inp label="Link do comprovante (Discord)" value={compraComp} onChange={e => setCompraComp(e.target.value)} placeholder="https://discord.com/channels/..." />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <Btn v="ghost" onClick={() => setCompraStep(1)} style={{ flex: 1 }}>Voltar</Btn>
                        <Btn onClick={enviarSolic} style={{ flex: 2, padding: 12 }}>Enviar solicitação</Btn>
                      </div>
                    </>}
                  </Card>
                  <Card>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Minhas solicitações</div>
                    <Tbl headers={['Data','Qtd','Total','Status']}
                      rows={solic.map(s => [
                        new Date(s.criado_em).toLocaleDateString('pt-BR'),
                        `${s.quantidade} cab.`, `$${fmt(s.valor_total)}`,
                        <Badge type={s.status==='aprovado'?'ok':s.status==='recusado'?'danger':'warn'}>
                          {s.status==='aprovado'?'✓ Aprovado':s.status==='recusado'?'✗ Recusado':'⏳ Pendente'}
                        </Badge>
                      ])} />
                  </Card>
                </div>
              )}
            </>
          )}

          {/* ── MEU REBANHO ── */}
          {page === 'rebanho' && !user && <Alert type="warn">Faça login para ver seu rebanho.</Alert>}
          {page === 'rebanho' && user && (
            <>
              <Title t="🐄 Meu Rebanho" s={`${user.username}${user.fazenda?` · Fazenda ${user.fazenda}`:''}`} />
              {diasRacaoLeft !== null && diasRacaoLeft <= 3 && <Alert type="danger">⚠ Ração acabando! Estoque para {diasRacaoLeft} dia(s) — consumo atual: {consumoDiario}kg/dia.</Alert>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
                <Metric label="Total cabeças" value={meusLotes.filter(l=>['ativo','aguardando_pagamento'].includes(l.status)).reduce((s,l)=>s+l.quantidade,0)} />
                <Metric label="Estoque ração" value={`${fmt(racao?.kg_disponivel||0)} kg`} sub={diasRacaoLeft!==null?`${diasRacaoLeft} dias restantes`:'sem gado ativo'} color={diasRacaoLeft!==null&&diasRacaoLeft<=3?'#e06060':C.green} />
                <Metric label="Consumo/dia" value={`${consumoDiario} kg`} sub="todos os lotes ativos" />
                <Metric label="Receita est." value={`$${fmt(meusLotes.filter(l=>l.fase==='abatido'&&l.status==='ativo').reduce((s,l)=>s+(mercado?.precos?.abate||0)*l.quantidade,0))}`} color={C.green} />
              </div>
              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Lotes ativos</div>
                <Tbl headers={['Lote','Qtd','Fase','Peso','Pronto em','Consumo/dia','Valor ref.','Status','']}
                  rows={meusLotes.map(l => {
                    const cons = ({bezerro:3,garrote:5,boi:8,abatido:0}[l.fase]||0)*l.quantidade
                    return [
                      <span style={{fontWeight:700}}>{l.codigo}</span>,
                      l.quantidade, faseBadge(l.fase), `${l.peso_kg}kg`, diasRest(l.data_fase4),
                      <span style={{color:cons>0?C.gold:C.textMuted}}>{cons}kg/dia</span>,
                      <span style={{color:C.green,fontWeight:600}}>${fmt((mercado?.precos?.abate||0)*l.quantidade)}</span>,
                      <Badge type={l.status==='ativo'?'gray':l.status==='aguardando_pagamento'?'amber':l.status==='pago'?'ok':'purple'}>{l.status==='ativo'?'Ativo':l.status==='aguardando_pagamento'?'Aguard. addmoney':l.status==='pago'?'Pago':'Vendido'}</Badge>,
                      l.fase==='abatido'&&l.status==='ativo'
                        ? <Btn onClick={async()=>{const r=await api(`/api/lotes/${l.id}`,{method:'PATCH',body:JSON.stringify({action:'solicitar_abate',preco_kg:mercado?.precos?.precoKg||5})});if(!r.error){notify('Abate solicitado!');api('/api/lotes').then(setLotes)}}} style={{padding:'4px 10px',fontSize:11}}>Solicitar abate</Btn>
                        : l.status==='aguardando_pagamento' ? <Badge type="amber">Aguard.</Badge>
                        : l.status==='pago' ? <Badge type="ok">✓ Pago</Badge>
                        : <Btn v="purple" onClick={()=>{setNAnuncio(f=>({...f,lote_id:l.id}));setPage('p2p')}} style={{padding:'4px 10px',fontSize:11}}>Anunciar</Btn>
                    ]
                  })} />
              </Card>
            </>
          )}

          {/* ── VENDA (P2P) ── */}
          {page === 'p2p' && (
            <>
              <Title t="🤝 Venda entre Jogadores" s="Garrotes e bois · preço livre · negocie no chat ao vivo" />
              <Alert type="info">Clique em <strong>💬 Negociar</strong> para abrir o chat ao vivo do anúncio.</Alert>
              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Animais à venda</div>
                <Tbl headers={['Vendedor','Fazenda','Fase','Qtd','Peso','Preço','Obs','']}
                  rows={anuncios.filter(a=>a.status==='ativo').map(a => [
                    <span style={{fontWeight:600}}>{a.vendedor_nome}</span>,
                    a.fazenda||'—', faseBadge(a.fase), a.quantidade, `${a.peso_kg}kg`,
                    <span style={{fontWeight:700,color:C.gold}}>${fmt(a.preco_pedido)}</span>,
                    a.obs||'—',
                    <Btn v="purple" style={{padding:'5px 12px',fontSize:12}} onClick={()=>setChatAnuncio(a)}>💬 Negociar</Btn>
                  ])} />
              </Card>
              {user && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Card>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Anunciar meu animal</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <Sel label="Lote" value={nAnuncio.lote_id} onChange={e=>setNAnuncio(f=>({...f,lote_id:e.target.value}))}>
                        <option value="">Selecione...</option>
                        {meusLotes.filter(l=>l.status==='ativo'&&l.fase!=='bezerro'&&l.fase!=='abatido').map(l=><option key={l.id} value={l.id}>{l.codigo} — {FASES[l.fase]} ({l.quantidade} cab.)</option>)}
                      </Sel>
                      <Inp label="Preço ($)" type="number" value={nAnuncio.preco_pedido} onChange={e=>setNAnuncio(f=>({...f,preco_pedido:e.target.value}))} placeholder="1800" />
                      <Inp label="Obs" value={nAnuncio.obs} onChange={e=>setNAnuncio(f=>({...f,obs:e.target.value}))} placeholder="Negociável..." style={{gridColumn:'1/-1'}} />
                    </div>
                    <Btn onClick={async()=>{const l=lotes.find(x=>x.id===nAnuncio.lote_id);if(!l)return notify('Selecione um lote','warn');const r=await api('/api/anuncios',{method:'POST',body:JSON.stringify({...nAnuncio,lote_codigo:l.codigo,fase:l.fase,quantidade:l.quantidade,peso_kg:l.peso_kg})});if(!r.error){notify('✓ Anúncio publicado!');api('/api/anuncios').then(setAnuncios)}}}>Publicar anúncio</Btn>
                  </Card>
                  {user?.role==='admin' && (
                    <Card>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Registrar venda <Badge type="amber">Admin</Badge></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <Sel label="Anúncio" value={p2p.anuncio_id} onChange={e=>{const a=anuncios.find(x=>x.id===e.target.value);setP2p(f=>({...f,anuncio_id:e.target.value,lote_id:a?.lote_id||''}))}}>
                          <option value="">Selecione...</option>
                          {anuncios.filter(a=>a.status==='ativo').map(a=><option key={a.id} value={a.id}>{a.lote_codigo} — {a.vendedor_nome}</option>)}
                        </Sel>
                        <Inp label="Comprador" value={p2p.comprador_nome} onChange={e=>setP2p(f=>({...f,comprador_nome:e.target.value}))} placeholder="NomeJogador" />
                        <Inp label="Preço final ($)" type="number" value={p2p.preco_final} onChange={e=>setP2p(f=>({...f,preco_final:e.target.value}))} />
                      </div>
                      <Btn onClick={async()=>{const r=await api('/api/anuncios',{method:'PATCH',body:JSON.stringify(p2p)});if(!r.error){notify('✓ Venda registrada!');reload()}}}>Registrar venda</Btn>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── ADMIN ── */}
          {page === 'admin' && user?.role === 'admin' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 3 }}>⚙️ Admin — Pecuária</div>
                  <div style={{ fontSize: 13, color: C.textMuted }}>Aprovar compras, confirmar abates, gerenciar jogadores</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {confirmReset ? (
                    <>
                      <span style={{ fontSize: 12, color: '#e06060' }}>Tem certeza? Isso apaga TUDO.</span>
                      <Btn v="red" onClick={resetRebanho} style={{ padding: '6px 14px' }}>✓ Confirmar reset</Btn>
                      <Btn v="ghost" onClick={() => setConfirmReset(false)} style={{ padding: '6px 14px' }}>Cancelar</Btn>
                    </>
                  ) : (
                    <Btn v="danger" onClick={() => setConfirmReset(true)} style={{ padding: '6px 14px', fontSize: 12 }}>🗑 Resetar rebanho</Btn>
                  )}
                </div>
              </div>

              {solicPend.length > 0 && <Alert type="warn">🛒 {solicPend.length} solicitação(ões) de compra pendente(s)</Alert>}
              {abatesPend.length > 0 && <Alert type="warn">🥩 {abatesPend.length} abate(s) aguardando addmoney</Alert>}
              {usersPend.length > 0 && <Alert type="info">👤 {usersPend.length} cadastro(s) pendente(s)</Alert>}

              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>Solicitações de compra</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Verifique o comprovante antes de aprovar.</div>
                <Tbl headers={['Jogador','Qtd','Total','Ração','Comprovante','','']}
                  rows={solicPend.map(s => [
                    <span style={{fontWeight:600}}>{s.jogador_nome}</span>,
                    `${s.quantidade} cab.`,
                    <span style={{color:C.gold,fontWeight:700}}>${fmt(s.valor_total)}</span>,
                    `$${fmt(s.custo_racao)}`,
                    <a href={s.comprovante} target="_blank" rel="noreferrer" style={{color:'#4a90d0',fontSize:12}}>Ver →</a>,
                    <Btn onClick={async()=>{await api('/api/solicitacoes',{method:'PATCH',body:JSON.stringify({id:s.id,status:'aprovado'})});notify('✓ Aprovado!');api('/api/solicitacoes').then(setSolic)}} style={{padding:'4px 10px',fontSize:11}}>✓ Aprovar</Btn>,
                    <Btn v="danger" onClick={async()=>{await api('/api/solicitacoes',{method:'PATCH',body:JSON.stringify({id:s.id,status:'recusado'})});notify('Recusado.');api('/api/solicitacoes').then(setSolic)}} style={{padding:'4px 10px',fontSize:11}}>✗ Recusar</Btn>
                  ])} />
              </Card>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Registrar compra — Gov. NPC</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <Sel label="Jogador" value={nLote.jogador_id} onChange={e=>{const u=users.find(x=>x.id===e.target.value);setNLote(f=>({...f,jogador_id:e.target.value,jogador_nome:u?.username||'',fazenda:u?.fazenda||''}))}}>
                      <option value="">Selecione...</option>
                      {users.filter(u=>u.role==='jogador'&&u.status==='aprovado').map(u=><option key={u.id} value={u.id}>{u.username}{u.fazenda?` — Faz. ${u.fazenda}`:''}</option>)}
                    </Sel>
                    <Inp label="Fazenda" value={nLote.fazenda} onChange={e=>setNLote(f=>({...f,fazenda:e.target.value}))} placeholder="0325" />
                    <Inp label="Quantidade" type="number" value={nLote.quantidade} onChange={e=>setNLote(f=>({...f,quantidade:Number(e.target.value)}))} />
                    <Inp label="Preço/cab ($)" type="number" value={nLote.valor_compra} onChange={e=>setNLote(f=>({...f,valor_compra:Number(e.target.value)}))} />
                    <Inp label="Data compra" type="date" value={nLote.data_compra} onChange={e=>setNLote(f=>({...f,data_compra:e.target.value}))} />
                    <Inp label="Comprovante" value={nLote.comprovante} onChange={e=>setNLote(f=>({...f,comprovante:e.target.value}))} placeholder="discord.com/..." />
                  </div>
                  <Btn onClick={async()=>{const r=await api('/api/lotes',{method:'POST',body:JSON.stringify(nLote)});if(!r.error){notify('✓ Lote '+r.codigo+' registrado!');reload()}}}>Registrar lote</Btn>
                </Card>
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>Abates — aguardando addmoney</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Faça o addmoney no FiveM, depois marque como pago.</div>
                  <Tbl headers={['Jogador','Lote','Qtd','Valor','']}
                    rows={abatesPend.map(l => [
                      <span style={{fontWeight:600}}>{l.jogador_nome}</span>,
                      l.codigo, l.quantidade,
                      <span style={{color:C.green,fontWeight:700}}>${fmt(l.valor_abate)}</span>,
                      <Btn v="amber" onClick={async()=>{const r=await api(`/api/lotes/${l.id}`,{method:'PATCH',body:JSON.stringify({action:'marcar_pago'})});if(!r.error){notify('✓ Pago!');reload()}}} style={{padding:'4px 8px',fontSize:11}}>✓ Pago</Btn>
                    ])} />
                </Card>
              </div>

              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Todo o rebanho ativo</div>
                <Tbl headers={['Jogador','Fazenda','Lote','Qtd','Fase','Pronto em','Status','Ação','🗑']}
                  rows={lotes.filter(l=>!['pago','vendido'].includes(l.status)).map(l => [
                    <span style={{fontWeight:600}}>{l.jogador_nome}</span>,
                    l.fazenda, l.codigo, l.quantidade, faseBadge(l.fase), diasRest(l.data_fase4),
                    <Badge type={l.status==='ativo'?'gray':l.status==='aguardando_pagamento'?'amber':'ok'}>{l.status}</Badge>,
                    l.fase!=='abatido'&&l.status==='ativo'
                      ? <Btn v="ghost" onClick={async()=>{const r=await api(`/api/lotes/${l.id}`,{method:'PATCH',body:JSON.stringify({action:'avancar_fase'})});if(!r.error){notify('Fase avançada!');api('/api/lotes').then(setLotes)}}} style={{padding:'4px 8px',fontSize:11}}>Avançar fase</Btn>
                      : '—',
                    <Btn v="danger" onClick={() => deletarLote(l.id)} style={{padding:'3px 8px',fontSize:11}}>✕</Btn>
                  ])} />
              </Card>

              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Registrar ração comprada</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                  <Sel label="Jogador" value={nRacao.jogador_id} onChange={e=>setNRacao(f=>({...f,jogador_id:e.target.value}))}>
                    <option value="">Selecione...</option>
                    {users.filter(u=>u.role==='jogador'&&u.status==='aprovado').map(u=><option key={u.id} value={u.id}>{u.username}</option>)}
                  </Sel>
                  <Inp label="Quantidade (kg)" type="number" value={nRacao.kg} onChange={e=>setNRacao(f=>({...f,kg:e.target.value}))} placeholder="500" />
                  <Inp label="Valor pago ($)" type="number" value={nRacao.valor} onChange={e=>setNRacao(f=>({...f,valor:e.target.value}))} placeholder="1000" />
                  <Btn onClick={async()=>{const r=await api('/api/racao',{method:'POST',body:JSON.stringify(nRacao)});if(!r.error){notify('✓ Ração registrada!')}}} style={{padding:'9px 16px'}}>Registrar</Btn>
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>Cadastros pendentes</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Jogadores que solicitaram acesso.</div>
                {usersPend.length===0
                  ? <div style={{fontSize:13,color:C.textMuted,padding:'8px 0'}}>Nenhum cadastro pendente.</div>
                  : <Tbl headers={['Usuário','Fazenda','Solicitado em','','']}
                      rows={usersPend.map(u => [
                        <span style={{fontWeight:600}}>{u.username}</span>,
                        u.fazenda||'—', new Date(u.criado_em).toLocaleDateString('pt-BR'),
                        <Btn onClick={async()=>{await api('/api/admin/usuarios',{method:'PATCH',body:JSON.stringify({id:u.id,status:'aprovado'})});notify('✓ Aprovado!');api('/api/admin/usuarios').then(setUsers)}} style={{padding:'4px 10px',fontSize:11}}>✓ Aprovar</Btn>,
                        <Btn v="danger" onClick={async()=>{await api('/api/admin/usuarios',{method:'PATCH',body:JSON.stringify({id:u.id,status:'recusado'})});notify('Recusado.');api('/api/admin/usuarios').then(setUsers)}} style={{padding:'4px 10px',fontSize:11}}>✗ Recusar</Btn>
                      ])} />
                }
              </Card>

              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Gerenciar jogadores</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 14, alignItems: 'end' }}>
                  <Inp label="Usuário" value={nUser.username} onChange={e=>setNUser(f=>({...f,username:e.target.value}))} placeholder="nome_jogador" />
                  <Inp label="Senha" type="password" value={nUser.password} onChange={e=>setNUser(f=>({...f,password:e.target.value}))} placeholder="senha123" />
                  <Inp label="Fazenda" value={nUser.fazenda} onChange={e=>setNUser(f=>({...f,fazenda:e.target.value}))} placeholder="0325" />
                  <Btn onClick={async()=>{const r=await api('/api/admin/usuarios',{method:'POST',body:JSON.stringify(nUser)});if(!r.error){notify('✓ Jogador criado!');api('/api/admin/usuarios').then(setUsers)}}} style={{padding:'9px 14px'}}>Criar</Btn>
                </div>
                <Tbl headers={['Usuário','Fazenda','Role','Status','Criado em','']}
                  rows={users.filter(u=>u.status!=='pendente').map(u => [
                    <span style={{fontWeight:600}}>{u.username}</span>,
                    u.fazenda||'—',
                    <Badge type={u.role==='admin'?'ok':'info'}>{u.role}</Badge>,
                    <Badge type={u.status==='aprovado'||u.role==='admin'?'ok':'danger'}>{u.status||'aprovado'}</Badge>,
                    new Date(u.criado_em).toLocaleDateString('pt-BR'),
                    u.role!=='admin' ? <Btn v="danger" onClick={async()=>{await api('/api/admin/usuarios',{method:'DELETE',body:JSON.stringify({id:u.id})});api('/api/admin/usuarios').then(setUsers)}} style={{padding:'3px 8px',fontSize:11}}>Remover</Btn> : '—'
                  ])} />
              </Card>
            </>
          )}

          {/* ── HISTÓRICO (só admin) ── */}
          {page === 'hist' && user?.role === 'admin' && (
            <>
              <Title t="📋 Histórico de Transações" s="Visão completa — apenas admins" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
                <Metric label="Total transações" value={trans.length} />
                <Metric label="Abates" value={trans.filter(t=>t.tipo==='abate').length} />
                <Metric label="Vendas entre jogadores" value={trans.filter(t=>t.tipo==='p2p').length} />
                <Metric label="Volume total" value={`$${fmt(trans.reduce((s,t)=>s+Number(t.valor),0))}`} color={C.green} />
              </div>
              <Card>
                <Tbl headers={['Data','Operação','De','Para','Qtd','Valor unitário','Total']}
                  rows={trans.map(t => [
                    new Date(t.criado_em).toLocaleDateString('pt-BR'),
                    <Badge type={t.tipo==='abate'?'ok':t.tipo==='p2p'?'purple':t.tipo==='compra_racao'?'amber':'info'}>{tipoLabel(t.tipo)}</Badge>,
                    t.de_jogador, t.para_jogador,
                    t.quantidade||'—',
                    t.quantidade ? `$${fmt(Math.round(t.valor/t.quantidade))}` : '—',
                    <span style={{color:C.green,fontWeight:700}}>${fmt(t.valor)}</span>,
                  ])} />
              </Card>
            </>
          )}
          {page === 'hist' && user?.role !== 'admin' && (
            <Alert type="danger">Acesso restrito — apenas administradores.</Alert>
          )}

        </div>
      </div>
    </>
  )
}
