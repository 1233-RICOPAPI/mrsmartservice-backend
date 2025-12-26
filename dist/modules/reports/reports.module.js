var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { GetFinanzasReportUseCase } from './application/usecases/get-finanzas-report.usecase.js';
let ReportsModule = class ReportsModule {
};
ReportsModule = __decorate([
    Module({
        controllers: [ReportsController],
        providers: [GetFinanzasReportUseCase],
    })
], ReportsModule);
export { ReportsModule };
//# sourceMappingURL=reports.module.js.map