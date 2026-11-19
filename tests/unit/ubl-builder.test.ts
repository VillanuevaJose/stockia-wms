import { describe, it, expect } from 'vitest'
import { buildInvoiceUblXml } from '@/lib/sunat/ubl-builder'
import type { DetalleVentaCompleto } from '@/lib/actions/ventas'

describe('SUNAT UBL 2.1 Builder', () => {
  const mockVentaBoleta: DetalleVentaCompleto = {
    id: 'sale-001',
    numero_comprobante: 'B001-00000042',
    serie: 'B001',
    correlativo: 42,
    fecha: '2026-03-15T10:30:00.000Z',
    estado: 'COMPLETADA',
    subtotal: 100.0,
    impuesto: 18.0,
    total: 118.0,
    cliente: {
      nombre: 'Juan Pérez',
      documento: '72345678',
    },
    vendedor: {
      nombre: 'Vendedor Principal',
    },
    almacen: {
      nombre: 'Sede Central Lima',
    },
    items: [
      {
        id: 'item-1',
        sku: 'CAJA-50L',
        nombre: 'Caja Organizadora 50L',
        cantidad: 2,
        precio_unitario: 59.0,
        subtotal: 118.0,
      },
    ],
    pagos: [
      {
        id: 'pago-1',
        metodo: 'EFECTIVO',
        monto: 118.0,
        fecha: '2026-03-15T10:30:00.000Z',
      },
    ],
  }

  const mockVentaFactura: DetalleVentaCompleto = {
    ...mockVentaBoleta,
    numero_comprobante: 'F001-00000100',
    serie: 'F001',
    correlativo: 100,
    cliente: {
      nombre: 'Corporación Andina S.A.C.',
      documento: '20555666777',
    },
  }

  it('determina correctamente el código de comprobante SUNAT (03 para Boleta, 01 para Factura)', () => {
    const resBoleta = buildInvoiceUblXml(mockVentaBoleta)
    expect(resBoleta.filename).toContain('-03-B001-00000042.xml')

    const resFactura = buildInvoiceUblXml(mockVentaFactura)
    expect(resFactura.filename).toContain('-01-F001-00000100.xml')
  })

  it('genera un hash digest SHA-256 válido para la firma digital UBL', () => {
    const res = buildInvoiceUblXml(mockVentaBoleta)
    expect(res.digestValue).toBeDefined()
    expect(res.digestValue.length).toBeGreaterThan(10)
    expect(res.signatureValue).toBeDefined()
  })

  it('incluye los nodos XML mandatorios con impuestos desagregados (18% IGV)', () => {
    const res = buildInvoiceUblXml(mockVentaBoleta)
    expect(res.xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>')
    expect(res.xml).toContain('<cbc:Percent>18.00</cbc:Percent>')
    expect(res.xml).toContain('<cac:TaxScheme>')
    expect(res.xml).toContain('<cbc:ID>1000</cbc:ID>')
    expect(res.xml).toContain('<cbc:Name>IGV</cbc:Name>')
    expect(res.xml).toContain('118.00')
  })

  it('construye la cadena para código QR oficial de SUNAT con el formato delimitado por barras', () => {
    const res = buildInvoiceUblXml(mockVentaBoleta, { ruc: '20609999999' })
    // Formato SUNAT: RUC|TIPO|SERIE|NUMERO|IGV|TOTAL|FECHA|TIPODOC|NUMDOC|
    const parts = res.sunatQrString.split('|')
    expect(parts[0]).toBe('20609999999')
    expect(parts[1]).toBe('03') // Boleta
    expect(parts[2]).toBe('B001')
    expect(parts[3]).toBe('00000042')
    expect(parts[4]).toBe('18.00')
    expect(parts[5]).toBe('118.00')
    expect(parts[7]).toBe('1') // Tipo doc DNI
    expect(parts[8]).toBe('72345678')
  })
})
