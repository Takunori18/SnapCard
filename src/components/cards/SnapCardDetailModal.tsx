import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CardyImage from '../common/CardyImage';
import CardyVideo from '../common/CardyVideo';
import { SnapCard } from '../../types/card';
import { useTheme, Theme } from '../../theme';
import { formatCardDate } from '../../utils/date';

interface SnapCardDetailModalProps {
  visible: boolean;
  cards: SnapCard[];
  initialCardId?: string;
  initialIndex?: number;
  onClose: () => void;
}

const CARD_ASPECT_RATIO = 3 / 4;
const COLLAPSED_BOARD = 150;
const MAX_BOARD_HEIGHT = 380;

export const SnapCardDetailModal: React.FC<SnapCardDetailModalProps> = ({
  visible,
  cards,
  initialCardId,
  initialIndex = 0,
  onClose,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const flatListRef = useRef<FlatList<SnapCard>>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [infoExpanded, setInfoExpanded] = useState(false);

  useEffect(() => {
    if (!visible) return;

    let startIndex = 0;

    if (initialCardId) {
      const found = cards.findIndex(c => c.id === initialCardId);
      startIndex = found !== -1 ? found : initialIndex;
    } else {
      startIndex = initialIndex;
    }

    const safeIndex = Math.min(Math.max(startIndex, 0), cards.length - 1);

    setCurrentIndex(safeIndex);
    setInfoExpanded(false);

    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: safeIndex,
        animated: false,
      });
    }, 0);
  }, [visible, initialCardId, initialIndex, cards]);

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);

    if (!Number.isNaN(nextIndex)) {
      const safe = Math.min(Math.max(nextIndex, 0), cards.length - 1);
      setCurrentIndex(safe);
      setInfoExpanded(false);
    }
  };

  const boardHeight = infoExpanded
    ? Math.min(height * 0.45, MAX_BOARD_HEIGHT)
    : COLLAPSED_BOARD;

  const renderItem = ({ item }: { item: SnapCard }) => {
    const binderWidth = width;
    const binderHeight = (binderWidth * 4) / 3;

    let displayWidth = binderWidth * 0.82;
    let displayHeight = displayWidth / CARD_ASPECT_RATIO;

    if (displayHeight > binderHeight * 0.9) {
      displayHeight = binderHeight * 0.9;
      displayWidth = displayHeight * CARD_ASPECT_RATIO;
    }

    // ★ 詳細表示では元画像（imageUri）を使用、サムネイルは使わない
    const detailImageUri = item.imageUri;

    return (
      <View style={[styles.slide, { width, height }]}>
        <View style={[styles.cardArea, { width: binderWidth, height: binderHeight }]}>
          <View
            style={[
              styles.cardWrapper,
              { width: displayWidth, height: displayHeight },
            ]}
          >
            {item.mediaType === 'video' && item.videoUri ? (
              <CardyVideo
                source={{ uri: item.videoUri }}
                style={styles.detailImage}
                resizeMode="cover"
                useNativeControls
              />
            ) : detailImageUri ? (
              <CardyImage
                source={{ uri: detailImageUri }}
                style={styles.detailImage}
                contentFit="cover"
                alt={item.title || item.caption || 'カード画像'}
              />
            ) : (
              <View style={styles.detailPlaceholder}>
                <Ionicons
                  name="image-outline"
                  size={42}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.placeholderText}>メディアを読み込めません</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.infoBoard, { height: boardHeight }]}
          onPress={() => setInfoExpanded(prev => !prev)}
        >
          <View style={styles.boardHandle} />
          <View style={styles.boardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle} numberOfLines={1}>
                {item.title?.trim() || '無題'}
              </Text>
              <Text style={styles.detailDate}>
                {formatCardDate(item.createdAt)}
              </Text>
            </View>
            <Text style={styles.detailCounter}>
              {`${currentIndex + 1}/${cards.length}`}
            </Text>
          </View>

          {item.caption ? (
            <Text style={styles.detailCaption} numberOfLines={infoExpanded ? undefined : 2}>
              {item.caption}
            </Text>
          ) : null}

          {item.location ? (
            <View style={styles.detailMetaRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.detailMetaText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          ) : null}

          {item.tags.length > 0 && (
            <View style={styles.detailTagRow}>
              {item.tags.map(tag => (
                <Text key={tag} style={styles.detailTag}>
                  #{tag}
                </Text>
              ))}
            </View>
          )}

          {!infoExpanded && (
            <Text style={styles.expandHint}>タップしてカード情報を表示</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
        >
          <Ionicons name="close" size={28} color={theme.colors.secondary} />
        </TouchableOpacity>

        <View style={{ flex: 1, width: '100%' }}>
          {cards.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={cards}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={(data, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              onMomentumScrollEnd={handleMomentumEnd}
              decelerationRate="fast"
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>カードがありません</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
    },
    closeButton: {
      position: 'absolute',
      top: theme.spacing.xl,
      right: theme.spacing.xl,
      zIndex: 20,
      padding: theme.spacing.xs,
    },
    slide: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardArea: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardWrapper: {
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.cardBackground,
      elevation: 10,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    detailImage: {
      width: '100%',
      height: '100%',
    },
    detailPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.cardBackground,
    },
    placeholderText: {
      color: theme.colors.textSecondary,
    },
    infoBoard: {
      width: '100%',
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      position: 'absolute',
      bottom: 0,
    },
    boardHandle: {
      alignSelf: 'center',
      width: 48,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
    },
    boardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    detailTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    detailDate: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    detailCounter: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    detailCaption: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.xs,
    },
    detailMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    detailMetaText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    detailTagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: theme.spacing.xs,
    },
    detailTag: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accent,
    },
    expandHint: {
      marginTop: theme.spacing.sm,
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      color: theme.colors.textSecondary,
    },
  });
