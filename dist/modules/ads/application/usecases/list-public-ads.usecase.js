var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { AdsRepository } from '../../ads.repository.js';
import { AdMapper } from '../mappers/ad.mapper.js';
let ListPublicAdsUseCase = class ListPublicAdsUseCase {
    repo;
    mapper;
    constructor(repo, mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }
    async execute() {
        const rows = await this.repo.listActive();
        return rows.map((a) => this.mapper.toLegacy(a));
    }
};
ListPublicAdsUseCase = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [AdsRepository, AdMapper])
], ListPublicAdsUseCase);
export { ListPublicAdsUseCase };
//# sourceMappingURL=list-public-ads.usecase.js.map