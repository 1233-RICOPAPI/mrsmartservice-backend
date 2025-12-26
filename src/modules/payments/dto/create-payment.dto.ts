import { ArrayMinSize, IsArray, IsOptional } from 'class-validator';

// DTO flexible para mantener compatibilidad con el front legacy.
// El front envía { items: [...], shipping: {...} }.

export type CreatePaymentItem = {
  product_id?: number | string;
  productId?: number | string;
  id?: number | string;
  title?: string;
  name?: string;
  unit_price?: number;
  price?: number;
  quantity?: number;
  currency_id?: string;
};

export type CreatePaymentShipping = {
  mode?: string | null; // 'domicilio' | null
  nombre?: string | null;
  direccion?: string | null;
  barrio?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  nota?: string | null;
  shipping_cost?: number | string;
  carrier_mode?: string | null; // 'local' | 'coordinadora'
  carrier?: string | null;
};

export class CreatePaymentDto {
  @IsArray()
  @ArrayMinSize(1)
  items!: CreatePaymentItem[];

  @IsOptional()
  shipping?: CreatePaymentShipping | null;
}
