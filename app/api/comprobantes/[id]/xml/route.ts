import { NextRequest, NextResponse } from 'next/server'
import { obtenerDetalleVentaAction } from '@/lib/actions/ventas'
import { buildInvoiceUblXml } from '@/lib/sunat/ubl-builder'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID de comprobante no proporcionado' }, { status: 400 })
    }

    const res = await obtenerDetalleVentaAction(id)
    if (!res.success || !res.venta) {
      return NextResponse.json({ error: res.error || 'Comprobante no encontrado' }, { status: 404 })
    }

    const adminClient = createAdminClient()
    const { data: negocio } = await adminClient.from('negocio').select('ruc, nombre').limit(1).maybeSingle()

    const { xml, filename } = buildInvoiceUblXml(res.venta, {
      ruc: negocio?.ruc || undefined,
      razon_social: negocio?.nombre ? `${negocio.nombre.toUpperCase()} S.A.C.` : undefined,
    })

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('[API COMPROBANTE XML ERROR]', error)
    return NextResponse.json({ error: 'Error al generar el archivo XML UBL 2.1' }, { status: 500 })
  }
}
