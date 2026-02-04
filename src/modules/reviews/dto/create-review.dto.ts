import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  /** Identificador de dispositivo (localStorage) para una sola reseña por producto por visitante (IP+device). */
  @IsOptional()
  @IsString()
  device_id?: string;
}
