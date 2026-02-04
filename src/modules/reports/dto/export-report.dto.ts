import { IsIn, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class ExportReportDto {
  /** month | year */
  @IsIn(['month', 'year'])
  range!: 'month' | 'year';

  /** YYYY-MM (ej. 2026-01) cuando range=month */
  @ValidateIf((o) => o.range === 'month')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month debe ser YYYY-MM' })
  month?: string;

  /** YYYY (ej. 2026) cuando range=year */
  @ValidateIf((o) => o.range === 'year')
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'year debe ser YYYY' })
  year?: string;

  @IsIn(['xlsx', 'pdf'])
  format!: 'xlsx' | 'pdf';
}
