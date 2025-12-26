var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
function has(v) {
    return typeof v === 'string' && v.trim().length > 0;
}
function createInvoiceToken(orderId, ttlSeconds = 7 * 24 * 3600) {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = `${orderId}.${exp}`;
    const secret = has(process.env.JWT_SECRET) ? process.env.JWT_SECRET : 'dev';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
}
function verifyInvoiceToken(orderId, token) {
    try {
        const [oid, exp, sig] = String(token || '').split('.');
        if (Number(oid) !== Number(orderId))
            return false;
        if (Number(exp) < Math.floor(Date.now() / 1000))
            return false;
        const payload = `${oid}.${exp}`;
        const secret = has(process.env.JWT_SECRET) ? process.env.JWT_SECRET : 'dev';
        const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
        return expected === sig;
    }
    catch {
        return false;
    }
}
let InvoicesService = class InvoicesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Devuelve JSON público para renderizar factura imprimible en el frontend.
     * GET /api/invoices/:orderId?token=...
     */
    async getInvoiceJson(orderId, token) {
        if (!Number.isFinite(orderId) || orderId <= 0) {
            throw new BadRequestException('bad_order_id');
        }
        if (!token || !verifyInvoiceToken(orderId, token)) {
            throw new UnauthorizedException('unauthorized');
        }
        const order = await this.prisma.order.findUnique({
            where: { orderId },
            select: {
                orderId: true,
                payerEmail: true,
                domicilioNombre: true,
                domicilioTelefono: true,
                domicilioCiudad: true,
                domicilioDireccion: true,
                domicilioBarrio: true,
                domicilioModo: true,
                domicilioCosto: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                items: {
                    orderBy: { orderItemId: 'asc' },
                    select: {
                        productId: true,
                        quantity: true,
                        unitPrice: true,
                        product: { select: { name: true } },
                    },
                },
            },
        });
        if (!order)
            throw new NotFoundException('not_found');
        const customer_address = `${order.domicilioDireccion || ''}` +
            (order.domicilioBarrio ? ` - ${order.domicilioBarrio}` : '');
        const orderLegacy = {
            order_id: order.orderId,
            customer_name: order.domicilioNombre || 'Cliente',
            customer_email: order.payerEmail || '',
            customer_phone: order.domicilioTelefono || '',
            customer_city: order.domicilioCiudad || '',
            customer_address,
            domicilio_modo: order.domicilioModo,
            domicilio_costo: Number(order.domicilioCosto),
            total_amount: Number(order.totalAmount),
            status: order.status,
            created_at: order.createdAt,
        };
        const items = order.items.map((it) => ({
            product_id: it.productId,
            name: it.product?.name || `Producto #${it.productId}`,
            quantity: it.quantity,
            unit_price: Number(it.unitPrice),
        }));
        return {
            company: {
                name: 'MR SmartService',
                nit: '1121904526',
                phone: '3014190633',
                email: 'yesfri@hotmail.es',
            },
            order: orderLegacy,
            items,
        };
    }
};
InvoicesService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], InvoicesService);
export { InvoicesService };
//# sourceMappingURL=invoices.service.js.map