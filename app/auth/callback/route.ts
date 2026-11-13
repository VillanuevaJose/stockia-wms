import { createClient } from '../../../lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next')

  const supabase = await createClient()
  let authUser = null

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      authUser = data.user
    }
  } else if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    })
    if (!error && data.user) {
      authUser = data.user
    }
  }

  if (authUser) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol, activo')
      .eq('id', authUser.id)
      .maybeSingle()

    if (perfil && perfil.activo === false) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=desactivado`)
    }

    // Si el usuario fue invitado o aún no ha configurado su contraseña personal,
    // se le deriva OBLIGATORIAMENTE al apartado exclusivo para configurar su cuenta
    const isInvite =
      type === 'invite' ||
      type === 'recovery' ||
      next === '/completar-invitacion' ||
      !authUser.user_metadata?.password_set

    if (isInvite) {
      return NextResponse.redirect(`${origin}/completar-invitacion`)
    }

    // Si viene un parámetro next seguro
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    const targetPath =
      perfil?.rol === 'vendedor'
        ? '/vendedor'
        : perfil?.rol === 'almacenero'
        ? '/almacenero'
        : '/admin'

    return NextResponse.redirect(`${origin}${targetPath}`)
  }

  return NextResponse.redirect(`${origin}/login?error=enlace_invalido`)
}
