import { IsIn } from 'class-validator';

export class StatsSalesDto {
  @IsIn(['day','week','month','year'])
  range!: 'day' | 'week' | 'month' | 'year';
}
