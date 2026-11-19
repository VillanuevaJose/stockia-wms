import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. Si tiene sesión válida verificada criptográficamente por Supabase
  if (user) {
    const rol = (user.user_metadata?.rol || 'admin') as 'admin' | 'almacenero' | 'vendedor'

    if (isAuthPath) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname =
        rol === 'vendedor'
          ? '/vendedor'
          : rol === 'almacenero'
          ? '/almacenero'
          : '/admin'
      return NextResponse.redirect(redirectUrl)
    }

    // Control de acceso RBAC por rol
    if (rol === 'vendedor') {
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
    } else if (rol === 'almacenero') {
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

  // 2. Si es ruta protegida y no tiene sesión válida comprobada
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
