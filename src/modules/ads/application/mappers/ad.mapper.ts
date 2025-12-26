import { Injectable } from '@nestjs/common';

@Injectable()
export class AdMapper {
  toLegacy(ad: any) {
    return {
      ad_id: ad.adId,
      title: ad.title,
      description: ad.description,
      video_url: ad.videoUrl,
      image_url: ad.imageUrl,
      link_url: ad.linkUrl,
      active: ad.active,
      created_at: ad.createdAt,
      updated_at: ad.updatedAt,
    };
  }
}
