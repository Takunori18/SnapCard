import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import CardyImage from '../common/CardyImage';
import { SnapCard } from '../../types/card';
import { useDm } from '../../contexts/DmContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 3) / 3;

interface UserProfileContentProps {
  userId: string;
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
  cardsCount?: number;
  cards?: SnapCard[];
  isOwnProfile?: boolean;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  onEditProfile?: () => void;
  showActions?: boolean;
}

export const UserProfileContent: React.FC<UserProfileContentProps> = ({
  userId,
  displayName,
  username,
  bio,
  avatarUrl,
  followersCount = 0,
  followingCount = 0,
  cardsCount = 0,
  cards = [],
  isOwnProfile = false,
  isFollowing = false,
  onFollowToggle,
  onEditProfile,
  showActions = true,
}) => {
  const shouldShowActions = showActions ?? true;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const { getOrCreateConversation } = useDm();

  const handleSendMessage = async () => {
    try {
      console.log('DM開始:', userId);
      const conversationId = await getOrCreateConversation(userId);
      console.log('会話ID取得成功:', conversationId);
      navigation.navigate('DmThread' as never, { conversationId } as never);
    } catch (error) {
      console.error('DM開始エラー:', error);
      alert('メッセージの送信に失敗しました。もう一度お試しください。');
    }
  };

  const renderGridItem = (item: SnapCard) => (
    <TouchableOpacity
      key={item.id}
      style={styles.gridItem}
      activeOpacity={0.8}
    >
      <CardyImage
        source={{ uri: item.thumbnailUrl ?? item.imageUri }}
        style={styles.gridImage}
        contentFit="cover"
        alt={item.title}
      />
      {item.mediaType === 'video' && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play" size={20} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* プロフィールヘッダー */}
      <View style={styles.header}>
        {/* アバター */}
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <CardyImage
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
              alt={displayName}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
            </View>
          )}
        </View>

        {/* 統計情報 */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{cardsCount}</Text>
            <Text style={styles.statLabel}>投稿</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>フォロワー</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>フォロー中</Text>
          </View>
        </View>
      </View>

      {/* プロフィール情報 */}
      <View style={styles.profileInfo}>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.username}>@{username}</Text>
        {bio && <Text style={styles.bio}>{bio}</Text>}
      </View>

      {/* アクションボタン */}
      {shouldShowActions && (
        <View style={styles.actions}>
          {isOwnProfile ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonFull]}
              onPress={onEditProfile}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonText}>プロフィールを編集</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.actionButtonHalf,
                  isFollowing && styles.actionButtonSecondary,
                ]}
                onPress={onFollowToggle}
                activeOpacity={0.7}
                disabled={!onFollowToggle}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    isFollowing && styles.actionButtonTextSecondary,
                  ]}
                >
                  {isFollowing ? 'フォロー中' : 'フォロー'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonHalf, styles.actionButtonSecondary]}
                onPress={handleSendMessage}
                activeOpacity={0.7}
              >
                <Ionicons name="mail-outline" size={18} color={theme.colors.textPrimary} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                  メッセージ
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* 投稿グリッド */}
      <View style={styles.gridContainer}>
        {cards.length > 0 ? (
          <View style={styles.grid}>
            {cards.map(renderGridItem)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>
              {isOwnProfile ? 'まだ投稿がありません' : '投稿がありません'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    avatarContainer: {
      width: 90,
      height: 90,
    },
    avatar: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: theme.colors.cardBackground,
    },
    avatarPlaceholder: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: theme.colors.cardBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stats: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    statLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    profileInfo: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      gap: 4,
    },
    displayName: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    username: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    bio: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.xs,
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.accent,
      gap: theme.spacing.xs,
      minHeight: 36,
    },
    actionButtonFull: {
      flex: 1,
    },
    actionButtonHalf: {
      flex: 1,
    },
    actionButtonSecondary: {
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionButtonText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.secondary,
    },
    actionButtonTextSecondary: {
      color: theme.colors.textPrimary,
    },
    gridContainer: {
      marginTop: theme.spacing.lg,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 1,
      backgroundColor: theme.colors.border,
    },
    gridItem: {
      width: GRID_ITEM_SIZE,
      height: GRID_ITEM_SIZE,
      position: 'relative',
      backgroundColor: theme.colors.cardBackground,
    },
    gridImage: {
      width: '100%',
      height: '100%',
    },
    videoIndicator: {
      position: 'absolute',
      top: theme.spacing.xs,
      right: theme.spacing.xs,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: theme.borderRadius.full,
      padding: 4,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
    },
    emptyText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.md,
    },
  });
