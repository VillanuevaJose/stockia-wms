import { createHash } from 'crypto'
import type { DetalleVentaCompleto } from '@/lib/actions/ventas'

export interface UblGenerationResult {
  xml: string
  digestValue: string
  signatureValue: string
  filename: string
  sunatQrString: string
}

export function buildInvoiceUblXml(venta: DetalleVentaCompleto): UblGenerationResult {
  const rucEmisor = '20601234567'
  const razonSocialEmisor = 'STOCKIA LOGÍSTICA PERÚ S.A.C.'
  const tipoComprobante = venta.serie.startsWith('F') ? '01' : '03'
  const correlativoStr = String(venta.correlativo).padStart(8, '0')
  const filename = `${rucEmisor}-${tipoComprobante}-${venta.serie}-${correlativoStr}.xml`

  const fechaObj = new Date(venta.fecha)
  const fechaYmd = fechaObj.toISOString().slice(0, 10)
  const horaHms = fechaObj.toTimeString().slice(0, 8)

  const numDocCliente = venta.cliente.documento || '00000000'
  const tipoDocCliente = numDocCliente.length === 11 ? '6' : numDocCliente.length === 8 ? '1' : '0'
  const clienteNombre = venta.cliente.nombre || 'CLIENTE VARIOS'

  const subtotal = Number(venta.subtotal) || 0
  const impuesto = Number(venta.impuesto) || 0
  const total = Number(venta.total) || 0

  // Generar líneas de detalle
  const linesXml = venta.items
    .map((item, idx) => {
      const lineNum = idx + 1
      const itemSubtotal = item.subtotal / 1.18
      const itemIgv = item.subtotal - itemSubtotal
      return `  <cac:InvoiceLine>
    <cbc:ID>${lineNum}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU">${item.cantidad.toFixed(2)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="PEN">${itemSubtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="PEN">${item.precio_unitario.toFixed(2)}</cbc:PriceAmount>
        <cbc:PriceTypeCode listName="Tipo de Precio" listAgencyName="PE:SUNAT">01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="PEN">${itemIgv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="PEN">${itemSubtotal.toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="PEN">${itemIgv.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>18.00</cbc:Percent>
          <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT">10</cbc:TaxExemptionReasonCode>
          <cac:TaxScheme>
            <cbc:ID>1000</cbc:ID>
            <cbc:Name>IGV</cbc:Name>
            <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description><![CDATA[${item.nombre}]]></cbc:Description>
      <cac:SellersItemIdentification>
        <cbc:ID>${item.sku}</cbc:ID>
      </cac:SellersItemIdentification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="PEN">${(item.precio_unitario / 1.18).toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`
    })
    .join('\n')

  // Calcular DigestValue SHA-256 preliminar para la firma digital
  const rawDataForHash = `${rucEmisor}|${tipoComprobante}|${venta.serie}|${correlativoStr}|${impuesto.toFixed(2)}|${total.toFixed(2)}|${fechaYmd}|${tipoDocCliente}|${numDocCliente}`
  const digestValue = createHash('sha256').update(rawDataForHash).digest('base64')
  const signatureValue = createHash('sha256').update(digestValue + razonSocialEmisor).digest('base64')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <ds:Signature Id="SignStockiaWms">
          <ds:SignedInfo>
            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
            <ds:Reference URI="">
              <ds:Transforms>
                <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
              </ds:Transforms>
              <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
              <ds:DigestValue>${digestValue}</ds:DigestValue>
            </ds:Reference>
          </ds:SignedInfo>
          <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
        </ds:Signature>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID schemeAgencyName="PE:SUNAT">2.0</cbc:CustomizationID>
  <cbc:ProfileID>0101</cbc:ProfileID>
  <cbc:ID>${venta.serie}-${correlativoStr}</cbc:ID>
  <cbc:IssueDate>${fechaYmd}</cbc:IssueDate>
  <cbc:IssueTime>${horaHms}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento">${tipoComprobante}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listName="Currency">PEN</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT">${rucEmisor}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${razonSocialEmisor}]]></cbc:Name>
      </cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${razonSocialEmisor}]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:AddressTypeCode listAgencyName="PE:SUNAT">0000</cbc:AddressTypeCode>
          <cbc:CityName>LIMA</cbc:CityName>
          <cbc:CountrySubentity>LIMA</cbc:CountrySubentity>
          <cbc:District>LIMA</cbc:District>
          <cac:Country>
            <cbc:IdentificationCode listID="ISO 3166-1">PE</cbc:IdentificationCode>
          </cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${tipoDocCliente}" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT">${numDocCliente}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${clienteNombre}]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">${impuesto.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="PEN">${subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="PEN">${impuesto.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>18.00</cbc:Percent>
        <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT">10</cbc:TaxExemptionReasonCode>
        <cac:TaxScheme>
          <cbc:ID schemeID="UN/ECE 5153">1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="PEN">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="PEN">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="PEN">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${linesXml}
</Invoice>`

  // Cadena reglamentaria oficial de SUNAT para el Código QR
  const sunatQrString = `${rucEmisor}|${tipoComprobante}|${venta.serie}|${correlativoStr}|${impuesto.toFixed(2)}|${total.toFixed(2)}|${fechaYmd}|${tipoDocCliente}|${numDocCliente}|${digestValue}`

  return {
    xml,
    digestValue,
    signatureValue,
    filename,
    sunatQrString,
  }
}
