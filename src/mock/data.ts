import { User, Story } from '../types';
import { SnapCard, Album } from '../types/card';

export const mockUser: User = {
  id: '1',
  username: 'taku_ohto',
  displayName: '大戸拓知',
  avatarUrl: 'https://i.pravatar.cc/150?img=1',
  bio: 'カフェ巡りが趣味です☕️\n素敵な瞬間を切り取ります📸',
  followersCount: 1234,
  followingCount: 567,
  isPublic: true,
};

export const mockCards: SnapCard[] = [
  {
    id: '1',
    userId: '1',
    imageUrl: 'https://picsum.photos/400/600?random=1',
    title: '渋谷のカフェ',
    caption: '素敵なラテアート☕️ #カフェ #渋谷',
    location: {
      latitude: 35.6595,
      longitude: 139.7004,
      name: '渋谷カフェ',
    },
    isPublic: true,
    likesCount: 234,
    commentsCount: 12,
    createdAt: new Date('2024-12-01'),
    tags: ['カフェ', '渋谷'],
  },
  {
    id: '2',
    userId: '1',
    imageUrl: 'https://picsum.photos/400/600?random=2',
    title: '夕暮れの空',
    caption: '美しい夕焼け🌅',
    isPublic: false,
    likesCount: 89,
    commentsCount: 5,
    createdAt: new Date('2024-11-28'),
    tags: ['夕焼け', '空'],
  },
  {
    id: '3',
    userId: '1',
    imageUrl: 'https://picsum.photos/400/600?random=3',
    title: 'ランチ',
    caption: '今日のランチ🍝',
    isPublic: true,
    likesCount: 156,
    commentsCount: 8,
    createdAt: new Date('2024-11-25'),
    tags: ['ランチ', 'パスタ'],
  },
  {
    id: '4',
    userId: '1',
    imageUrl: 'https://picsum.photos/400/600?random=4',
    title: '新宿の夜景',
    caption: 'キラキラ✨ #夜景 #新宿',
    isPublic: true,
    likesCount: 342,
    commentsCount: 23,
    createdAt: new Date('2024-11-20'),
    tags: ['夜景', '新宿'],
  },
  {
    id: '5',
    userId: '1',
    imageUrl: 'https://picsum.photos/400/600?random=5',
    title: 'スイーツ',
    caption: '今日のおやつ🍰',
    isPublic: false,
    likesCount: 78,
    commentsCount: 4,
    createdAt: new Date('2024-11-15'),
    tags: ['スイーツ', 'カフェ'],
  },
];

export const mockAlbums: Album[] = [
  {
    id: '1',
    userId: '1',
    name: '東京カフェ巡り',
    coverImageUri: 'https://picsum.photos/400/400?random=10',
    cardIds: ['1', '2', '3'],
    createdAt: new Date('2024-11-01'),
  },
  {
    id: '2',
    userId: '1',
    name: '秋の思い出',
    coverImageUri: 'https://picsum.photos/400/400?random=11',
    cardIds: ['4', '5'],
    createdAt: new Date('2024-10-15'),
  },
  {
    id: '3',
    userId: '1',
    name: '美味しいもの記録',
    coverImageUri: 'https://picsum.photos/400/400?random=12',
    cardIds: ['6', '7', '8', '9'],
    createdAt: new Date('2024-09-10'),
  },
];

export const mockStories: Story[] = [
  {
    id: '1',
    userId: '2',
    username: 'yuki_san',
    avatarUrl: 'https://i.pravatar.cc/150?img=2',
    hasViewed: false,
  },
  {
    id: '2',
    userId: '3',
    username: 'kenji_photo',
    avatarUrl: 'https://i.pravatar.cc/150?img=3',
    hasViewed: true,
  },
  {
    id: '3',
    userId: '4',
    username: 'miho_travel',
    avatarUrl: 'https://i.pravatar.cc/150?img=4',
    hasViewed: false,
  },
  {
    id: '4',
    userId: '5',
    username: 'takeshi_k',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
    hasViewed: false,
  },
  {
    id: '5',
    userId: '6',
    username: 'ai_foodie',
    avatarUrl: 'https://i.pravatar.cc/150?img=6',
    hasViewed: true,
  },
];

export const mockDiscoverCards: SnapCard[] = [
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `discover-${i + 1}`,
    userId: `user-${(i % 5) + 1}`,
    imageUrl: `https://picsum.photos/400/600?random=${i + 20}`,
    title: `発見カード ${i + 1}`,
    caption: `素敵な瞬間 #snapcard #photo`,
    isPublic: true,
    likesCount: Math.floor(Math.random() * 1000),
    commentsCount: Math.floor(Math.random() * 50),
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    tags: ['snapcard'],
  })),
];
