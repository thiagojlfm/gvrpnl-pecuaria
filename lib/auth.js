import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET
if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required — refusing to start without it.')
}

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

/**
 * withAuth — middleware padrão para rotas de API do Next.
 *
 * Responsabilidades (em ordem):
 *   1. Extrai o token do header Authorization: Bearer.
 *   2. Verifica assinatura/expiração via JWT.
 *   3. Anexa o payload decodificado em `req.user`.
 *   4. Aplica checagem opcional de role.
 *   5. Aplica checagem opcional de ownership (posse do recurso).
 *
 * Admin faz bypass do ownership por padrão — se uma rota precisar negar até
 * para admin, faz a checagem dentro do próprio handler.
 *
 * @param {Function} handler  — handler Next.js padrão (req, res) => any
 * @param {Object}   options
 * @param {string}   [options.role]       — se setado, exige req.user.role === role
 * @param {Function} [options.ownership]  — async (req, user) => boolean | { allow, reason }
 *                                          false/ {allow:false} → 403 (admin bypassa)
 */
export function withAuth(handler, options = {}) {
  const { role = null, ownership = null } = options

  return async (req, res) => {
    // 1. Extrai token
    const token = getTokenFromReq(req)
    if (!token) return res.status(401).json({ error: 'Não autorizado' })

    // 2. Verifica
    const user = verifyToken(token)
    if (!user) return res.status(401).json({ error: 'Token inválido ou expirado' })

    // 3. Anexa ao req (contrato público do middleware)
    req.user = user

    // 4. Role check
    if (role && user.role !== role) {
      return res.status(403).json({ error: 'Sem permissão' })
    }

    // 5. Ownership check (admin bypassa)
    if (typeof ownership === 'function' && user.role !== 'admin') {
      let result
      try {
        result = await ownership(req, user)
      } catch (err) {
        console.error('[withAuth] erro na checagem de ownership:', err)
        return res.status(500).json({ error: 'Erro ao validar posse do recurso' })
      }
      const allow  = result === true || result?.allow === true
      const reason = (typeof result === 'object' && result?.reason) || 'Sem permissão para este recurso'
      if (!allow) return res.status(403).json({ error: reason })
    }

    return handler(req, res)
  }
}

/**
 * requireAuth — mantido como alias retrocompatível de withAuth.
 * Rotas existentes continuam funcionando; novas devem usar withAuth.
 */
export function requireAuth(handler, role = null) {
  return withAuth(handler, { role })
}
