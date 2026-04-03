// ─── Constants ────────────────────────────────────────────────────────────────
export const FASES = { bezerro:'Bezerro', garrote:'Garrote', boi:'Boi', abatido:'Boi abatido' }
export const PESOS = { bezerro:180, garrote:400, boi:540, abatido:648 }
export const SEMANAS = { bezerro:1, garrote:2, boi:3, abatido:4 }
export const fmt = n => Number(n||0).toLocaleString('pt-BR')

// ─── CSS Globals — Leilão de Gado Premium ────────────────────────────────────
export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
  :root{
    --bg:#150f0c;--panel:#1e1612;--card:#1e1612;--card2:#261c17;--input-bg:#130d0a;
    --border:#36251e;--border2:#523a2f;
    --rust:#c28c46;--rust2:#8a602c;--rust3:#3d2b24;
    --gold:#c28c46;--gold-dim:#8a602c;
    --grn:#4ade80;--grn2:#14532d;
    --red:#f87171;--red2:#450a0a;
    --ice:#eaddcf;--ice2:#a6968a;--ice3:#5c4a42;
    --font-disp:'Playfair Display',serif;
    --font-mono:'Inter',sans-serif;
    --font-title:'Playfair Display',serif;
    --font-data:'DM Mono',monospace;
    --radius-btn:10px;
    --ease:.22s ease;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{font-family:var(--font-mono);background:var(--bg);color:var(--ice);-webkit-font-smoothing:antialiased;letter-spacing:.01em}
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
  .card-hover{transition:border-color var(--ease),box-shadow var(--ease)}
  .btn-hover{transition:background var(--ease),color var(--ease)}
  .nav-btn{transition:background var(--ease),color var(--ease),transform .12s ease}
  .nav-btn:active{transform:scale(.97)}
  .drawer-open{animation:slideRight .28s cubic-bezier(.4,0,.2,1) both}
  @media(max-width:768px){.desktop-only{display:none!important}.mobile-header{display:flex!important}}
  @media(min-width:769px){.mobile-only{display:none!important}.mobile-header{display:none!important}}
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
`

// ─── Theme — Leilão de Gado Premium ──────────────────────────────────────────
export const D = {
  bg:'#150f0c', panel:'#1e1612', card:'#1e1612', cardHover:'#261c17',
  border:'#36251e', border2:'#523a2f',
  gold:'#c28c46', goldLight:'#d4a96a', goldDark:'#8a602c',
  cream:'#eaddcf', creamDim:'#a6968a', creamMuted:'#5c4a42',
  green:'#4ade80', greenDark:'#14532d', red:'#f87171', amber:'#c28c46',
  inputBg:'#130d0a', navBg:'#1e1612', isDark:true,
  text:'#eaddcf', textDim:'#a6968a', textMuted:'#5c4a42',
}

export const L = {
  bg:'#f5ede2', panel:'#ede0cc', card:'#f9f3ea', cardHover:'#fff8f0',
  border:'#d4b896', border2:'#b8946a',
  gold:'#8a5a1a', goldLight:'#a06c28', goldDark:'#5c3a0a',
  cream:'#2a1a0a', creamDim:'#5c3a1e', creamMuted:'#8a6a4a',
  green:'#16803a', greenDark:'#bbf7d0', red:'#b91c1c', amber:'#8a5a1a',
  inputBg:'#ede0cc', navBg:'#e8d9c4', isDark:false,
  text:'#2a1a0a', textDim:'#5c3a1e', textMuted:'#8a6a4a',
}
