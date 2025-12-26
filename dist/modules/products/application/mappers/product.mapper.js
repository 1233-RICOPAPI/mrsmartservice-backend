export function toLegacyProduct(p) {
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
//# sourceMappingURL=product.mapper.js.map