export interface RunwayProjection {
  demandaDiaria: number
  runwayDias: number | null
  fechaQuiebreIso: string | null
  stockSeguridad: number
  rop: number
  estado: 'CRITICO' | 'REORDEN' | 'OPTIMO'
  cantidadSugerida: number
  inversionEstimada: number
}

/**
 * Calcula velocidad de venta ponderada (60% últimos 10 días + 40% días 11..30),
 * días de cobertura restantes (Runway) y punto de reorden dinámico (ROP).
 */
export function calcularProyeccionRopRunway(params: {
  stock: number
  stockMinimo: number
  costoUnitario: number
  ventas10d: number
  ventas20dPrev: number
  leadTimeDias: number
}): RunwayProjection {
  const { stock, stockMinimo, costoUnitario, ventas10d, ventas20dPrev, leadTimeDias } = params

  const tasaReciente = ventas10d / 10
  const tasaPrevia = ventas20dPrev / 20
  const demandaDiaria =
    ventas10d > 0 || ventas20dPrev > 0 ? tasaReciente * 0.6 + tasaPrevia * 0.4 : 0

  const runwayDias =
    stock <= 0 ? 0 : demandaDiaria > 0 ? Math.floor(stock / demandaDiaria) : null

  let fechaQuiebreIso: string | null = null
  if (runwayDias !== null) {
    const fecha = new Date()
    fecha.setDate(fecha.getDate() + runwayDias)
    fechaQuiebreIso = fecha.toISOString()
  }

  const stockSeguridad = Math.max(stockMinimo, Math.ceil(demandaDiaria * 3))
  const rop = Math.ceil(demandaDiaria * leadTimeDias + stockSeguridad)

  let estado: 'CRITICO' | 'REORDEN' | 'OPTIMO' = 'OPTIMO'
  let cantidadSugerida = 0

  const enQuiebreInminente = runwayDias !== null && runwayDias <= 2
  const bajoCoberturaLeadTime = runwayDias !== null && runwayDias <= leadTimeDias + 2

  if (stock <= 0 || enQuiebreInminente) {
    estado = 'CRITICO'
    const coberturaObjetivo = Math.ceil(demandaDiaria * (leadTimeDias + 14))
    cantidadSugerida = Math.max(
      coberturaObjetivo - Math.max(stock, 0),
      rop * 2,
      stockSeguridad * 2,
      10
    )
  } else if (stock <= rop || bajoCoberturaLeadTime) {
    estado = 'REORDEN'
    const coberturaObjetivo = Math.ceil(demandaDiaria * (leadTimeDias + 14))
    cantidadSugerida = Math.max(
      coberturaObjetivo - stock,
      rop * 2 - stock,
      stockSeguridad - stock,
      5
    )
  }

  if (cantidadSugerida > 0) {
    cantidadSugerida = Math.ceil(cantidadSugerida / 5) * 5
  }

  const inversionEstimada = Math.round(cantidadSugerida * costoUnitario * 100) / 100

  return {
    demandaDiaria: Number(demandaDiaria.toFixed(2)),
    runwayDias,
    fechaQuiebreIso,
    stockSeguridad,
    rop,
    estado,
    cantidadSugerida,
    inversionEstimada,
  }
}
