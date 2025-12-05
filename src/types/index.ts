export interface SnapCard {
  id: string;
  userId: string;
  imageUrl: string;
  videoUrl?: string;
  title: string;
  caption: string;
  location?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  isPublic: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  tags: string[];
}

export interface Album {
  id: string;
  userId: string;
  title: string;
  coverImageUrl: string;
  cardsCount: number;
  createdAt: Date;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  isPublic: boolean;
}

export interface Story {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  hasViewed: boolean;
}

export type RootStackParamList = {
  MainTabs: undefined;
  CardDetail: { cardId: string };
  AlbumDetail: { albumId: string };
  ProfileEdit: undefined;
  Settings: undefined;
};

export type BottomTabParamList = {
  MyCards: undefined;
  Home: undefined;
  Camera: undefined;
  Map: undefined;
  Account: undefined;
};
