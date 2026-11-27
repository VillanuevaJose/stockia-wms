export interface ParsedXmlLine {
  sku: string | null
  descripcion: string
  cantidad: number
  costoUnitario: number
  subtotal: number
}

export interface ParsedSunatInvoice {
  numeroComprobante: string
  fechaEmision: string | null
  moneda: string
  proveedorRuc: string
  proveedorNombre: string
  total: number
  lineas: ParsedXmlLine[]
}

function getElementsByLocalName(root: Element | Document, localName: string): Element[] {
  const result: Element[] = []
  const all = root.getElementsByTagName('*')
  for (let i = 0; i < all.length; i++) {
    const el = all[i]
    if (el.localName === localName || el.tagName.endsWith(`:${localName}`) || el.tagName === localName) {
      result.push(el)
    }
  }
  return result
}

function getDirectChildText(parent: Element, localName: string): string {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i]
    if (
      child.localName === localName ||
      child.tagName.endsWith(`:${localName}`) ||
      child.tagName === localName
    ) {
      return child.textContent?.trim() || ''
    }
  }
  return ''
}

function getFirstDescendantText(root: Element, localName: string): string {
  const found = getElementsByLocalName(root, localName)
  return found[0]?.textContent?.trim() || ''
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parsea un comprobante electrónico XML UBL 2.1 de SUNAT (Factura / Boleta)
 * en el navegador sin dependencias externas.
 */
export function parseSunatInvoiceXml(xmlText: string): ParsedSunatInvoice {
  if (!xmlText.trim()) {
    throw new Error('El archivo XML está vacío.')
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')
  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error('El archivo no tiene un formato XML válido.')
  }

  const root = doc.documentElement
  const rootName = root.localName || root.tagName
  if (!['Invoice', 'CreditNote', 'DebitNote'].some((tag) => rootName.includes(tag))) {
    throw new Error('El XML no corresponde a un comprobante electrónico UBL 2.1 válido (Invoice).')
  }

  const numeroComprobante = getDirectChildText(root, 'ID')
  if (!numeroComprobante) {
    throw new Error('No se encontró el número de comprobante (<cbc:ID>) en el XML.')
  }

  const fechaEmision = getDirectChildText(root, 'IssueDate') || null
  const moneda = getDirectChildText(root, 'DocumentCurrencyCode') || 'PEN'

  // Datos del emisor (Proveedor)
  const supplierParty = getElementsByLocalName(root, 'AccountingSupplierParty')[0]
  let proveedorRuc = ''
  let proveedorNombre = ''

  if (supplierParty) {
    const partyIdEl = getElementsByLocalName(supplierParty, 'PartyIdentification')[0]
    proveedorRuc = partyIdEl ? getFirstDescendantText(partyIdEl, 'ID') : ''

    const legalEl = getElementsByLocalName(supplierParty, 'PartyLegalEntity')[0]
    proveedorNombre = legalEl ? getFirstDescendantText(legalEl, 'RegistrationName') : ''

    if (!proveedorNombre) {
      const partyNameEl = getElementsByLocalName(supplierParty, 'PartyName')[0]
      proveedorNombre = partyNameEl ? getFirstDescendantText(partyNameEl, 'Name') : ''
    }
  }

  // Líneas de detalle
  let lineNodes = getElementsByLocalName(root, 'InvoiceLine')
  if (lineNodes.length === 0) {
    lineNodes = getElementsByLocalName(root, 'DebitNoteLine')
  }

  const lineas: ParsedXmlLine[] = []
  for (const line of lineNodes) {
    const cantText =
      getDirectChildText(line, 'InvoicedQuantity') ||
      getDirectChildText(line, 'DebitedQuantity') ||
      '1'
    const cantidad = Math.max(0.01, Number(cantText) || 1)

    const itemEl = getElementsByLocalName(line, 'Item')[0]
    const descripcion = itemEl ? getFirstDescendantText(itemEl, 'Description') : 'Artículo XML'
    const sellerIdEl = itemEl ? getElementsByLocalName(itemEl, 'SellersItemIdentification')[0] : undefined
    const sku = sellerIdEl ? getFirstDescendantText(sellerIdEl, 'ID') || null : null

    const lineExt = Number(getDirectChildText(line, 'LineExtensionAmount')) || 0
    const priceEl = getElementsByLocalName(line, 'Price')[0]
    const priceAmount = priceEl ? Number(getFirstDescendantText(priceEl, 'PriceAmount')) || 0 : 0

    let costoUnitario = priceAmount
    if (costoUnitario <= 0 && lineExt > 0) {
      costoUnitario = Math.round((lineExt / cantidad) * 100) / 100
    }

    const subtotal = lineExt > 0 ? lineExt : Math.round(cantidad * costoUnitario * 100) / 100

    lineas.push({
      sku,
      descripcion: descripcion || 'Artículo sin descripción',
      cantidad,
      costoUnitario: Math.round(costoUnitario * 100) / 100,
      subtotal,
    })
  }

  if (lineas.length === 0) {
    throw new Error('No se encontraron líneas de detalle (<cac:InvoiceLine>) en el comprobante XML.')
  }

  const legalTotalEl = getElementsByLocalName(root, 'LegalMonetaryTotal')[0]
  const payable = legalTotalEl ? Number(getFirstDescendantText(legalTotalEl, 'PayableAmount')) || 0 : 0
  const total =
    payable > 0 ? payable : Math.round(lineas.reduce((acc, l) => acc + l.subtotal, 0) * 100) / 100

  return {
    numeroComprobante,
    fechaEmision,
    moneda,
    proveedorRuc: proveedorRuc.replace(/\D/g, '').slice(0, 11),
    proveedorNombre,
    total,
    lineas,
  }
}

export function matchProductoDesdeXml<
  T extends { id: string; nombre: string; sku: string; codigo_barras?: string | null }
>(linea: ParsedXmlLine, catalogo: T[]): T | null {
  if (linea.sku) {
    const skuNorm = linea.sku.trim().toLowerCase()
    const exacto = catalogo.find(
      (p) =>
        p.sku?.trim().toLowerCase() === skuNorm ||
        (p.codigo_barras && p.codigo_barras.trim().toLowerCase() === skuNorm)
    )
    if (exacto) return exacto
  }

  const descNorm = normalizeText(linea.descripcion)
  if (!descNorm) return null

  const exactNombre = catalogo.find((p) => normalizeText(p.nombre) === descNorm)
  if (exactNombre) return exactNombre

  const descTokens = descNorm.split(' ').filter((t) => t.length >= 3)
  if (descTokens.length === 0) return null

  let mejorProducto: T | null = null
  let mejorScore = 0

  for (const prod of catalogo) {
    const prodTokens = normalizeText(prod.nombre).split(' ').filter((t) => t.length >= 3)
    if (prodTokens.length === 0) continue

    const coincidencias = prodTokens.filter((t) => descTokens.includes(t)).length
    const score = coincidencias / Math.max(prodTokens.length, 1)

    if (score >= 0.5 && score > mejorScore) {
      mejorScore = score
      mejorProducto = prod
    }
  }

  return mejorProducto
}
