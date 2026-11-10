import { createClient } from '../../../lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol, activo')
        .eq('id', data.user.id)
        .maybeSingle()

      if (perfil && perfil.activo === false) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=desactivado`)
      }

      const targetPath =
        perfil?.rol === 'vendedor'
          ? '/vendedor'
          : perfil?.rol === 'almacenero'
          ? '/almacenero'
          : '/admin'

      return NextResponse.redirect(`${origin}${targetPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
