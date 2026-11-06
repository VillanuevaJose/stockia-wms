// Generador nativo OpenXML (.xlsx) sin dependencias externas
// Cumple con el estándar ISO/IEC 29500 (SpreadsheetML y DrawingML)

export interface ChartDef {
  type: 'pie' | 'bar' | 'barH'
  title: string
  serie?: string
  fmt?: string
  cats: string[]
  vals: number[]
  catRef: string
  valRef: string
  colors: string[]
  a: [number, number, number, number] // [fromCol, fromRow, toCol, toRow] (0-indexed)
}

export interface SheetOptions {
  cols?: number[]
  freeze?: number
  filter?: string
  grid?: boolean
  first?: boolean
}

export class Sheet {
  name: string
  o: SheetOptions
  cells: Record<number, Record<number, { v: string | number; s: number; f?: string }>>
  merges: string[]
  charts: ChartDef[]
  rowH: Record<number, number>

  constructor(name: string, o: SheetOptions = {}) {
    this.name = name
    this.o = o
    this.cells = {}
    this.merges = []
    this.charts = []
    this.rowH = {}
  }

  set(r: number, c: number, v: string | number, s = 0, f?: string) {
    if (!this.cells[r]) this.cells[r] = {}
    this.cells[r][c] = { v, s, f }
    return this
  }

  xml(hasDraw: boolean): string {
    const rows = Object.keys(this.cells).map(Number).sort((a, b) => a - b)
    const sd = rows.map((r) => {
      const cs = Object.keys(this.cells[r]).map(Number).sort((a, b) => a - b)
      const cellsXml = cs.map((c) => {
        const { v, s, f } = this.cells[r][c]
        const ref = col(c) + r
        if (f) return `<c r="${ref}" s="${s}"><f>${xmlEsc(f)}</f><v>${v}</v></c>`
        if (typeof v === 'number') return `<c r="${ref}" s="${s}"><v>${Number.isFinite(v) ? v : 0}</v></c>`
        if (v === '' || v == null) return `<c r="${ref}" s="${s}"/>`
        return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(String(v))}</t></is></c>`
      }).join('')
      return `<row r="${r}"${this.rowH[r] ? ` ht="${this.rowH[r]}" customHeight="1"` : ''}>${cellsXml}</row>`
    }).join('')

    const o = this.o
    const colsXml = o.cols ? `<cols>${o.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''
    const filterXml = o.filter ? `<autoFilter ref="${o.filter}"/>` : ''
    const mergesXml = this.merges.length ? `<mergeCells count="${this.merges.length}">${this.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''
    const paneXml = o.freeze ? `<pane ySplit="${o.freeze}" topLeftCell="A${o.freeze + 1}" activePane="bottomLeft" state="frozen"/>` : ''

    return HEAD + `<worksheet ${NS}><sheetViews><sheetView workbookViewId="0"${o.grid === false ? ' showGridLines="0"' : ''}${o.first ? ' tabSelected="1"' : ''}>${paneXml}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="16"/>${colsXml}<sheetData>${sd}</sheetData>${filterXml}${mergesXml}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToHeight="0"/>${hasDraw ? '<drawing r:id="rId1"/>' : ''}</worksheet>`
  }
}

const enc = new TextEncoder()
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(b: Uint8Array): number {
  let c = 0xFFFFFFFF
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 255] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

const u16 = (n: number) => [n & 255, (n >> 8) & 255]
const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]

export function col(n: number): string {
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function xmlEsc(s: string): string {
  return String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// Estilos WMS Editorial (#16201C tinta, #FAFAF7 papel, #E7E5DF bordes, Manrope / Segoe)
const STYLES = HEAD + `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2">
  <numFmt numFmtId="164" formatCode="&quot;S/ &quot;#,##0.00"/>
  <numFmt numFmtId="165" formatCode="#,##0"/>
</numFmts>
<fonts count="10">
  <font><sz val="10"/><name val="Segoe UI"/></font>
  <font><b/><sz val="15"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>
  <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>
  <font><b/><sz val="10"/><color rgb="FF16201C"/><name val="Segoe UI"/></font>
  <font><b/><sz val="12"/><color rgb="FFE8A33D"/><name val="Segoe UI"/></font>
  <font><sz val="10"/><color rgb="FF6B7A72"/><name val="Segoe UI"/></font>
  <font><b/><sz val="10"/><color rgb="FFC93B3B"/><name val="Segoe UI"/></font>
  <font><b/><sz val="10"/><color rgb="FFC97D1A"/><name val="Segoe UI"/></font>
  <font><b/><sz val="10"/><color rgb="FF2A7A4C"/><name val="Segoe UI"/></font>
  <font><sz val="10"/><color rgb="FF16201C"/><name val="Consolas"/></font>
</fonts>
<fills count="9">
  <fill><patternFill patternType="none"/></fill>
  <fill><patternFill patternType="gray125"/></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FF16201C"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FF2A3B34"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFFAFAF7"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFE7E5DF"/></patternFill></fill>
</fills>
<borders count="2">
  <border><left/><right/><top/><bottom/><diagonal/></border>
  <border><left style="thin"><color rgb="FFE7E5DF"/></left><right style="thin"><color rgb="FFE7E5DF"/></right><top style="thin"><color rgb="FFE7E5DF"/></top><bottom style="thin"><color rgb="FFE7E5DF"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="20">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
  <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
  <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  <xf numFmtId="0" fontId="7" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
  <xf numFmtId="164" fontId="7" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
  <xf numFmtId="164" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  <xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
  <xf numFmtId="164" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  <xf numFmtId="0" fontId="6" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
  <xf numFmtId="164" fontId="6" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
  <xf numFmtId="0" fontId="8" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
  <xf numFmtId="164" fontId="8" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  <xf numFmtId="0" fontId="9" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  <xf numFmtId="165" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  <xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

const CNS = 'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

function chartXml(ch: ChartDef): string {
  const sc = (a: string[]) => `<c:strCache><c:ptCount val="${a.length}"/>${a.map((v, i) => `<c:pt idx="${i}"><c:v>${xmlEsc(v)}</c:v></c:pt>`).join('')}</c:strCache>`
  const nc = (a: number[]) => `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${a.length}"/>${a.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')}</c:numCache>`
  const fill = (c: string) => `<a:solidFill><a:srgbClr val="${c}"/></a:solidFill>`
  const cat = `<c:cat><c:strRef><c:f>${xmlEsc(ch.catRef)}</c:f>${sc(ch.cats)}</c:strRef></c:cat>`
  const val = `<c:val><c:numRef><c:f>${xmlEsc(ch.valRef)}</c:f>${nc(ch.vals)}</c:numRef></c:val>`
  const title = `<c:title><c:tx><c:rich><a:bodyPr/><a:p><a:pPr><a:defRPr sz="1100" b="1"/></a:pPr><a:r><a:rPr lang="es-PE" sz="1100" b="1"/><a:t>${xmlEsc(ch.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`
  const lbl = (v: number, p: number) => `<c:dLbls><c:showLegendKey val="0"/><c:showVal val="${v}"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="${p}"/><c:showBubbleSize val="0"/></c:dLbls>`

  let plot = ''
  let legend = ''

  if (ch.type === 'pie') {
    plot = `<c:pieChart><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${xmlEsc(ch.title)}</c:v></c:tx>${ch.cats.map((_, i) => `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr>${fill(ch.colors[i % ch.colors.length])}</c:spPr></c:dPt>`).join('')}${lbl(0, 1)}${cat}${val}</c:ser><c:firstSliceAng val="0"/></c:pieChart>`
    legend = '<c:legend><c:legendPos val="r"/><c:overlay val="0"/></c:legend>'
  } else {
    const h = ch.type === 'barH'
    plot = `<c:barChart><c:barDir val="${h ? 'bar' : 'col'}"/><c:grouping val="clustered"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${xmlEsc(ch.serie || 'Valor')}</c:v></c:tx><c:spPr>${fill(ch.colors[0])}</c:spPr><c:invertIfNegative val="0"/>${lbl(1, 0)}${cat}${val}</c:ser><c:gapWidth val="60"/><c:axId val="111"/><c:axId val="222"/></c:barChart>` +
      `<c:catAx><c:axId val="111"/><c:scaling><c:orientation val="${h ? 'maxMin' : 'minMax'}"/></c:scaling><c:delete val="0"/><c:axPos val="${h ? 'l' : 'b'}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="222"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
      `<c:valAx><c:axId val="222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${h ? 'b' : 'l'}"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E7E5DF"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="${xmlEsc(ch.fmt || 'General')}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="111"/><c:crosses val="${h ? 'max' : 'autoZero'}"/><c:crossBetween val="between"/></c:valAx>`
  }

  return HEAD + `<c:chartSpace ${CNS}><c:roundedCorners val="0"/><c:chart>${title}<c:plotArea><c:layout/>${plot}</c:plotArea>${legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`
}

function drawingXml(charts: ChartDef[]): string {
  return HEAD + `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">` +
    charts.map((ch, i) => `<xdr:twoCellAnchor><xdr:from><xdr:col>${ch.a[0]}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${ch.a[1]}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${ch.a[2]}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${ch.a[3]}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Grafico ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" y="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId${i + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`).join('') + '</xdr:wsDr>'
}

export function packXlsx(sheets: Sheet[]): Uint8Array {
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const files: [string, string][] = []
  const ct: string[] = []
  const wbRels: string[] = []
  const wbSheets: string[] = []
  let nChart = 0
  let nDraw = 0

  sheets.forEach((sh, i) => {
    const n = i + 1
    const hasDraw = sh.charts.length > 0
    files.push([`xl/worksheets/sheet${n}.xml`, sh.xml(hasDraw)])
    ct.push(`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    wbRels.push(`<Relationship Id="rId${n}" Type="${REL}/worksheet" Target="worksheets/sheet${n}.xml"/>`)
    wbSheets.push(`<sheet name="${xmlEsc(sh.name)}" sheetId="${n}" r:id="rId${n}"/>`)

    if (hasDraw) {
      const d = ++nDraw
      files.push([`xl/worksheets/_rels/sheet${n}.xml.rels`, HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/drawing" Target="../drawings/drawing${d}.xml"/></Relationships>`])
      files.push([`xl/drawings/drawing${d}.xml`, drawingXml(sh.charts)])
      ct.push(`<Override PartName="/xl/drawings/drawing${d}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`)
      const rels = sh.charts.map((ch, k) => {
        const c = ++nChart
        files.push([`xl/charts/chart${c}.xml`, chartXml(ch)])
        ct.push(`<Override PartName="/xl/charts/chart${c}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`)
        return `<Relationship Id="rId${k + 1}" Type="${REL}/chart" Target="../charts/chart${c}.xml"/>`
      }).join('')
      files.push([`xl/drawings/_rels/drawing${d}.xml.rels`, HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`])
    }
  })

  const k = sheets.length + 1
  wbRels.push(`<Relationship Id="rId${k}" Type="${REL}/styles" Target="styles.xml"/>`)

  files.unshift(
    ['[Content_Types].xml', HEAD + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${ct.join('')}</Types>`],
    ['_rels/.rels', HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', HEAD + `<workbook ${NS}><bookViews><workbookView activeTab="0"/></bookViews><sheets>${wbSheets.join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels.join('')}</Relationships>`],
    ['xl/styles.xml', STYLES]
  )

  // Empaquetador ZIP plano estándar sin compresión (método 0)
  const out: Uint8Array[] = []
  const cd: Uint8Array[] = []
  let off = 0
  let size = 0

  files.forEach(([name, data]) => {
    const nb = enc.encode(name)
    const b = enc.encode(data)
    const c = crc32(b)
    const lh = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(b.length), ...u32(b.length), ...u16(nb.length), ...u16(0)])
    out.push(lh, nb, b)
    cd.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(b.length), ...u32(b.length), ...u16(nb.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nb)
    off += lh.length + nb.length + b.length
  })

  cd.forEach((p) => { size += p.length })
  const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(size), ...u32(off), ...u16(0)])
  const all = [...out, ...cd, end]
  const buf = new ArrayBuffer(off + size + end.length)
  const res = new Uint8Array(buf)
  let p = 0
  all.forEach((a) => {
    res.set(a, p)
    p += a.length
  })

  return res
}
