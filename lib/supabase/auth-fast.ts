// Validación instantánea (0ms de latencia de red) de tokens de sesión Supabase en cookies
export interface FastAuthUser {
  id: string
  email: string
  nombreCompleto: string
  rol: 'admin' | 'almacenero' | 'vendedor'
}

interface CookieLike {
  name: string
  value: string
}

export function parseFastAuthUser(cookies: CookieLike[]): FastAuthUser | null {
  try {
    // Filtrar estrictamente cookies de token: sb-<project>-auth-token o sb-<project>-auth-token.0, .1
    // Excluir terminantemente -code-verifier, -flow, etc.
    const AUTH_COOKIE_REGEX = /^sb-[a-zA-Z0-9_-]+-auth-token(\.\d+)?$/
    const authCookies = cookies.filter((c) => AUTH_COOKIE_REGEX.test(c.name))

    if (authCookies.length === 0) {
      return null
    }

    // Reconstruir valor ordenando chunks numéricamente
    authCookies.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    let rawVal = authCookies.map((c) => c.value).join('')

    // Decodificar caracteres URL si el navegador los codificó (%3D, %2B, %2F)
    try {
      rawVal = decodeURIComponent(rawVal)
    } catch {}

    let jsonStr = rawVal.trim()
    if (jsonStr.startsWith('base64-')) {
      jsonStr = Buffer.from(jsonStr.slice(7), 'base64').toString('utf8')
    }

    const parsed = JSON.parse(jsonStr)
    const token =
      typeof parsed === 'string'
        ? parsed
        : Array.isArray(parsed)
          ? parsed[0]
          : parsed.access_token
    if (!token || typeof token !== 'string') return null

    const parts = token.split('.')
    if (parts.length < 2) return null

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
    if (!payload.sub || !payload.exp) return null

    // Verificar si el token no ha expirado (con 10 segundos de margen preventivo)
    if (payload.exp * 1000 < Date.now() + 10000) {
      return null
    }

    const validRoles = ['admin', 'almacenero', 'vendedor'] as const
    const rawRole = payload.user_metadata?.rol || payload.app_metadata?.role || 'admin'
    const rol = (validRoles.includes(rawRole) ? rawRole : 'admin') as FastAuthUser['rol']

    return {
      id: payload.sub,
      email: payload.email || '',
      nombreCompleto:
        payload.user_metadata?.nombre_completo ||
        payload.email?.split('@')[0] ||
        'Colaborador',
      rol,
    }
  } catch (err) {
    console.warn('[AUTH FAST PARSE NOTICE]', err instanceof Error ? err.message : err)
    return null
  }
}
