'use server'

import {
  registrarVentaAction as _registrarVentaAction,
  buscarProductosParaVentaAction as _buscarProductosParaVentaAction,
  obtenerResumenCajaTurnoAction as _obtenerResumenCajaTurnoAction,
  registrarArqueoCajaAction as _registrarArqueoCajaAction,
  obtenerDetalleVentaAction as _obtenerDetalleVentaAction,
} from '@/lib/actions/ventas'

export async function registrarVentaAction(...args: Parameters<typeof _registrarVentaAction>) {
  return _registrarVentaAction(...args)
}

export async function buscarProductosParaVentaAction(...args: Parameters<typeof _buscarProductosParaVentaAction>) {
  return _buscarProductosParaVentaAction(...args)
}

export async function obtenerResumenCajaTurnoAction(...args: Parameters<typeof _obtenerResumenCajaTurnoAction>) {
  return _obtenerResumenCajaTurnoAction(...args)
}

export async function registrarArqueoCajaAction(...args: Parameters<typeof _registrarArqueoCajaAction>) {
  return _registrarArqueoCajaAction(...args)
}

export async function obtenerDetalleVentaAction(...args: Parameters<typeof _obtenerDetalleVentaAction>) {
  return _obtenerDetalleVentaAction(...args)
}

export type { DetalleVentaCompleto } from '@/lib/actions/ventas'
