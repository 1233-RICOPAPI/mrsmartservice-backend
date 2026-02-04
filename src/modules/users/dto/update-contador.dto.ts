import { IsEmail, IsOptional, MinLength } from 'class-validator';

export class UpdateContadorDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(8)
  password?: string;
}
