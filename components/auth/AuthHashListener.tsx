'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export function AuthHashListener() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token=')) return

    const cleanHash = hash.replace(/^#/, '')
    const params = new URLSearchParams(cleanHash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (accessToken && refreshToken) {
      const supabase = createClient()
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .then(({ data, error }) => {
          if (!error && data.session) {
            // Limpiar el hash de la barra de direcciones por seguridad
            window.history.replaceState(null, '', window.location.pathname)

            const isInvite =
              type === 'invite' ||
              type === 'recovery' ||
              !data.session.user.user_metadata?.password_set

            if (isInvite) {
              router.replace('/completar-invitacion')
            } else {
              router.replace('/admin')
            }
          }
        })
    }
  }, [router])

  return null
}
