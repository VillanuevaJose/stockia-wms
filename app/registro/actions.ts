'use server'

import { registrarUsuarioAction } from '../../lib/actions/auth'

export { registrarUsuarioAction }

export async function registrarUsuario(formData: FormData) {
  return registrarUsuarioAction(null, formData)
}
