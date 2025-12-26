import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAdDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  link_url?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
