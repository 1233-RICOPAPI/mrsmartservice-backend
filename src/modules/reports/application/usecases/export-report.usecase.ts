import { BadRequestException, Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../../orders/orders.repository.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

type ExportInput = { range: 'month' | 'year'; month?: string; year?: string; format: 'xlsx' | 'pdf' };

function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function getFromTo(input: ExportInput): { from: string; to: string; label: string } {
  if (input.range === 'month' && input.month) {
    const [y, m] = input.month.split('-').map(Number);
    const last = lastDayOfMonth(y, m - 1);
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
    const label = `${y}-${String(m).padStart(2, '0')}`;
    return { from, to, label };
  }
  if (input.range === 'year' && input.year) {
    const y = input.year;
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: y };
  }
  throw new BadRequestException('range=month requiere month (YYYY-MM); range=year requiere year (YYYY)');
}

@Injectable()
export class ExportReportUseCase {
  constructor(private readonly ordersRepo: OrdersRepository) {}

  async execute(input: ExportInput): Promise<Buffer> {
    const { from, to, label } = getFromTo(input);
    const rows = await this.ordersRepo.listForExport(from, to);

    const totalIngresos = rows.reduce((acc, o) => acc + (o.total_amount || 0), 0);
    const veintePorCiento = Math.round(totalIngresos * 0.2);
    const cantidadVentas = rows.length;

    if (input.format === 'xlsx') {
      return this.buildExcel(rows, { from, to, label, totalIngresos, veintePorCiento, cantidadVentas });
    }
    return this.buildPdf(rows, { from, to, label, totalIngresos, veintePorCiento, cantidadVentas });
  }

  private async buildExcel(
    rows: Awaited<ReturnType<OrdersRepository['listForExport']>>,
    meta: { from: string; to: string; label: string; totalIngresos: number; veintePorCiento: number; cantidadVentas: number },
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Ventas', { properties: { defaultRowHeight: 20 } });

    ws.columns = [
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'ID Orden', key: 'order_id', width: 12 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Total (COP)', key: 'total', width: 14 },
      { header: 'Estado', key: 'status', width: 12 },
    ];
    ws.getRow(1).font = { bold: true };

    for (const o of rows) {
      const fecha = o.created_at instanceof Date ? o.created_at.toLocaleString('es-CO') : String(o.created_at);
      const cliente = (o.buyer_name || o.domicilio_nombre || o.buyer_email || '-').toString().trim();
      ws.addRow({
        fecha,
        order_id: o.order_id,
        cliente,
        total: o.total_amount,
        status: o.status,
      });
    }

    ws.addRow([]);
    const resumenRow = ws.addRow(['Resumen']);
    resumenRow.getCell(1).font = { bold: true };
    ws.addRow(['Total ingresos (COP)', meta.totalIngresos]);
    ws.addRow(['20% (COP)', meta.veintePorCiento]);
    ws.addRow(['Cantidad de ventas', meta.cantidadVentas]);

    const detalle = wb.addWorksheet('Detalle por ítem', { properties: { defaultRowHeight: 20 } });
    detalle.columns = [
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'ID Orden', key: 'order_id', width: 12 },
      { header: 'Producto', key: 'product_name', width: 30 },
      { header: 'Cantidad', key: 'quantity', width: 10 },
      { header: 'Precio unit. (COP)', key: 'unit_price', width: 16 },
      { header: 'Total ítem (COP)', key: 'total_price', width: 16 },
    ];
    detalle.getRow(1).font = { bold: true };

    for (const o of rows) {
      const fecha = o.created_at instanceof Date ? o.created_at.toLocaleString('es-CO') : String(o.created_at);
      for (const it of o.items || []) {
        detalle.addRow({
          fecha,
          order_id: o.order_id,
          product_name: it.product_name || '-',
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
        });
      }
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  private async buildPdf(
    rows: Awaited<ReturnType<OrdersRepository['listForExport']>>,
    meta: { from: string; to: string; label: string; totalIngresos: number; veintePorCiento: number; cantidadVentas: number },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Reporte de ventas – MR SmartService', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Período: ${meta.from} a ${meta.to} (${meta.label})`, { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(10).text('Ventas aprobadas', { continued: false });
      let y = doc.y;
      const colW = [80, 60, 120, 70, 60];
      const headers = ['Fecha', 'ID', 'Cliente', 'Total', 'Estado'];
      doc.font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(h, 50 + colW.slice(0, i).reduce((a, w) => a + w, 0), y));
      doc.font('Helvetica');
      doc.moveDown(0.5);
      y = doc.y;

      for (const o of rows) {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        const fecha = o.created_at instanceof Date ? o.created_at.toLocaleDateString('es-CO') : String(o.created_at).slice(0, 10);
        const cliente = (o.buyer_name || o.domicilio_nombre || o.buyer_email || '-').toString().slice(0, 22);
        const line = [fecha, String(o.order_id), cliente, String(o.total_amount), o.status || ''];
        line.forEach((cell, i) => doc.text(cell, 50 + colW.slice(0, i).reduce((a, w) => a + w, 0), y));
        y += 18;
      }

      y += 10;
      doc.font('Helvetica-Bold');
      doc.text(`Total ingresos (COP): ${meta.totalIngresos}`, 50, y);
      doc.text(`20% (COP): ${meta.veintePorCiento}`, 50, y + 18);
      doc.text(`Cantidad de ventas: ${meta.cantidadVentas}`, 50, y + 36);
      doc.end();
    });
  }
}
