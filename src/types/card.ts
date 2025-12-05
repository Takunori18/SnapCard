export type CardMediaType = 'image' | 'video';

// ★ 位置情報を追加
export interface CardLocation {
  latitude: number;
  longitude: number;
  placeId?: string;
  placeName?: string;
  placeAddress?: string;
}

export interface SnapCard {
  id: string;
  imageUri?: string;
  videoUri?: string;
  thumbnailUrl?: string;
  mediaType: CardMediaType;
  title?: string;
  caption?: string;
  location?: string; // 既存: テキスト形式の場所名
  locationData?: CardLocation; // ★ 新規: 構造化された位置情報
  tags: string[];
  likesCount: number;
  createdAt: Date;
  userId: string;
  isPublic?: boolean;
}

export interface Album {
  id: string;
  userId: string;
  name: string;
  coverImageUri?: string;
  cardIds: string[];
  createdAt: Date;
}