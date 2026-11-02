import { createClient } from '@supabase/supabase-js'

// Cargar variables de entorno desde .env.local de forma nativa en Node.js
try {
  process.loadEnvFile('.env.local')
} catch (err) {
  console.warn('Aviso: No se pudo cargar automáticamente .env.local con process.loadEnvFile:', err.message)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const targetEmail = 'mateo.mesa@gmail.com'
const targetPassword = '12345678aA*'
const targetMetadata = { nombre_completo: 'Mesa Mateo' }

async function main() {
  console.log(`Verificando usuario: ${targetEmail}...`)

  // 1. Verificar si el usuario ya existe en auth.users
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('Error consultando auth.users:', listError.message)
    process.exit(1)
  }

  const existingUser = listData.users.find(
    (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
  )

  let userId = null

  if (existingUser) {
    console.log(`Usuario encontrado con ID ${existingUser.id}. Actualizando contraseña y confirmación...`)
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: targetPassword,
        email_confirm: true,
        user_metadata: targetMetadata,
      }
    )

    if (updateError) {
      console.error('Error al actualizar usuario:', updateError.message)
      process.exit(1)
    }

    userId = updated.user.id
    console.log('Usuario actualizado correctamente en auth.users.')
  } else {
    console.log('Creando nuevo usuario en auth.users...')
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password: targetPassword,
      email_confirm: true,
      user_metadata: targetMetadata,
    })

    if (createError) {
      console.error('Error al crear usuario:', createError.message)
      process.exit(1)
    }

    userId = created.user.id
    console.log(`Usuario creado exitosamente con ID: ${userId}`)
  }

  // 2. Verificar existencia y estructura de la tabla pública 'usuarios'
  console.log('Verificando tabla public.usuarios...')
  const { error: probeError } = await supabase
    .from('usuarios')
    .select('id, email, nombre_completo, rol')
    .limit(1)

  if (probeError) {
    console.log('Información sobre tabla public.usuarios:')
    if (probeError.code === '42P01' || probeError.message?.includes('does not exist')) {
      console.log('- La tabla public.usuarios no existe aún en la base de datos.')
      console.log('- No se insertó fila en public.usuarios (puedes ejecutar el SQL de fase1_usuarios.sql para crearla).')
    } else {
      console.log(`- Columnas requeridas (id, email, nombre_completo, rol) no coinciden o inaccesibles: ${probeError.message}`)
      console.log('- Por seguridad no se insertó nada en public.usuarios.')
    }
  } else {
    console.log('Tabla public.usuarios detectada con columnas compatibles. Sincronizando rol admin...')
    const { error: upsertError } = await supabase
      .from('usuarios')
      .upsert({
        id: userId,
        email: targetEmail,
        nombre_completo: targetMetadata.nombre_completo,
        rol: 'admin',
      })

    if (upsertError) {
      console.error('Error al insertar/actualizar en public.usuarios:', upsertError.message)
    } else {
      console.log('Fila insertada/actualizada con éxito en public.usuarios con rol "admin".')
    }
  }

  console.log('Proceso finalizado.')
}

main().catch((err) => {
  console.error('Fallo inesperado:', err)
  process.exit(1)
})
