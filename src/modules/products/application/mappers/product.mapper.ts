export type LegacyProduct = {
  product_id: number;
  name: string;
  description: string | null;
  tech_sheet: string | null;
  price: number;
  stock: number;
  discount_percent: number | null;
  category: string | null;
  image_url: string | null;
  video_url: string | null;
  active: boolean;
  discount_start: Date | null;
  discount_end: Date | null;
  created_at: Date;
  updated_at: Date;
};

export function toLegacyProduct(p: any): LegacyProduct {
  return {
    product_id: p.productId,
    name: p.name,
    description: p.description ?? null,
    tech_sheet: p.techSheet ?? null,
    price: Number(p.price),
    stock: Number(p.stock),
    discount_percent: p.discountPercent ?? null,
    category: p.category ?? null,
    image_url: p.imageUrl ?? null,
    video_url: p.videoUrl ?? null,
    active: Boolean(p.active),
    discount_start: p.discountStart ?? null,
    discount_end: p.discountEnd ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}