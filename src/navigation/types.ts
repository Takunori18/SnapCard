// path: src/navigation/types.ts
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';

export type RootStackParamList = {
  MainTabs: undefined;
  CardDetail: { cardId: string };
  AlbumDetail: { albumId: string };
  CardEdit: { mediaUri: string; mediaType?: 'photo' | 'video' };
  StoryEdit: undefined;
  CardEditor: undefined;
  StoryEditor: undefined;
  ProfileEdit: undefined;
  Settings: undefined;
  UserProfile: { profileId: string };
  DmList: undefined;
  DmThread: { conversationId: string };
};

export type BottomTabParamList = {
  MyCards: undefined;
  Home: undefined;
  Camera: undefined;
  Map: undefined;
  Account: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  StackScreenProps<RootStackParamList, T>;

export type BottomTabScreenProps<T extends keyof BottomTabParamList> =
  CompositeScreenProps
    BottomTabScreenProps<BottomTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}