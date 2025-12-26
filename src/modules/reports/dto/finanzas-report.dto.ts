import { IsIn, IsOptional } from 'class-validator';

export class FinanzasReportDto {
  @IsOptional()
  @IsIn(['pdf', 'xlsx'])
  format?: 'pdf' | 'xlsx';
}
