import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'gvrpnl_secret_2026'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

export function getTokenFromReq(req) {
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export function requireAuth(handler, role = null) {
  return async (req, res) => {
    const token = getTokenFromReq(req)
    if (!token) return res.status(401).json({ error: 'Não autorizado' })
    const user = verifyToken(token)
    if (!user) return res.status(401).json({ error: 'Token inválido' })
    if (role && user.role !== role) return res.status(403).json({ error: 'Sem permissão' })
    req.user = user
    return handler(req, res)
  }
}
