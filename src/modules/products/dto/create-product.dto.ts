import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  price!: number;

  @IsNumber()
  stock!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_percent?: number;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  video_url?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  tech_sheet?: string;

  @IsOptional()
  @IsString()
  discount_start?: string;

  @IsOptional()
  @IsString()
  discount_end?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
