var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsIn, IsOptional, IsString } from 'class-validator';
export class ListOrdersDto {
    status;
    q;
    from; // YYYY-MM-DD
    to; // YYYY-MM-DD
    range;
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListOrdersDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListOrdersDto.prototype, "q", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListOrdersDto.prototype, "from", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListOrdersDto.prototype, "to", void 0);
__decorate([
    IsOptional(),
    IsIn(['day', 'week', 'month', 'year']),
    __metadata("design:type", String)
], ListOrdersDto.prototype, "range", void 0);
//# sourceMappingURL=list-orders.dto.js.map