import { redirect } from 'next/navigation'

// Redirige al catálogo de productos donde la edición se gestiona mediante el drawer lateral
export default function EditarProductoRedirect() {
  redirect('/admin/productos')
}
