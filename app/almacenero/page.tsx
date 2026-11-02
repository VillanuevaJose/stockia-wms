import { redirect } from 'next/navigation'

export default function AlmaceneroPage() {
  // Redirige al panel operativo unificado con permisos de almacenero
  redirect('/admin')
}
