import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

// Nota: el front envía snake_case y/o camelCase; aquí aceptamos ambos
// y normalizamos en el repositorio.
export class CreateSoftwareDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  short_description?: string;

  @IsOptional()
  @IsString()
  features?: string;

  // "Pago único, Offline" (coma-separado)
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
