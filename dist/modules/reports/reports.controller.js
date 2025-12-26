var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { FinanzasReportDto } from './dto/finanzas-report.dto.js';
import { GetFinanzasReportUseCase } from './application/usecases/get-finanzas-report.usecase.js';
let ReportsController = class ReportsController {
    finanzasUC;
    constructor(finanzasUC) {
        this.finanzasUC = finanzasUC;
    }
    async finanzas(q, res) {
        const format = q.format === 'pdf' ? 'pdf' : 'xlsx';
        try {
            const proxRes = await this.finanzasUC.execute(format);
            if (!proxRes.ok) {
                const txt = await proxRes.text().catch(() => null);
                console.error('Python report failed', proxRes.status, txt);
                return res.status(502).json({ error: 'report_proxy_failed', status: proxRes.status });
            }
            const ct = proxRes.headers.get('content-type') || (format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            const buf = Buffer.from(await proxRes.arrayBuffer());
            res.setHeader('Content-Type', ct);
            res.setHeader('Content-Disposition', `attachment; filename="finanzas.${format}"`);
            return res.status(200).send(buf);
        }
        catch (e) {
            console.error('report proxy error', e);
            return res.status(502).json({ error: 'report_proxy_error' });
        }
    }
};
__decorate([
    Get('finanzas'),
    __param(0, Query()),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [FinanzasReportDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "finanzas", null);
ReportsController = __decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('ADMIN', 'DEV_ADMIN'),
    Controller('api/reports'),
    __metadata("design:paramtypes", [GetFinanzasReportUseCase])
], ReportsController);
export { ReportsController };
//# sourceMappingURL=reports.controller.js.map