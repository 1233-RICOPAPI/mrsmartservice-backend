import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSoftwareDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  short_description?: string;

  @IsOptional()
  @IsString()
  features?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  whatsapp_message_template?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
