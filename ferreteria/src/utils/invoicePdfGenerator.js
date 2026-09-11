import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

// Conversor de montos numéricos a texto literal oficial (Bolivia)
export function numeroALetras(monto) {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function convertirCentenas(num) {
    if (num === 0) return '';
    if (num === 100) return 'CIEN';
    const c = Math.floor(num / 100);
    const d = Math.floor((num % 100) / 10);
    const u = num % 10;
    let res = '';

    if (c > 0) res += centenas[c] + ' ';

    const resto = num % 100;
    if (resto >= 10 && resto <= 20) {
      res += especiales[resto - 10] + ' ';
    } else if (resto > 20 && resto < 30) {
      res += 'VEINTI' + unidades[u] + ' ';
    } else {
      if (d > 0) {
        res += decenas[d];
        if (u > 0) res += ' Y ' + unidades[u];
        res += ' ';
      } else if (u > 0) {
        res += unidades[u] + ' ';
      }
    }
    return res.trim();
  }

  function convertirMiles(num) {
    if (num === 0) return 'CERO';
    const millones = Math.floor(num / 1000000);
    const miles = Math.floor((num % 1000000) / 1000);
    const unidadesC = num % 1000;
    let res = '';

    if (millones > 0) {
      if (millones === 1) res += 'UN MILLÓN ';
      else res += convertirCentenas(millones) + ' MILLONES ';
    }
    if (miles > 0) {
      if (miles === 1) res += 'UN MIL ';
      else res += convertirCentenas(miles) + ' MIL ';
    }
    if (unidadesC > 0) {
      res += convertirCentenas(unidadesC);
    }
    return res.trim();
  }

  const num = Math.abs(parseFloat(monto) || 0);
  const entero = Math.floor(num);
  const decimal = Math.round((num - entero) * 100);
  const decimalStr = decimal.toString().padStart(2, '0');

  const textoEntero = convertirMiles(entero) || 'CERO';
  return `${textoEntero} ${decimalStr}/100 BOLIVIANOS`;
}

// Generador de código hash / CUF simulado consistente
function generarCodigoAutorizacion(id, fecha) {
  const seed = `CUF-${id}-${fecha}-BOL-SIAT-989530017`;
  let hash = '';
  for (let i = 0; i < seed.length; i++) {
    hash += seed.charCodeAt(i).toString(16).toUpperCase();
  }
  const fullHex = (hash + '43B4D60F29AFDED857ED2F8BFF1855BEAED0FE5E617138182BB03BF74').substring(0, 64);
  return fullHex;
}

/**
 * Genera el documento PDF con el diseño oficial de Factura / Recibo
 * @param {Object} receiptData - Datos de la venta/factura
 * @param {Object} options - Opciones adicionales ({ openInTab: true, download: true })
 */
export async function generateInvoicePdf(receiptData, options = { openInTab: true, download: true }) {
  if (!receiptData) return null;

  const isInvoice = !!receiptData.isInvoice;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const invoiceNum = (receiptData.numeroFactura || receiptData.id || '1').toString().replace(/^[A-Z-]+/i, '') || '1';
  const cuf = receiptData.cuf || generarCodigoAutorizacion(invoiceNum, receiptData.time || receiptData.fechaEmision || '');
  const fechaStr = receiptData.time || receiptData.fechaEmision || new Date().toLocaleString('es-BO');
  const nitCliente = receiptData.nit && receiptData.nit !== '0' ? receiptData.nit : (receiptData.documento || receiptData.nitCliente || '0');
  const razonSocial = (receiptData.cliente || receiptData.client || receiptData.razonSocial || receiptData.nombreCliente || 'CLIENTE GENERAL').toUpperCase();
  const subtotal = parseFloat(receiptData.subtotal || receiptData.total || 0);
  const discount = parseFloat(receiptData.descuento || receiptData.discount || 0);
  const total = parseFloat(receiptData.total || 0);
  const literalAmount = numeroALetras(total);

  // 1. ENCABEZADO SUPERIOR
  // Columna Izquierda: Datos de la Empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('OSCAR EDGAR CLAROS DAVALOS', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text('CASA MATRIZ', margin, 22);
  doc.text('Nro. Punto de Venta 0', margin, 25.5);
  doc.text('ZONA: SARCO, AVENIDA: BEIJING, NRO.: 1234, TELEFONO: 72271495', margin, 29);
  doc.text('Telf: 72271495', margin, 32.5);
  doc.text('COCHABAMBA', margin, 36);

  // Columna Derecha: Datos Tributarios de Facturación
  const rightColX = pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('NIT:', rightColX - 58, 18);
  doc.setFont('helvetica', 'normal');
  doc.text('989530017', rightColX, 18, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text(isInvoice ? 'FACTURA NRO.:' : 'RECIBO NRO.:', rightColX - 58, 22.5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceNum, rightColX, 22.5, { align: 'right' });

  if (isInvoice) {
    doc.setFont('helvetica', 'bold');
    doc.text('COD. AUTORIZACIÓN:', rightColX - 58, 27);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const splitCuf = doc.splitTextToSize(cuf, 58);
    doc.text(splitCuf, rightColX, 30.5, { align: 'right' });
  }

  // 2. TÍTULO CENTRAL
  const titleY = 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(isInvoice ? 'FACTURA' : 'RECIBO DE VENTA', pageWidth / 2, titleY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(isInvoice ? '(Con Derecho a Crédito Fiscal)' : '(Documento No Válido para Crédito Fiscal)', pageWidth / 2, titleY + 4, { align: 'center' });

  // 3. DATOS DEL CLIENTE Y FECHA
  const metaY = 56;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', margin, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(fechaStr, margin + 12, metaY);

  doc.setFont('helvetica', 'bold');
  doc.text('NIT/CI/CEX:', margin + 95, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(nitCliente, margin + 115, metaY);

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre/Razón Social:', margin, metaY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(razonSocial, margin + 33, metaY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Cod. Cliente:', margin + 95, metaY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(nitCliente, margin + 115, metaY + 4.5);

  // 4. TABLA DE DETALLES DE PRODUCTOS
  const rawItems = receiptData.detalles || receiptData.items || receiptData.productos || [];
  const tableData = rawItems.map((it, idx) => {
    const itemCode = it.codigo || it.ProductoID || it.id || (140000 + idx).toString();
    const qty = parseFloat(it.cantidad || it.quantity || 1).toFixed(2);
    const unit = (it.unidad || it.unit || 'PIEZAS').toUpperCase();
    const desc = (it.nombre || it.name || it.producto || it.descripcion || 'PRODUCTO DE FERRETERÍA').toUpperCase();
    const price = parseFloat(it.precioUnitario || it.price || it.PrecioVenta || it.precio || 0).toFixed(2);
    const itemDiscount = parseFloat(it.descuento || it.discount || 0).toFixed(2);
    const itemSubtotal = parseFloat(it.subtotal || (parseFloat(qty) * parseFloat(price) - parseFloat(itemDiscount)) || 0).toFixed(2);

    return [itemCode, qty, unit, desc, price, itemDiscount, itemSubtotal];
  });

  autoTable(doc, {
    startY: metaY + 8,
    margin: { left: margin, right: margin },
    head: [['CODIGO PRODUCTO/SERVICIO', 'CANTIDAD', 'UNIDAD MEDIDA', 'DESCRIPCION', 'PRECIO UNITARIO', 'DESCUENTO', 'SUBTOTAL']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
      lineWidth: 0.2,
      lineColor: [0, 0, 0]
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 6.5,
      lineWidth: 0.15,
      lineColor: [120, 120, 120]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 32 },
      1: { halign: 'right', cellWidth: 16 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'left' },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 20 }
    },
    styles: {
      cellPadding: 1.5,
      overflow: 'linebreak'
    }
  });

  const finalY = doc.lastAutoTable.finalY + 3;

  // 5. RESUMEN DE TOTALES Y LITERAL
  // Literal a la izquierda
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Son: ${literalAmount}`, margin, finalY + 4);

  // Tabla de Totales a la derecha
  const totalsTableX = pageWidth - margin - 65;
  const totals = [
    ['SUBTOTAL', subtotal.toFixed(2)],
    ['DESCUENTO', discount.toFixed(2)],
    ['TOTAL', total.toFixed(2)],
    ['MONTO GIFT CARD', '0.00'],
    ['MONTO A PAGAR', total.toFixed(2)],
    ['IMPORTE BASE CREDITO FISCAL', total.toFixed(2)]
  ];

  autoTable(doc, {
    startY: finalY,
    margin: { left: totalsTableX },
    tableWidth: 65,
    body: totals,
    theme: 'plain',
    bodyStyles: {
      fontSize: 6.5,
      lineWidth: 0.15,
      lineColor: [120, 120, 120],
      cellPadding: 1.2
    },
    columnStyles: {
      0: { halign: 'right', fontStyle: 'bold', cellWidth: 43 },
      1: { halign: 'right', fontStyle: 'normal', cellWidth: 22 }
    }
  });

  const totalsFinalY = doc.lastAutoTable.finalY + 8;

  // 6. CÓDIGO QR Y PIE DE PÁGINA LEGAL
  const qrString = `https://pilotosiat.impuestos.gob.bo/consulta/QR?nit=989530017&cuf=${cuf}&numero=${invoiceNum}&t=${total.toFixed(2)}`;
  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(qrString, { width: 140, margin: 1 });
  } catch (err) {
    console.warn('No se pudo generar QR para factura:', err);
  }

  const footerY = Math.max(totalsFinalY, 215);

  // Textos legales (Izquierda)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  const legal1 = 'ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY';
  doc.text(legal1, (pageWidth - 36) / 2, footerY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(60, 60, 60);
  doc.text('Ley Nº 453: Puedes acceder a la reclamación cuando tus derechos han sido vulnerados.', (pageWidth - 36) / 2, footerY + 4, { align: 'center' });
  doc.text('" Este documento es la Representación Gráfica de un Documento Fiscal Digital emitido en una modalidad de facturación en línea "', (pageWidth - 36) / 2, footerY + 8, { align: 'center' });

  // Renderizar QR (Derecha)
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 26, footerY - 2, 26, 26);
  }

  const fileName = `${isInvoice ? 'Factura' : 'Recibo'}_Nro_${invoiceNum}_${new Date().toISOString().slice(0, 10)}.pdf`;

  if (options.download) {
    doc.save(fileName);
  }

  if (options.openInTab) {
    const pdfBlobUrl = doc.output('bloburl');
    window.open(pdfBlobUrl, '_blank');
  }

  return doc;
}

/**
 * Genera el comprobante/factura en formato Ticket Térmico 80mm para impresoras de rollo
 * @param {Object} receiptData - Datos de la venta/factura
 * @param {Object} options - { openInTab: true, download: false }
 */
export async function generateInvoiceTicketPdf(receiptData, options = { openInTab: true, download: false }) {
  if (!receiptData) return null;

  const isInvoice = receiptData.isInvoice !== undefined ? !!receiptData.isInvoice : true;
  const invoiceNum = (receiptData.numeroFactura || receiptData.id || '1').toString().replace(/^[A-Z-]+/i, '') || '1';
  const cuf = receiptData.cuf || generarCodigoAutorizacion(invoiceNum, receiptData.time || receiptData.fechaEmision || '');
  const fechaStr = receiptData.time || receiptData.fechaEmision || new Date().toLocaleString('es-BO');
  const nitCliente = receiptData.nit && receiptData.nit !== '0' ? receiptData.nit : '0';
  const razonSocial = (receiptData.cliente || receiptData.client || 'CLIENTE GENERAL').toUpperCase();
  const subtotal = parseFloat(receiptData.subtotal || receiptData.total || 0);
  const discount = parseFloat(receiptData.discount || 0);
  const total = parseFloat(receiptData.total || 0);
  const literalAmount = numeroALetras(total);

  const items = receiptData.detalles || receiptData.items || [];
  const dynamicHeight = Math.max(160, 120 + items.length * 8 + 60);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, dynamicHeight]
  });

  const pageWidth = 80;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;

  let y = 7;

  // 1. Cabecera Ticket
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('CASA Y CONSTRUCCIÓN', pageWidth / 2, y, { align: 'center' });
  y += 3.8;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('OSCAR EDGAR CLAROS DAVALOS', pageWidth / 2, y, { align: 'center' });
  y += 3.2;
  doc.text('CASA MATRIZ - PUNTO DE VENTA 0', pageWidth / 2, y, { align: 'center' });
  y += 3.2;
  doc.text('Av. Beijing y Av. Tadeo Ahenke', pageWidth / 2, y, { align: 'center' });
  y += 3.2;
  doc.text('Telf: 72271495 • Cochabamba', pageWidth / 2, y, { align: 'center' });
  y += 3.5;

  doc.setLineDash([0.8, 0.8], 0);
  doc.setDrawColor(100, 100, 100);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // 2. Datos Fiscales
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`NIT: 989530017`, margin, y);
  y += 3.5;
  doc.text(isInvoice ? `FACTURA NRO: ${invoiceNum}` : `RECIBO NRO: ${invoiceNum}`, margin, y);
  y += 3.5;

  if (isInvoice) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('CÓD. AUTORIZACIÓN (CUF):', margin, y);
    y += 2.8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    const splitCuf = doc.splitTextToSize(cuf, contentWidth);
    doc.text(splitCuf, margin, y);
    y += splitCuf.length * 2.4 + 1;
  }

  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // 3. Datos del Cliente
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(fechaStr, margin + 12, y);
  y += 3.2;

  doc.setFont('helvetica', 'bold');
  doc.text('SEÑOR(ES):', margin, y);
  doc.setFont('helvetica', 'normal');
  const splitClient = doc.splitTextToSize(razonSocial, contentWidth - 18);
  doc.text(splitClient, margin + 18, y);
  y += splitClient.length * 2.8 + 0.5;

  doc.setFont('helvetica', 'bold');
  doc.text('NIT / CI:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(nitCliente, margin + 14, y);
  y += 3.8;

  doc.line(margin, y, pageWidth - margin, y);
  y += 1.5;

  // 4. Tabla de Productos (Formato Ticket)
  const ticketTableData = items.map(it => {
    const qty = parseFloat(it.cantidad || it.quantity || 1).toFixed(2);
    const name = (it.nombre || it.producto || it.name || 'PRODUCTO').toUpperCase();
    const price = parseFloat(it.precioUnitario || it.price || 0).toFixed(2);
    const sub = parseFloat(it.subtotal || 0).toFixed(2);
    return [qty, name, price, sub];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['CANT', 'DETALLE', 'P.U.', 'TOTAL']],
    body: ticketTableData,
    theme: 'plain',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'left',
      cellPadding: 0.8
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 6,
      cellPadding: 0.8
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 34 },
      2: { halign: 'right', cellWidth: 13 },
      3: { halign: 'right', cellWidth: 15 }
    },
    styles: { overflow: 'linebreak' }
  });

  y = doc.lastAutoTable.finalY + 2;

  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // 5. Totales Ticket
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('SUBTOTAL: Bs.', margin + 28, y);
  doc.text(subtotal.toFixed(2), pageWidth - margin, y, { align: 'right' });
  y += 3.2;

  if (discount > 0) {
    doc.text('DESCUENTO: -Bs.', margin + 28, y);
    doc.text(discount.toFixed(2), pageWidth - margin, y, { align: 'right' });
    y += 3.2;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL A PAGAR: Bs.', margin + 20, y);
  doc.text(total.toFixed(2), pageWidth - margin, y, { align: 'right' });
  y += 3.5;

  if (isInvoice) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('BASE CRÉDITO: Bs.', margin + 24, y);
    doc.text(total.toFixed(2), pageWidth - margin, y, { align: 'right' });
    y += 3.5;
  }

  doc.line(margin, y, pageWidth - margin, y);
  y += 3.2;

  // Literal
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  const splitLiteral = doc.splitTextToSize(`SON: ${literalAmount}`, contentWidth);
  doc.text(splitLiteral, margin, y);
  y += splitLiteral.length * 2.6 + 2;

  // 6. QR Code Térmico
  const qrString = `https://pilotosiat.impuestos.gob.bo/consulta/QR?nit=989530017&cuf=${cuf}&numero=${invoiceNum}&t=${total.toFixed(2)}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(qrString, { width: 90, margin: 0 });
    doc.addImage(qrDataUrl, 'PNG', (pageWidth - 22) / 2, y, 22, 22);
    y += 24;
  } catch (err) {
    console.warn('QR error:', err);
  }

  // Leyenda oficial
  doc.setFontSize(5);
  doc.setTextColor(50, 50, 50);
  const leg1 = '"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY"';
  const splitLeg = doc.splitTextToSize(leg1, contentWidth);
  doc.text(splitLeg, pageWidth / 2, y, { align: 'center' });
  y += splitLeg.length * 2.2 + 1;

  doc.text('Ley Nº 453: Exige tus derechos como consumidor.', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text('¡Gracias por su compra!', pageWidth / 2, y, { align: 'center' });

  const fileName = `Ticket_${isInvoice ? 'Factura' : 'Recibo'}_Nro_${invoiceNum}.pdf`;

  if (options.download) {
    doc.save(fileName);
  }

  if (options.openInTab) {
    const pdfBlobUrl = doc.output('bloburl');
    window.open(pdfBlobUrl, '_blank');
  }

  return doc;
}
