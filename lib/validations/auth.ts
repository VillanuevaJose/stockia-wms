import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingresa un correo electrónico corporativo válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registroSchema = z
  .object({
    nombre_completo: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(80, 'El nombre no puede exceder 80 caracteres'),
    nombre_negocio: z
      .string()
      .trim()
      .min(2, 'El nombre del negocio debe tener al menos 2 caracteres')
      .max(100, 'El nombre del negocio no puede exceder 100 caracteres'),
    ruc: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => !val || /^[0-9]{11}$/.test(val),
        'El RUC debe tener exactamente 11 dígitos numéricos'
      ),
    email: z
      .string()
      .trim()
      .min(1, 'El correo electrónico es requerido')
      .email('Ingresa un correo electrónico corporativo válido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
      .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número')
      .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un símbolo especial (*, $, @, #, etc.)'),
    confirmarPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarPassword'],
  })

export type RegistroInput = z.infer<typeof registroSchema>
