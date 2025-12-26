import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller.js';
import { AdsRepository } from './ads.repository.js';
import { AdMapper } from './application/mappers/ad.mapper.js';
import { ListPublicAdsUseCase } from './application/usecases/list-public-ads.usecase.js';
import { ListAdminAdsUseCase } from './application/usecases/list-admin-ads.usecase.js';
import { CreateAdUseCase } from './application/usecases/create-ad.usecase.js';
import { UpdateAdUseCase } from './application/usecases/update-ad.usecase.js';
import { DeleteAdUseCase } from './application/usecases/delete-ad.usecase.js';

@Module({
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
export class AdsModule {}
