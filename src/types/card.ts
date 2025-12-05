export type CardMediaType = 'image' | 'video';

export interface SnapCard {
  id: string;
  imageUri?: string;
  videoUri?: string;
  thumbnailUrl?: string; // ★ 追加: サムネイル画像URL
  mediaType: CardMediaType;
  title?: string;
  caption?: string;
  location?: string;
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
