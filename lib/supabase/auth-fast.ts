// Obsoleto: La verificación de autenticación se realiza de forma canónica mediante @supabase/ssr getUser()
// garantizando la validación de firma criptográfica y mitigando cualquier riesgo de spoofing.
export interface FastAuthUser {
  id: string
  email: string
  nombreCompleto: string
  rol: 'admin' | 'almacenero' | 'vendedor'
}

export function parseFastAuthUser(): FastAuthUser | null {
  return null
}
