'use server'

import { iniciarSesionAction, cerrarSesionAction } from '../../lib/actions/auth'

export { iniciarSesionAction, cerrarSesionAction }

// Compatibilidad con formularios directos anteriores
export async function iniciarSesion(formData: FormData) {
  return iniciarSesionAction(null, formData)
}
