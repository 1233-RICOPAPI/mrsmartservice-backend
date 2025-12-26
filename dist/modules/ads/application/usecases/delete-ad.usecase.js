var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, BadRequestException } from '@nestjs/common';
import { AdsRepository } from '../../ads.repository.js';
let DeleteAdUseCase = class DeleteAdUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async execute(id) {
        if (!Number.isFinite(id) || id <= 0)
            throw new BadRequestException('bad_id');
        await this.repo.remove(id);
        return { success: true };
    }
};
DeleteAdUseCase = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [AdsRepository])
], DeleteAdUseCase);
export { DeleteAdUseCase };
//# sourceMappingURL=delete-ad.usecase.js.map