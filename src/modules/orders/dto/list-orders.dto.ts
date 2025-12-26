import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListOrdersDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  from?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  to?: string; // YYYY-MM-DD

  @IsOptional()
  @IsIn(['day','week','month','year'])
  range?: 'day' | 'week' | 'month' | 'year';
}
