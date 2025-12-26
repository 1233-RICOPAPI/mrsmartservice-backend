var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller.js';
import { AdsRepository } from './ads.repository.js';
import { AdMapper } from './application/mappers/ad.mapper.js';
import { ListPublicAdsUseCase } from './application/usecases/list-public-ads.usecase.js';
import { ListAdminAdsUseCase } from './application/usecases/list-admin-ads.usecase.js';
import { CreateAdUseCase } from './application/usecases/create-ad.usecase.js';
import { UpdateAdUseCase } from './application/usecases/update-ad.usecase.js';
import { DeleteAdUseCase } from './application/usecases/delete-ad.usecase.js';
let AdsModule = class AdsModule {
};
AdsModule = __decorate([
    Module({
        controllers: [AdsController],
        providers: [
            AdsRepository,
            AdMapper,
            ListPublicAdsUseCase,
            ListAdminAdsUseCase,
            CreateAdUseCase,
            UpdateAdUseCase,
            DeleteAdUseCase,
        ],
    })
], AdsModule);
export { AdsModule };
//# sourceMappingURL=ads.module.js.map