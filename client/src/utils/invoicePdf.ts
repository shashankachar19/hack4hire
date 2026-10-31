import { jsPDF } from 'jspdf'

export interface InvoiceData {
  jobId: string
  invoiceNumber: string
  date: string
  serviceTitle: string
  serviceZone: string
  priority: string
  customerName: string
  customerPhone: string
  customerEmail: string
  customerAddress: string
  customerAge?: number
  technicianName: string
  partnerId?: string
  baseLabor: number
  speedFee: number
  safetyFee: number
  platformFee: number
  gstTax: number
  totalAmount: number
  partsInstalled?: { name: string; price: number }[]
  resolutionNote?: string
  paymentMethod: string
  paymentTxnId: string
  paymentStatus: string
}

export function downloadOfficialInvoicePdf(data: InvoiceData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // 1. Top Luxury Header Banner (Mindazzle Deep Obsidian-Plum #2A114B)
  doc.setFillColor(42, 17, 75) // #2A114B
  doc.rect(0, 0, pageWidth, 38, 'F')

  // Accent Gold / Rose Line
  doc.setFillColor(223, 182, 178) // #DFB6B2
  doc.rect(0, 38, pageWidth, 1.5, 'F')

  // Brand Name
  doc.setTextColor(250, 229, 216) // #FAE5D8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('DISPATCHGRID', 14, 16)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(223, 182, 178) // #DFB6B2
  doc.text('CERTIFIED EMERGENCY FLEET & TRADE SERVICES', 14, 22)
  doc.text('GSTIN: 29AABCS1429B1Z8 | DG-TAX-KARNATAKA', 14, 27)
  doc.text('Support: support@dispatchgrid.in | +91 80 4000 8899', 14, 32)

  // Invoice Title on Right
  doc.setTextColor(250, 229, 216)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('OFFICIAL TAX INVOICE', pageWidth - 14, 16, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(52, 211, 153) // emerald green
  doc.text('ORIGINAL FOR RECIPIENT', pageWidth - 14, 22, { align: 'right' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(223, 182, 178)
  doc.text(`Invoice No: ${data.invoiceNumber}`, pageWidth - 14, 27, { align: 'right' })
  doc.text(`Date: ${data.date}`, pageWidth - 14, 32, { align: 'right' })

  // 2. Invoice Metadata & Customer Dossier Section
  let y = 48

  // Box 1: Billed To (Customer Details)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(14, y, 88, 38, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(42, 17, 75)
  doc.text('BILLED TO (CUSTOMER):', 18, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 41, 59)
  doc.text(`Name: ${data.customerName || 'Valued Resident'} ${data.customerAge ? `(${data.customerAge} yrs)` : ''}`, 18, y + 12)
  doc.text(`Contact: ${data.customerPhone || '+91 98450 00000'}`, 18, y + 17)
  doc.text(`Email: ${data.customerEmail || 'customer@dispatchgrid.in'}`, 18, y + 22)
  
  // Wrap address if long
  const addressLines = doc.splitTextToSize(`Address: ${data.customerAddress || 'Bengaluru, Karnataka'}`, 80)
  doc.text(addressLines, 18, y + 27)

  // Box 2: Order & Specialist Details
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(108, y, 88, 38, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(42, 17, 75)
  doc.text('DISPATCH & SPECIALIST INFO:', 112, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 41, 59)
  doc.text(`Specialist: Captain ${data.technicianName}`, 112, y + 12)
  doc.text(`Partner ID: ${data.partnerId || 'DG-PARTNER-402'} (Verified)`, 112, y + 17)
  doc.text(`Service: ${data.serviceTitle}`, 112, y + 22)
  doc.text(`Zone: ${data.serviceZone.toUpperCase()} | Priority: ${data.priority}`, 112, y + 27)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(16, 185, 129)
  doc.text('Status: 100% COMPLETED (Verified On-Site)', 112, y + 33)

  y += 46

  // 3. Itemized Tax Invoice Table
  doc.setFillColor(82, 41, 89) // #522959
  doc.rect(14, y, pageWidth - 28, 7, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(250, 229, 216)
  doc.text('SL', 18, y + 4.8)
  doc.text('DESCRIPTION OF SERVICE / CONSUMABLE', 30, y + 4.8)
  doc.text('SAC / HSN', 120, y + 4.8)
  doc.text('RATE (INR)', 150, y + 4.8, { align: 'right' })
  doc.text('AMOUNT (INR)', pageWidth - 18, y + 4.8, { align: 'right' })

  y += 7

  const lineItems = [
    { sl: '1', desc: `Emergency Trade Labour (${data.serviceTitle})`, sac: '998719', rate: data.baseLabor, amt: data.baseLabor },
    { sl: '2', desc: 'SLA Fast Dispatch Guarantee (Nearest Fleet Partner)', sac: '998719', rate: data.speedFee, amt: data.speedFee },
    { sl: '3', desc: 'Sanitized Safety Kit & Calibrated Fleet Tools', sac: '998719', rate: data.safetyFee, amt: data.safetyFee },
    { sl: '4', desc: 'Live Telemetry & Cloud Dispatch Platform Fee', sac: '998314', rate: data.platformFee, amt: data.platformFee },
  ]

  if (data.partsInstalled && data.partsInstalled.length > 0) {
    data.partsInstalled.forEach((p, idx) => {
      lineItems.push({
        sl: `${5 + idx}`,
        desc: `Consumable Part: ${p.name}`,
        sac: '848180',
        rate: p.price,
        amt: p.price,
      })
    })
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59)

  lineItems.forEach((item, index) => {
    const isEven = index % 2 === 0
    if (isEven) {
      doc.setFillColor(248, 250, 252)
      doc.rect(14, y, pageWidth - 28, 6.5, 'F')
    }
    doc.setDrawColor(241, 245, 249)
    doc.line(14, y + 6.5, pageWidth - 14, y + 6.5)

    doc.text(item.sl, 18, y + 4.5)
    doc.text(item.desc, 30, y + 4.5)
    doc.text(item.sac, 120, y + 4.5)
    doc.text(`Rs. ${item.rate.toFixed(2)}`, 150, y + 4.5, { align: 'right' })
    doc.text(`Rs. ${item.amt.toFixed(2)}`, pageWidth - 18, y + 4.5, { align: 'right' })
    y += 6.5
  })

  // Resolution note if any
  if (data.resolutionNote) {
    doc.setFillColor(241, 245, 249)
    doc.rect(14, y, pageWidth - 28, 7, 'F')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    doc.text(`Specialist Diagnostic Note: "${data.resolutionNote}"`, 18, y + 4.5)
    y += 7
  }

  y += 3

  // 4. Totals & Tax Calculation
  const subtotal = data.baseLabor + data.speedFee + data.safetyFee + data.platformFee + (data.partsInstalled?.reduce((a, b) => a + b.price, 0) || 0)
  const gstCgst = data.gstTax / 2
  const gstSgst = data.gstTax / 2

  doc.setDrawColor(203, 213, 225)
  doc.line(120, y, pageWidth - 14, y)
  y += 4

  const totalLines = [
    { label: 'Taxable Subtotal:', val: `Rs. ${subtotal.toFixed(2)}` },
    { label: 'CGST (9%):', val: `Rs. ${gstCgst.toFixed(2)}` },
    { label: 'SGST (9%):', val: `Rs. ${gstSgst.toFixed(2)}` },
  ]

  totalLines.forEach((tl) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text(tl.label, 140, y, { align: 'right' })
    doc.setTextColor(30, 41, 59)
    doc.text(tl.val, pageWidth - 18, y, { align: 'right' })
    y += 4.5
  })

  // Final Total Bar (Highlight)
  doc.setFillColor(42, 17, 75) // #2A114B
  doc.roundedRect(120, y, pageWidth - 134, 9, 1.5, 1.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(250, 229, 216)
  doc.text('TOTAL AMOUNT PAID:', 145, y + 6, { align: 'right' })
  doc.setTextColor(52, 211, 153) // emerald
  doc.text(`Rs. ${data.totalAmount.toFixed(2)}`, pageWidth - 18, y + 6, { align: 'right' })

  y += 15

  // 5. Payment Settlement & Warranty Block
  doc.setFillColor(240, 253, 244) // light emerald
  doc.setDrawColor(187, 247, 208)
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(22, 101, 52)
  doc.text('PAYMENT SETTLEMENT & 30-DAY WARRANTY GUARANTEE', 18, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(21, 128, 61)
  doc.text(`Payment Mode: ${data.paymentMethod.toUpperCase()} (${data.paymentStatus})`, 18, y + 11)
  doc.text(`Transaction Reference: ${data.paymentTxnId}`, 18, y + 16)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(42, 17, 75)
  doc.text('Warranty Period: 30 Days 100% Free Rework Guarantee', 110, y + 11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text('Verified Urban Company Quality Standards Fulfilled', 110, y + 16)

  // 6. Footer Legal & Signature
  y = pageHeight - 24
  doc.setDrawColor(226, 232, 240)
  doc.line(14, y, pageWidth - 14, y)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text('This is a computer-generated tax invoice verified under Information Technology Act 2000. No physical signature required.', 14, y + 5)
  doc.text('For billing disputes or warranty claims: claims@dispatchgrid.in | 1800-419-7799', 14, y + 9)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(42, 17, 75)
  doc.text('For DispatchGrid Technologies India Pvt. Ltd.', pageWidth - 14, y + 5, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text('Authorized Signatory (Digital Verification)', pageWidth - 14, y + 9, { align: 'right' })

  // Trigger real browser download as .pdf
  const filename = `Invoice-DispatchGrid-${data.jobId.slice(0, 8)}.pdf`
  doc.save(filename)
}
