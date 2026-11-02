import { NextResponse, type NextRequest } from 'next/server'
import { parseFastAuthUser } from './lib/supabase/auth-fast'

export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname

  // Rutas protegidas que requieren sesión activa
  const isProtectedPath =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/almacenero') ||
    pathname.startsWith('/vendedor')

  // Rutas públicas de autenticación (si ya tiene sesión, redirige al panel)
  const isAuthPath = pathname.startsWith('/login') || pathname.startsWith('/registro')

  // Si no es ruta protegida ni de auth, continuar inmediatamente (0ms)
  if (!isProtectedPath && !isAuthPath) {
    return supabaseResponse
  }

  const allCookies = request.cookies.getAll()
  const fastUser = parseFastAuthUser(allCookies)

  // 1. Si tiene sesión válida verificada en memoria
  if (fastUser) {
    if (isAuthPath) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname =
        fastUser.rol === 'vendedor'
          ? '/vendedor'
          : fastUser.rol === 'almacenero'
          ? '/almacenero'
          : '/admin'
      return NextResponse.redirect(redirectUrl)
    }

    // Control de acceso RBAC por rol
    if (fastUser.rol === 'vendedor') {
      const allowedVendedor =
        pathname === '/vendedor' ||
        pathname.startsWith('/vendedor/') ||
        pathname === '/admin/productos' ||
        pathname.startsWith('/admin/ventas')

      if (!allowedVendedor && (pathname.startsWith('/admin') || pathname.startsWith('/almacenero'))) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/vendedor'
        return NextResponse.redirect(redirectUrl)
      }
    } else if (fastUser.rol === 'almacenero') {
      const forbiddenAlmacenero =
        pathname.startsWith('/admin/usuarios') ||
        pathname.startsWith('/admin/configuracion') ||
        pathname.startsWith('/admin/ventas') ||
        pathname.startsWith('/vendedor')

      if (forbiddenAlmacenero) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/almacenero'
        return NextResponse.redirect(redirectUrl)
      }
    }

    return supabaseResponse
  }

  // 2. Si no se pudo parsear pero tiene cookies de Supabase (por ejemplo durante login activo)
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') && (c.name.includes('-auth-token') || c.name.includes('access-token'))
  )

  // Si tiene cookies de auth, no rebotar: permitir que el Server Component en layout.tsx lo verifique
  if (hasAuthCookie) {
    return supabaseResponse
  }

  // 3. Solo si NO tiene ninguna cookie de autenticación y la ruta es protegida, redirigir a login
  if (isProtectedPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica el proxy a todas las rutas excepto archivos estáticos,
     * imágenes y favicon.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
