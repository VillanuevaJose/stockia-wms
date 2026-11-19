import { describe, it, expect } from 'vitest'
import { loginSchema, registroSchema } from '@/lib/validations/auth'

describe('Validaciones de Autenticación Zod', () => {
  describe('loginSchema', () => {
    it('acepta credenciales con formato válido', () => {
      const valid = loginSchema.safeParse({
        email: 'admin@stockia.pe',
        password: 'Password123*',
      })
      expect(valid.success).toBe(true)
    })

    it('rechaza correos con formato inválido', () => {
      const invalid = loginSchema.safeParse({
        email: 'correo-sin-arroba',
        password: 'Password123*',
      })
      expect(invalid.success).toBe(false)
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toContain('correo electrónico')
      }
    })

    it('rechaza contraseñas de menos de 6 caracteres', () => {
      const invalid = loginSchema.safeParse({
        email: 'admin@stockia.pe',
        password: '123',
      })
      expect(invalid.success).toBe(false)
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toContain('al menos 6 caracteres')
      }
    })
  })

  describe('registroSchema', () => {
    const validData = {
      nombre_completo: 'Carlos Almirón',
      nombre_negocio: 'Ferretería Central',
      ruc: '20601234567',
      email: 'carlos@ferreteriacentral.pe',
      password: 'SecurePassword123!',
      confirmarPassword: 'SecurePassword123!',
    }

    it('acepta registro corporativo completo y válido', () => {
      const res = registroSchema.safeParse(validData)
      expect(res.success).toBe(true)
    })

    it('rechaza contraseñas que no coinciden en confirmarPassword', () => {
      const res = registroSchema.safeParse({
        ...validData,
        confirmarPassword: 'DiferentePassword123!',
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('Las contraseñas no coinciden')
      }
    })

    it('valida la complejidad de la contraseña (mayúscula, minúscula, número, símbolo)', () => {
      const sinSimbolo = registroSchema.safeParse({
        ...validData,
        password: 'SoloTextoYNumero123',
        confirmarPassword: 'SoloTextoYNumero123',
      })
      expect(sinSimbolo.success).toBe(false)
      if (!sinSimbolo.success) {
        expect(sinSimbolo.error.issues[0].message).toContain('símbolo especial')
      }
    })

    it('exige formato RUC de exactamente 11 dígitos numéricos cuando se provee', () => {
      const rucInvalido = registroSchema.safeParse({
        ...validData,
        ruc: '12345',
      })
      expect(rucInvalido.success).toBe(false)
      if (!rucInvalido.success) {
        expect(rucInvalido.error.issues[0].message).toContain('11 dígitos numéricos')
      }
    })
  })
})
