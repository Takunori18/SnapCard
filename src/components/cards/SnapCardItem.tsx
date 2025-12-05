import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import CardyImage from '../common/CardyImage';
import { SnapCard } from '../../types/card';
import { useTheme, Theme } from '../../theme';
import { optimizeRemoteImageUri } from '../../utils/image';
import { formatCardDate } from '../../utils/date';

interface SnapCardItemProps {
  card: SnapCard;
  onPress?: () => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
  style?: StyleProp<ViewStyle>;
  onAddToAlbum?: () => void;
  authorName?: string;
  authorAvatarUri?: string | null;
  metaVariant?: 'overlay' | 'bottom';
  selectionMode?: boolean;
  selected?: boolean;
  onAuthorPress?: () => void;
}

export const SnapCardItem: React.FC<SnapCardItemProps> = ({
  card,
  onPress,
  onDelete,
  showDelete = false,
  style,
  onAddToAlbum,
  authorName,
  authorAvatarUri,
  metaVariant = 'bottom',
  selectionMode = false,
  selected = false,
  onAuthorPress,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [imageError, setImageError] = useState(false);

  const overlayIconColor = theme.isDark
    ? theme.colors.textPrimary
    : theme.colors.secondary;

  const displayTitle = card.title?.trim() || '無題';
  const formattedDate = useMemo(
    () => formatCardDate(card.createdAt),
    [card.createdAt],
  );

  // ★ サムネイル優先表示
  const displayImageUri = card.thumbnailUrl ?? card.imageUri;

  useEffect(() => {
    setImageError(false);
  }, [displayImageUri]);

  const handleDelete = () => {
    const execute = () => onDelete?.(card.id);

    if (Platform.OS === 'web') {
      if (window.confirm('このカードを削除しますか？')) execute();
      return;
    }

    Alert.alert('削除確認', 'このカードを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: execute },
    ]);
  };

  const optimizedUri = useMemo(
    () => optimizeRemoteImageUri(displayImageUri, 900),
    [displayImageUri],
  );

  const imageSource = optimizedUri
    ? {
        uri: optimizedUri,
        cacheKey: `${card.id}-thumb`,
      }
    : undefined;

  const renderCardImage = () => {
    if (imageError || !optimizedUri) {
      return (
        <View style={styles.imagePlaceholder}>
          <Ionicons
            name="image"
            size={32}
            color={theme.colors.textTertiary}
          />
          <Text style={styles.placeholderText}>画像を読み込めません</Text>
        </View>
      );
    }

    return (
      <CardyImage
        source={imageSource}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
        blurhash={DEFAULT_BLURHASH}
        onError={() => setImageError(true)}
      />
    );
  };

  return (
    <LinearGradient
      colors={['#00B4FF', '#00FF99']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientBorder, style]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.innerContainer}
      >
        <View style={styles.imageWrapper}>
          {renderCardImage()}

          {/* Album ボタン */}
          {onAddToAlbum && !selectionMode && (
            <TouchableOpacity
              style={[styles.actionButton, { left: 10 }]}
              onPress={onAddToAlbum}
            >
              <Ionicons
                name="albums-outline"
                size={18}
                color={overlayIconColor}
              />
            </TouchableOpacity>
          )}

          {/* Delete */}
          {showDelete && !selectionMode && (
            <TouchableOpacity
              style={[styles.actionButton, { right: 10 }]}
              onPress={handleDelete}
            >
              <Ionicons
                name="trash"
                size={20}
                color={overlayIconColor}
              />
            </TouchableOpacity>
          )}

          {/* Selecting mode */}
          {selectionMode && (
            <View
              style={[
                styles.selectionOverlay,
                selected && styles.selectionOverlaySelected,
              ]}
              pointerEvents="none"
            >
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={selected ? 32 : 28}
                color={selected ? theme.colors.accent : theme.colors.secondary}
              />
            </View>
          )}
        </View>

        {/* Bottom bar */}
        {metaVariant === 'bottom' && (
          <View style={styles.bottomBar}>
            <Text style={styles.bottomTitle} numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text style={styles.bottomDate}>{formattedDate}</Text>
          </View>
        )}
      </TouchableOpacity>
    </LinearGradient>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    gradientBorder: {
      padding: 3,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
    },
    innerContainer: {
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.cardBackground,
    },
    imageWrapper: {
      width: '100%',
      aspectRatio: 3 / 4,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    actionButton: {
      position: 'absolute',
      top: 10,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 10,
    },
    bottomBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.secondary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      minHeight: 44,
    },
    bottomTitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textPrimary,
      flex: 1,
      marginRight: theme.spacing.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    bottomDate: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    imagePlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 10,
      backgroundColor: theme.colors.cardBackground,
    },
    placeholderText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    selectionOverlay: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    selectionOverlaySelected: {
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
  });

const DEFAULT_BLURHASH = 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH';
