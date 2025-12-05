import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import CardyImage from '../common/CardyImage';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

interface ProfileHeaderProps {
  profile: Profile | null;
  cardCount: number;
  onEditPress?: () => void;
  followersCount?: number;
  followingCount?: number;
  hideEdit?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  profile, 
  cardCount,
  onEditPress,
  followersCount = 0,
  followingCount = 0,
  hideEdit = false,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const displayName = profile?.display_name || profile?.username || 'ユーザー';
  const username = profile?.username || 'user';
  const bio = profile?.bio || '自己紹介はまだ設定されていません';
  const avatarUrl = profile?.avatar_url;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.topRow}
        activeOpacity={0.8}
        onPress={() => profile?.id && navigation.navigate('UserProfile', { profileId: profile.id })}
        disabled={!profile?.id}
      >
        {avatarUrl ? (
          <CardyImage
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            alt={`${displayName}のアバター`}
            priority
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
          </View>
        )}
        
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{cardCount}</Text>
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
      </TouchableOpacity>

      <View style={styles.infoSection}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => profile?.id && navigation.navigate('UserProfile', { profileId: profile.id })}
        >
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{username}</Text>
        </TouchableOpacity>
        <Text style={styles.bio}>{bio}</Text>
      </View>

      {!hideEdit && (
        <TouchableOpacity style={styles.editButton} onPress={onEditPress} activeOpacity={0.8}>
          <Text style={styles.editButtonText}>プロフィールを編集</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.secondary,
    },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.lg,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  infoSection: {
    marginBottom: theme.spacing.md,
  },
  displayName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  username: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  bio: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  editButton: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
    editButtonText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
  });
