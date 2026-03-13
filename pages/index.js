import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

const FASES = { bezerro: 'Bezerro', garrote: 'Garrote', boi: 'Boi', abatido: 'Boi abatido' }
const PESOS = { bezerro: 180, garrote: 400, boi: 540, abatido: 648 }
const SEMANAS = { bezerro: 1, garrote: 2, boi: 3, abatido: 4 }

function fmt(n) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }

function Badge({ type, children }) {
  const styles = {
    ok: { background: '#1a3d1a', color: '#6fcf6f', border: '1px solid #2d6b2d' },
    warn: { background: '#3d2e00', color: '#f5c842', border: '1px solid #7a5c00' },
    info: { background: '#0a2540', color: '#5aabf5', border: '1px solid #1a4a80' },
    gray: { background: '#1e1e1e', color: '#888', border: '1px solid #333' },
    purple: { background: '#1e1a3d', color: '#a89cf5', border: '1px solid #3d3480' },
    danger: { background: '#3d0a0a', color: '#f56565', border: '1px solid #7a1a1a' },
    amber: { background: '#3d2200', color: '#f5a623', border: '1px solid #7a4400' },
  }
  const s = styles[type] || styles.gray
  return <span style={{ ...s, fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-block' }}>{children}</span>
}

function Card({ children, style }) {
  return <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16, marginBottom: 14, ...style }}>{children}</div>
}

function Metric({ label, value, sub }) {
  return (
    <div style={{ background: '#0d0d0d', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: '#fff' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>{label}</label>}
      <input {...props} style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none', ...props.style }} />
    </div>
  )
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>{label}</label>}
      <select {...props} style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }}>{children}</select>
    </div>
  )
}

function Btn({ children, onClick, variant = 'primary', style, disabled }) {
  const base = { border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', padding: '8px 16px', fontFamily: 'inherit', opacity: disabled ? 0.5 : 1, transition: 'opacity .15s' }
  const vars = {
    primary: { background: '#2d5a27', color: '#fff' },
    ghost: { background: 'transparent', border: '1px solid #333', color: '#aaa' },
    danger: { background: '#5a1a1a', color: '#f56565' },
    amber: { background: '#7a4400', color: '#f5a623' },
    purple: { background: '#2a2060', color: '#a89cf5' },
  }
  return <button style={{ ...base, ...vars[variant], ...style }} onClick={onClick} disabled={disabled}>{children}</button>
}

function Tbl({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>{headers.map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '7px 10px', fontSize: 11, fontWeight: 500, color: '#555', borderBottom: '1px solid #1a1a1a', whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
              {row.map((cell, j) => <td key={j} style={{ padding: '9px 10px', color: '#ccc', verticalAlign: 'middle' }}>{cell}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={headers.length} style={{ padding: 20, textAlign: 'center', color: '#444', fontSize: 13 }}>Nenhum registro</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function Alert({ type, children }) {
  const styles = {
    warn: { background: '#2a1f00', color: '#f5c842', borderLeft: '3px solid #7a5c00' },
    success: { background: '#0a2010', color: '#6fcf6f', borderLeft: '3px solid #2d6b2d' },
    info: { background: '#051525', color: '#5aabf5', borderLeft: '3px solid #1a4a80' },
  }
  return <div style={{ ...styles[type], padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{children}</div>
}

function faseBadge(fase) {
  const m = { bezerro: 'info', garrote: 'warn', boi: 'gray', abatido: 'ok' }
  return <Badge type={m[fase] || 'gray'}>{FASES[fase] || fase} — sem. {SEMANAS[fase]}</Badge>
}

function statusBadge(status) {
  const m = { ativo: ['gray', 'Ativo'], aguardando_pagamento: ['amber', 'Aguard. addmoney'], pago: ['ok', 'Pago'], vendido: ['purple', 'Vendido p2p'] }
  const [t, l] = m[status] || ['gray', status]
  return <Badge type={t}>{l}</Badge>
}

function diasRestantes(dataStr) {
  if (!dataStr) return '—'
  const diff = Math.ceil((new Date(dataStr) - new Date()) / 86400000)
  if (diff <= 0) return <span style={{ color: '#6fcf6f', fontWeight: 500 }}>Pronto!</span>
  return `${diff} dias`
}

export default function Home() {
  const [page, setPage] = useState('mercado')
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [mercado, setMercado] = useState(null)
  const [lotes, setLotes] = useState([])
  const [anuncios, setAnuncios] = useState([])
  const [transacoes, setTransacoes] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [msg, setMsg] = useState('')

  const api = useCallback(async (path, opts = {}) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const r = await fetch(path, { ...opts, headers })
    return r.json()
  }, [token])

  useEffect(() => {
    const t = localStorage.getItem('gvrpnl_token')
    const u = localStorage.getItem('gvrpnl_user')
    if (t && u) { setToken(t); setUser(JSON.parse(u)) }
  }, [])

  useEffect(() => { fetch('/api/mercado').then(r => r.json()).then(setMercado) }, [])

  useEffect(() => {
    if (!token) return
    api('/api/lotes').then(setLotes)
    api('/api/anuncios').then(setAnuncios)
    api('/api/transacoes').then(setTransacoes)
    if (user?.role === 'admin') api('/api/admin/usuarios').then(setUsuarios)
  }, [token, api, user])

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function login() {
    setLoginError('')
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginForm) })
    const d = await r.json()
    if (d.error) return setLoginError(d.error)
    localStorage.setItem('gvrpnl_token', d.token)
    localStorage.setItem('gvrpnl_user', JSON.stringify(d.user))
    setToken(d.token); setUser(d.user)
    setPage(d.user.role === 'admin' ? 'admin' : 'rebanho')
  }

  function logout() {
    localStorage.removeItem('gvrpnl_token')
    localStorage.removeItem('gvrpnl_user')
    setToken(null); setUser(null); setPage('mercado')
  }

  async function solicitarAbate(id) {
    const r = await api(`/api/lotes/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'solicitar_abate', preco_kg: mercado?.precos?.precoKg || 5 }) })
    if (r.error) return notify('Erro: ' + r.error)
    notify('Abate solicitado! Aguardando addmoney do admin.')
    api('/api/lotes').then(setLotes)
  }

  async function marcarPago(id) {
    const r = await api(`/api/lotes/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'marcar_pago' }) })
    if (r.error) return notify('Erro: ' + r.error)
    notify('Pagamento confirmado!')
    api('/api/lotes').then(setLotes)
    api('/api/transacoes').then(setTransacoes)
  }

  async function avancarFase(id) {
    const r = await api(`/api/lotes/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'avancar_fase' }) })
    if (r.error) return notify('Erro: ' + r.error)
    notify('Fase avançada!')
    api('/api/lotes').then(setLotes)
  }

  // Forms state
  const [novoLote, setNovoLote] = useState({ jogador_id: '', jogador_nome: '', fazenda: '', quantidade: 1, valor_compra: 900, data_compra: '', comprovante: '' })
  const [novoUsuario, setNovoUsuario] = useState({ username: '', password: '', fazenda: '' })
  const [novoAnuncio, setNovoAnuncio] = useState({ lote_id: '', preco_pedido: '', obs: '' })
  const [vendaP2P, setVendaP2P] = useState({ anuncio_id: '', comprador_nome: '', preco_final: '', lote_id: '' })

  async function criarLote() {
    const r = await api('/api/lotes', { method: 'POST', body: JSON.stringify(novoLote) })
    if (r.error) return notify('Erro: ' + r.error)
    notify('Lote criado! ' + r.codigo)
    api('/api/lotes').then(setLotes)
    api('/api/transacoes').then(setTransacoes)
  }

  async function criarUsuario() {
    const r = await api('/api/admin/usuarios', { method: 'POST', body: JSON.stringify(novoUsuario) })
    if (r.error) return notify('Erro: ' + r.error)
    notify('Jogador criado!')
    api('/api/admin/usuarios').then(setUsuarios)
  }

  async function publicarAnuncio() {
    const lote = lotes.find(l => l.id === novoAnuncio.lote_id)
    if (!lote) return notify('Selecione um lote')
    const r = await api('/api/anuncios', { method: 'POST', body: JSON.stringify({ ...novoAnuncio, lote_codigo: lote.codigo, fase: lote.fase, quantidade: lote.quantidade, peso_kg: lote.peso_kg }) })
    if (r.error) return notify('Erro: ' + r.error)
    notify('Anúncio publicado!')
    api('/api/anuncios').then(setAnuncios)
  }

  async function registrarP2P() {
    const r = await api('/api/anuncios', { method: 'PATCH', body: JSON.stringify(vendaP2P) })
    if (r.error) return notify('Erro: ' + r.error)
    notify('Venda p2p registrada!')
    api('/api/lotes').then(setLotes)
    api('/api/anuncios').then(setAnuncios)
    api('/api/transacoes').then(setTransacoes)
  }

  const meusLotes = user?.role === 'admin' ? lotes : lotes.filter(l => l.jogador_id === user?.id)
  const abatesPendentes = lotes.filter(l => l.status === 'aguardando_pagamento')
  const prontos = meusLotes.filter(l => l.fase === 'abatido' && l.status === 'ativo')

  const navItems = [
    { id: 'mercado', label: 'Mercado', public: true },
    { id: 'rebanho', label: 'Meu rebanho', public: false },
    { id: 'p2p', label: 'Venda entre jogadores', public: false },
    { id: 'admin', label: 'Admin', public: false, adminOnly: true },
    { id: 'hist', label: 'Histórico', public: false },
  ]

  const G = { fontFamily: "'Inter', system-ui, sans-serif", background: '#080808', minHeight: '100vh', color: '#ccc' }

  return (
    <>
      <Head><title>GVRPNL — Pecuária</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <div style={G}>
        {/* Topbar */}
        <div style={{ background: '#0e1a0c', borderBottom: '1px solid #1a2e18', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ color: '#6fcf6f', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4a9e4a' }}></div>
            GVRPNL — Pecuária
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {navItems.filter(n => n.public || user).filter(n => !n.adminOnly || user?.role === 'admin').map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ background: page === n.id ? 'rgba(74,158,74,.2)' : 'transparent', border: 'none', color: page === n.id ? '#6fcf6f' : '#666', fontSize: 13, padding: '6px 11px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: page === n.id ? 500 : 400 }}>{n.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user ? (
              <>
                <span style={{ fontSize: 13, color: '#666' }}>{user.username}</span>
                <Btn variant="ghost" onClick={logout} style={{ padding: '4px 10px', fontSize: 12 }}>Sair</Btn>
              </>
            ) : (
              <Btn onClick={() => setPage('login')} style={{ padding: '5px 12px', fontSize: 12 }}>Entrar</Btn>
            )}
          </div>
        </div>

        {msg && <div style={{ background: '#1a3d1a', color: '#6fcf6f', padding: '10px 20px', fontSize: 13, textAlign: 'center', borderBottom: '1px solid #2d6b2d' }}>{msg}</div>}

        <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>

          {/* LOGIN */}
          {page === 'login' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 32, width: 320 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#1a3d1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 10px' }}>🐄</div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 4 }}>GVRPNL</div>
                  <div style={{ fontSize: 13, color: '#555' }}>Sistema de Pecuária</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  <Input label="USUÁRIO" value={loginForm.username} onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} placeholder="seu_usuario" />
                  <Input label="SENHA" type="password" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••" onKeyDown={e => e.key === 'Enter' && login()} />
                </div>
                {loginError && <div style={{ color: '#f56565', fontSize: 13, marginBottom: 12 }}>{loginError}</div>}
                <Btn onClick={login} style={{ width: '100%', padding: 10, fontSize: 14 }}>Entrar</Btn>
              </div>
            </div>
          )}

          {/* MERCADO */}
          {page === 'mercado' && (
            <>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 3 }}>Mercado — Pecuária</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 18 }}>Preço por kg sobe quando o rebanho está escasso</div>

              {/* Ciclo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid #222' }}>
                {[
                  { sem: 1, nome: 'Bezerro', kg: 180, tag: 'Gov. NPC — fixo', tagType: 'info', bg: '#0d0d0d' },
                  { sem: 2, nome: 'Garrote', kg: 400, tag: 'pode vender p/ jogador', tagType: 'purple', bg: '#0d0a1a' },
                  { sem: 3, nome: 'Boi', kg: 540, tag: 'pode vender p/ jogador', tagType: 'purple', bg: '#0d0a1a' },
                  { sem: 4, nome: 'Boi abatido', kg: 648, tag: 'Frigorífico NPC → addmoney', tagType: 'ok', bg: '#0a150a' },
                ].map((f, i) => (
                  <div key={i} style={{ background: f.bg, padding: '12px 10px', textAlign: 'center', borderRight: i < 3 ? '1px solid #1a1a1a' : 'none' }}>
                    <div style={{ fontSize: 10, color: '#444', marginBottom: 4, letterSpacing: '.5px', fontWeight: 500 }}>SEMANA {f.sem}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 2 }}>{f.nome}</div>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>{f.kg} kg</div>
                    <Badge type={f.tagType}>{f.tag}</Badge>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Preços de referência <span style={{ fontSize: 12, color: '#555', fontWeight: 400 }}>hoje · ${mercado?.precos?.precoKg || '...'}/kg</span></div>
                  <Tbl headers={['Fase', 'Peso', 'Preço ref.', 'Origem']}
                    rows={mercado ? [
                      ['Bezerro', '180 kg', <span style={{ fontWeight: 500, color: '#fff' }}>${fmt(mercado.precos.bezerro)}</span>, <Badge type="info">Gov. NPC fixo</Badge>],
                      ['Garrote', '400 kg', <span style={{ fontWeight: 500, color: '#fff' }}>${fmt(mercado.precos.garrote)}</span>, <Badge type="purple">Livre</Badge>],
                      ['Boi', '540 kg', <span style={{ fontWeight: 500, color: '#fff' }}>${fmt(mercado.precos.boi)}</span>, <Badge type="purple">Livre</Badge>],
                      ['Abate', '648 kg', <span style={{ fontWeight: 500, color: '#6fcf6f', fontWeight: 500 }}>${fmt(mercado.precos.abate)}</span>, <Badge type="ok">Frigorífico</Badge>],
                    ] : []} />
                </Card>
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Rebanho no servidor</div>
                  {mercado && ['bezerro', 'garrote', 'boi', 'abatido'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: '#555', minWidth: 90 }}>{FASES[f]}</span>
                      <div style={{ flex: 1, background: '#0d0d0d', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min((mercado.rebanho[f] / 20) * 100, 100)}%`, height: '100%', background: '#3a6b2f', borderRadius: 4 }} />
                      </div>
                      <span style={{ color: '#555', minWidth: 50, textAlign: 'right' }}>{mercado.rebanho[f]} cab.</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#555' }}>Total: {mercado?.rebanho?.total || 0} cabeças</span>
                    <span style={{ fontWeight: 500, color: '#fff' }}>${mercado?.precos?.precoKg || '...'}/kg {mercado?.rebanho?.total < 25 ? <Badge type="ok">rebanho baixo ↑</Badge> : <Badge type="warn">rebanho alto ↓</Badge>}</span>
                  </div>
                </Card>
              </div>

              <Card>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Margem por ponto de entrada</div>
                <Tbl headers={['Entra em', 'Custo estimado', 'Receita abate', 'Margem estimada']}
                  rows={mercado ? [
                    ['Bezerro', `$${fmt(mercado.precos.bezerro + 50 + 1155)}`, `$${fmt(mercado.precos.abate)}`, <Badge type="ok">~35%</Badge>],
                    ['Garrote', `$${fmt(mercado.precos.garrote)}+`, `$${fmt(mercado.precos.abate)}`, <Badge type="warn">~10–20%</Badge>],
                    ['Boi', `$${fmt(mercado.precos.boi)}+`, `$${fmt(mercado.precos.abate)}`, <Badge type="gray">~5–15%</Badge>],
                  ] : []} />
                <div style={{ fontSize: 11, color: '#444', marginTop: 8 }}>Margem p2p depende do preço combinado entre os jogadores.</div>
              </Card>
            </>
          )}

          {/* MEU REBANHO */}
          {page === 'rebanho' && !user && <Alert type="warn">Faça login para ver seu rebanho.</Alert>}
          {page === 'rebanho' && user && (
            <>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 3 }}>Meu rebanho</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 18 }}>{user.username} {user.fazenda ? `· Fazenda ${user.fazenda}` : ''}</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
                <Metric label="Total de cabeças" value={meusLotes.filter(l => l.status === 'ativo' || l.status === 'aguardando_pagamento').reduce((s, l) => s + l.quantidade, 0)} />
                <Metric label="Prontos p/ abate" value={prontos.length} sub="solicite ao admin" />
                <Metric label="Aguard. addmoney" value={meusLotes.filter(l => l.status === 'aguardando_pagamento').length} sub="addmoney pendente" />
                <Metric label="Receita est. abate" value={`$${fmt(prontos.reduce((s, l) => s + (l.valor_abate || mercado?.precos?.abate * l.quantidade || 0), 0))}`} />
              </div>

              {prontos.length > 0 && <Alert type="success">{prontos.length} lote(s) pronto(s) para abate — solicite ao admin!</Alert>}
              {meusLotes.filter(l => l.status === 'aguardando_pagamento').length > 0 && <Alert type="warn">Aguardando addmoney do admin para {meusLotes.filter(l => l.status === 'aguardando_pagamento').length} lote(s).</Alert>}

              <Card>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Lotes ativos</div>
                <Tbl
                  headers={['Lote', 'Qtd', 'Fase', 'Peso', 'Pronto em', 'Valor ref.', 'Status', 'Ação']}
                  rows={meusLotes.map(l => [
                    <span style={{ fontWeight: 500, color: '#fff' }}>{l.codigo}</span>,
                    l.quantidade,
                    faseBadge(l.fase),
                    `${l.peso_kg} kg`,
                    diasRestantes(l.data_fase4),
                    <span style={{ color: '#6fcf6f' }}>${fmt(l.valor_abate || (mercado?.precos?.abate || 0) * l.quantidade)}</span>,
                    statusBadge(l.status),
                    l.fase === 'abatido' && l.status === 'ativo'
                      ? <Btn onClick={() => solicitarAbate(l.id)} style={{ padding: '4px 10px', fontSize: 11 }}>Solicitar abate</Btn>
                      : l.status === 'aguardando_pagamento'
                      ? <Badge type="amber">Aguard. addmoney</Badge>
                      : l.status === 'pago'
                      ? <Badge type="ok">Pago!</Badge>
                      : <Btn variant="purple" onClick={() => { setNovoAnuncio(f => ({ ...f, lote_id: l.id })); setPage('p2p') }} style={{ padding: '4px 10px', fontSize: 11 }}>Anunciar venda</Btn>
                  ])}
                />
              </Card>
            </>
          )}

          {/* P2P */}
          {page === 'p2p' && (
            <>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 3 }}>Venda entre jogadores</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 18 }}>Garrotes e bois anunciados · preço livre combinado · admin registra</div>

              <Alert type="info">Comprar numa fase avançada tem margem menor — mas você entra sem esperar semanas do zero.</Alert>

              <Card>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Animais à venda agora</div>
                <Tbl
                  headers={['Vendedor', 'Fazenda', 'Fase', 'Qtd', 'Peso', 'Preço pedido', 'Obs', 'Ação']}
                  rows={anuncios.filter(a => a.status === 'ativo').map(a => [
                    <span style={{ fontWeight: 500, color: '#fff' }}>{a.vendedor_nome}</span>,
                    a.fazenda || '—',
                    faseBadge(a.fase),
                    a.quantidade,
                    `${a.peso_kg} kg`,
                    <span style={{ fontWeight: 500, color: '#fff' }}>${fmt(a.preco_pedido)}</span>,
                    a.obs || '—',
                    <Btn style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => notify('Interesse registrado! Fale com o vendedor no Discord.')}>Interesse</Btn>
                  ])}
                />
              </Card>

              {user && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Card>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Anunciar meu animal</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <Select label="LOTE" value={novoAnuncio.lote_id} onChange={e => setNovoAnuncio(f => ({ ...f, lote_id: e.target.value }))}>
                        <option value="">Selecione...</option>
                        {meusLotes.filter(l => l.status === 'ativo' && l.fase !== 'bezerro').map(l => (
                          <option key={l.id} value={l.id}>{l.codigo} — {FASES[l.fase]} ({l.quantidade} cab.)</option>
                        ))}
                      </Select>
                      <Input label="PREÇO PEDIDO ($)" type="number" value={novoAnuncio.preco_pedido} onChange={e => setNovoAnuncio(f => ({ ...f, preco_pedido: e.target.value }))} placeholder="Ex: 1800" />
                      <Input label="OBSERVAÇÃO" value={novoAnuncio.obs} onChange={e => setNovoAnuncio(f => ({ ...f, obs: e.target.value }))} placeholder="Negociável..." style={{ gridColumn: '1/-1' }} />
                    </div>
                    <Btn onClick={publicarAnuncio}>Publicar anúncio</Btn>
                  </Card>

                  {user?.role === 'admin' && (
                    <Card>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Registrar venda p2p <span style={{ fontSize: 12, color: '#555', fontWeight: 400 }}>admin</span></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <Select label="ANÚNCIO" value={vendaP2P.anuncio_id} onChange={e => {
                          const a = anuncios.find(x => x.id === e.target.value)
                          setVendaP2P(f => ({ ...f, anuncio_id: e.target.value, lote_id: a?.lote_id || '' }))
                        }}>
                          <option value="">Selecione...</option>
                          {anuncios.filter(a => a.status === 'ativo').map(a => (
                            <option key={a.id} value={a.id}>{a.lote_codigo} — {a.vendedor_nome} · ${fmt(a.preco_pedido)}</option>
                          ))}
                        </Select>
                        <Input label="COMPRADOR" value={vendaP2P.comprador_nome} onChange={e => setVendaP2P(f => ({ ...f, comprador_nome: e.target.value }))} placeholder="NomeJogador" />
                        <Input label="PREÇO FINAL ($)" type="number" value={vendaP2P.preco_final} onChange={e => setVendaP2P(f => ({ ...f, preco_final: e.target.value }))} placeholder="1800" />
                      </div>
                      <Btn onClick={registrarP2P}>Registrar venda</Btn>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}

          {/* ADMIN */}
          {page === 'admin' && user?.role === 'admin' && (
            <>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 3 }}>Admin — Pecuária</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 18 }}>Registrar compras, confirmar abates, addmoney e gerenciar jogadores</div>

              {abatesPendentes.length > 0 && <Alert type="warn">{abatesPendentes.length} abate(s) aguardando addmoney</Alert>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Registrar compra — Gov. NPC</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <Select label="JOGADOR" value={novoLote.jogador_id} onChange={e => {
                      const u = usuarios.find(x => x.id === e.target.value)
                      setNovoLote(f => ({ ...f, jogador_id: e.target.value, jogador_nome: u?.username || '', fazenda: u?.fazenda || '' }))
                    }}>
                      <option value="">Selecione...</option>
                      {usuarios.filter(u => u.role === 'jogador').map(u => (
                        <option key={u.id} value={u.id}>{u.username} {u.fazenda ? `— Faz. ${u.fazenda}` : ''}</option>
                      ))}
                    </Select>
                    <Input label="FAZENDA" value={novoLote.fazenda} onChange={e => setNovoLote(f => ({ ...f, fazenda: e.target.value }))} placeholder="0325" />
                    <Input label="QUANTIDADE" type="number" value={novoLote.quantidade} onChange={e => setNovoLote(f => ({ ...f, quantidade: Number(e.target.value) }))} />
                    <Input label="PREÇO/CAB. ($)" type="number" value={novoLote.valor_compra} onChange={e => setNovoLote(f => ({ ...f, valor_compra: Number(e.target.value) }))} />
                    <Input label="DATA COMPRA" type="date" value={novoLote.data_compra} onChange={e => setNovoLote(f => ({ ...f, data_compra: e.target.value }))} />
                    <Input label="COMPROVANTE" value={novoLote.comprovante} onChange={e => setNovoLote(f => ({ ...f, comprovante: e.target.value }))} placeholder="discord.com/..." />
                  </div>
                  <Btn onClick={criarLote}>Registrar lote na planilha</Btn>
                </Card>

                <Card>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Abates — aguardando addmoney</div>
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>Faça o addmoney no servidor, depois marque como pago aqui.</div>
                  <Tbl
                    headers={['Jogador', 'Lote', 'Qtd', 'Valor', 'Ação']}
                    rows={abatesPendentes.map(l => [
                      <span style={{ fontWeight: 500, color: '#fff' }}>{l.jogador_nome}</span>,
                      l.codigo, l.quantidade,
                      <span style={{ color: '#6fcf6f', fontWeight: 500 }}>${fmt(l.valor_abate)}</span>,
                      <Btn variant="amber" onClick={() => marcarPago(l.id)} style={{ padding: '4px 8px', fontSize: 11 }}>Marcar pago</Btn>
                    ])}
                  />
                </Card>
              </div>

              <Card>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Todo o rebanho ativo</div>
                <Tbl
                  headers={['Jogador', 'Fazenda', 'Lote', 'Qtd', 'Fase', 'Próx. fase', 'Status', 'Ação']}
                  rows={lotes.filter(l => !['pago','vendido'].includes(l.status)).map(l => [
                    <span style={{ fontWeight: 500, color: '#fff' }}>{l.jogador_nome}</span>,
                    l.fazenda,
                    l.codigo,
                    l.quantidade,
                    faseBadge(l.fase),
                    diasRestantes(l.fase === 'bezerro' ? l.data_fase2 : l.fase === 'garrote' ? l.data_fase3 : l.fase === 'boi' ? l.data_fase4 : null),
                    statusBadge(l.status),
                    l.fase !== 'abatido' && l.status === 'ativo'
                      ? <Btn variant="ghost" onClick={() => avancarFase(l.id)} style={{ padding: '4px 8px', fontSize: 11 }}>Avançar fase</Btn>
                      : '—'
                  ])}
                />
              </Card>

              <Card>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Gerenciar jogadores</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 14, alignItems: 'end' }}>
                  <Input label="USUÁRIO" value={novoUsuario.username} onChange={e => setNovoUsuario(f => ({ ...f, username: e.target.value }))} placeholder="nome_jogador" />
                  <Input label="SENHA" type="password" value={novoUsuario.password} onChange={e => setNovoUsuario(f => ({ ...f, password: e.target.value }))} placeholder="senha123" />
                  <Input label="FAZENDA" value={novoUsuario.fazenda} onChange={e => setNovoUsuario(f => ({ ...f, fazenda: e.target.value }))} placeholder="0325" />
                  <Btn onClick={criarUsuario} style={{ padding: '8px 14px' }}>Criar</Btn>
                </div>
                <Tbl
                  headers={['Usuário', 'Fazenda', 'Role', 'Criado em', 'Ação']}
                  rows={usuarios.map(u => [
                    <span style={{ fontWeight: 500, color: '#fff' }}>{u.username}</span>,
                    u.fazenda || '—',
                    <Badge type={u.role === 'admin' ? 'ok' : 'info'}>{u.role}</Badge>,
                    new Date(u.criado_em).toLocaleDateString('pt-BR'),
                    u.role !== 'admin' ? <Btn variant="danger" onClick={async () => { await api('/api/admin/usuarios', { method: 'DELETE', body: JSON.stringify({ id: u.id }) }); api('/api/admin/usuarios').then(setUsuarios) }} style={{ padding: '3px 8px', fontSize: 11 }}>Remover</Btn> : '—'
                  ])}
                />
              </Card>
            </>
          )}

          {/* HISTÓRICO */}
          {page === 'hist' && (
            <>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 3 }}>Histórico de transações</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 18 }}>Compras do NPC, vendas p2p e abates pagos</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
                <Metric label="Total transações" value={transacoes.length} />
                <Metric label="Abates" value={transacoes.filter(t => t.tipo === 'abate').length} />
                <Metric label="Vendas p2p" value={transacoes.filter(t => t.tipo === 'p2p').length} />
                <Metric label="Volume total" value={`$${fmt(transacoes.reduce((s, t) => s + Number(t.valor), 0))}`} />
              </div>

              <Card>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Todas as transações</div>
                <Tbl
                  headers={['Data', 'De', 'Para', 'Descrição', 'Qtd', 'Valor', 'Tipo']}
                  rows={transacoes.map(t => [
                    new Date(t.criado_em).toLocaleDateString('pt-BR'),
                    t.de_jogador,
                    t.para_jogador,
                    `${t.lote_codigo || ''} ${t.fase ? '· ' + FASES[t.fase] : ''}`,
                    t.quantidade,
                    <span style={{ color: '#6fcf6f', fontWeight: 500 }}>${fmt(t.valor)}</span>,
                    <Badge type={t.tipo === 'abate' ? 'ok' : t.tipo === 'p2p' ? 'purple' : 'info'}>
                      {t.tipo === 'abate' ? 'Abate' : t.tipo === 'p2p' ? 'P2P' : 'NPC'}
                    </Badge>
                  ])}
                />
              </Card>
            </>
          )}

        </div>
      </div>
    </>
  )
}
