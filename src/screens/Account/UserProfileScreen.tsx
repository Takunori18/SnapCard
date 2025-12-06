import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useFollowContext } from '../../contexts/FollowContext';
import { SnapCard, CardMediaType } from '../../types/card';
import { fetchFollowStats, FollowStats } from '../../utils/follow';
import { RootStackParamList } from '../../navigation/types';
import { UserProfileContent } from '../../components/profile/UserProfileContent';
import { useTheme, Theme } from '../../theme';

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

type FetchedProfile = {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
};

export const UserProfileScreen: React.FC = () => {
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, profile } = useAuth();
  const { isFollowing, toggleFollow } = useFollowContext();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const profileId = route.params.profileId;
  const activeProfileId = profile?.id ?? user?.id ?? null;
  const viewingOwn = profileId === activeProfileId;

  const [profileData, setProfileData] = useState<FetchedProfile | null>(null);
  const [cards, setCards] = useState<SnapCard[]>([]);
  const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0 });
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fetchProfileRow = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, avatar_url, bio')
        .eq('id', profileId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data ?? null;
    } catch (error) {
      console.error('プロフィール取得エラー:', error);
      return null;
    }
  }, [profileId]);

  const fetchCards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select(
          'id, image_url, video_url, media_type, caption, location, tags, likes_count, created_at, thumbnail_url, is_public, user_id',
        )
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) {
        throw error;
      }

      return (data ?? []).map((card: any) => {
        const mediaType: CardMediaType =
          (card.media_type as CardMediaType) ?? (card.video_url ? 'video' : 'image');
        return {
          id: card.id,
          imageUri: card.image_url ?? undefined,
          videoUri: card.video_url ?? undefined,
          thumbnailUrl: card.thumbnail_url ?? undefined,
          mediaType,
          caption: card.caption,
          location: card.location,
          tags: Array.isArray(card.tags) ? card.tags : [],
          likesCount: card.likes_count ?? 0,
          createdAt: card.created_at ? new Date(card.created_at) : new Date(),
          userId: card.user_id ?? profileId,
          isPublic: card.is_public ?? true,
        };
      });
    } catch (error) {
      console.error('カード取得エラー:', error);
      return [];
    }
  }, [profileId]);

  useEffect(() => {
    let isMounted = true;
    setLoadingProfile(true);

    const loadData = async () => {
      try {
        const [fetchedProfile, fetchedCards, stats] = await Promise.all([
          fetchProfileRow(),
          fetchCards(),
          fetchFollowStats(profileId),
        ]);

        if (!isMounted) return;

        setProfileData(fetchedProfile);
        setCards(fetchedCards);
        setFollowStats(stats);
      } catch (error) {
        console.error('プロフィール画面読み込みエラー:', error);
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [profileId, fetchProfileRow, fetchCards]);

  const displayName = profileData?.display_name ?? route.params.displayName ?? 'ユーザー';
  const username = profileData?.username ?? route.params.username ?? 'user';
  const avatarUrl = profileData?.avatar_url ?? route.params.avatarUrl;
  const bio = profileData?.bio;
  const followersCount = followStats.followers;
  const followingCount = followStats.following;

  const handleEditProfile = () => {
    navigation.navigate('AccountSettings');
  };

  const followHandler = () => {
    if (viewingOwn) return;
    void toggleFollow(profileId);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topButton} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={styles.topTitleWrapper}>
          <Text style={styles.topTitle}>{viewingOwn ? 'マイプロフィール' : 'プロフィール'}</Text>
        </View>
        <TouchableOpacity
          style={styles.topButton}
          onPress={() => navigation.navigate('MainTabs')}
          accessibilityRole="button"
        >
          <Ionicons name="home-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.modeBar}>
        <Ionicons name="eye-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.modeText}>
          {viewingOwn ? '自分のプロフィールを表示中' : '閲覧専用モード'}
        </Text>
      </View>

      <View style={styles.loaderWrapper}>
        {loadingProfile && <ActivityIndicator color={theme.colors.accent} />}
      </View>

      <View style={styles.content}>
        <UserProfileContent
          userId={profileId}
          displayName={displayName}
          username={username}
          bio={bio}
          avatarUrl={avatarUrl}
          followersCount={followersCount}
          followingCount={followingCount}
          cardsCount={cards.length}
          cards={cards}
          isOwnProfile={viewingOwn}
          isFollowing={!viewingOwn && isFollowing(profileId)}
          onFollowToggle={followHandler}
          onEditProfile={viewingOwn ? handleEditProfile : undefined}
          showActions={!loadingProfile}
        />
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>
          {viewingOwn ? '編集はアカウントタブから行えます' : '戻るには左上の矢印をタップしてください'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topBar: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.secondary,
    },
    topButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitleWrapper: {
      flex: 1,
      alignItems: 'center',
    },
    topTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    modeBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modeText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    content: {
      flex: 1,
    },
    loaderWrapper: {
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    bottomBar: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.secondary,
    },
    bottomText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
