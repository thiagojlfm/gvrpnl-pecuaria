// ─── Sound Engine ─────────────────────────────────────────────────────────────
export let audioCtx = null

export function getCtx() {
  if (!audioCtx && typeof window !== 'undefined') audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

export function playTone(freq, duration, type='sine', vol=0.1) {
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

export const sounds = {
  click: () => playTone(800, 0.08, 'square', 0.05),
  success: () => { playTone(523, 0.15, 'sine', 0.08); setTimeout(()=>playTone(659, 0.15, 'sine', 0.08), 120); setTimeout(()=>playTone(784, 0.2, 'sine', 0.08), 240) },
  coin: () => { playTone(1046, 0.1, 'sine', 0.1); setTimeout(()=>playTone(1318, 0.15, 'sine', 0.08), 80) },
  phase: () => { playTone(440, 0.1); setTimeout(()=>playTone(550, 0.2), 100) },
  error: () => playTone(200, 0.3, 'sawtooth', 0.06),
}
