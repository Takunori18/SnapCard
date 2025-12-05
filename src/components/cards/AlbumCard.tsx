import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Album } from '../../types/card';
import { useTheme, Theme } from '../../theme';
import CardyImage from '../common/CardyImage';
import { optimizeRemoteImageUri } from '../../utils/image';

interface AlbumCardProps {
  album: Album;
  onPress?: () => void;
  onEditPress?: () => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({
  album,
  onPress,
  onEditPress,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const optimizedCover = album.coverImageUri
    ? optimizeRemoteImageUri(album.coverImageUri, 900)
    : null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* 外側のグラデーション枠（カード全体） */}
      <LinearGradient
        colors={['#3B82F6', '#22C55E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        {/* 中身本体（画像部分） */}
        <View style={styles.inner}>
          <View style={styles.coverWrapper}>
            {optimizedCover ? (
              <CardyImage
                source={{ uri: optimizedCover, cacheKey: `album-${album.id}` }}
                style={styles.coverImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                blurhash={BLUR_HASH}
                transition={200}
                alt={`${album.name}のカバー`}
                priority
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons
                  name="images-outline"
                  size={32}
                  color={theme.colors.textSecondary}
                />
              </View>
            )}

            {/* 編集ボタン（右上） */}
            {onEditPress && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={onEditPress}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ✅ サムネイルの一番下に重ねるバー（枠の上にも被せる） */}
        <View style={[styles.overlayBar, { backgroundColor: theme.colors.secondary }]}>
          <Text style={styles.barTitle} numberOfLines={1}>
            {album.name}
          </Text>
          <Text style={styles.barCount}>{album.cardIds.length} 枚</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      width: '48%',
      marginBottom: theme.spacing.md,
    },

    // グラデーション枠全体（カード全体を囲む）
    border: {
      borderRadius: theme.borderRadius.lg,
      padding: 2,
      position: 'relative',
      overflow: 'hidden',
    },

    // 枠の内側（画像エリア）
    inner: {
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.cardBackground,
    },

    // カードと同じ 3:4 の縦長比率
    coverWrapper: {
      width: '100%',
      aspectRatio: 3 / 4,
      position: 'relative',
      overflow: 'hidden',
    },

    coverImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },

    coverPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardBackground,
    },

    // 🔥 バー（サムネイルの一番下に重ねる & 枠の上にも被さる）
    overlayBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '20%', // 縦の 1/5
      paddingHorizontal: 8,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    barTitle: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.isDark ? '#ffffff' : theme.colors.textPrimary,
      marginRight: 4,
    },
    barCount: {
      fontSize: theme.fontSize.xs,
      color: theme.isDark ? '#E5E7EB' : theme.colors.textSecondary,
    },

    editButton: {
      position: 'absolute',
      right: 8,
      top: 8,
      padding: 6,
      borderRadius: theme.borderRadius.full,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
  });

const BLUR_HASH = 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH';
