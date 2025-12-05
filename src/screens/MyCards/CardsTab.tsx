import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SnapCardItem } from '../../components/cards/SnapCardItem';
import { SnapCardDetailModal } from '../../components/cards/SnapCardDetailModal';
import { useSnapCardContext } from '../../contexts/SnapCardContext';
import { useTheme, Theme } from '../../theme';
import { useAlbumContext } from '../../contexts/AlbumContext';
import { AlbumPickerModal } from '../../components/modals/AlbumPickerModal';
import { SnapCard } from '../../types/card';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CardsTab: React.FC = () => {
  const { cards, loading, deleteCard, reloadCards } = useSnapCardContext();
  const { albums, addCardToAlbum, addAlbum } = useAlbumContext();
  const theme = useTheme();

  const [sortOrder, setSortOrder] =
    useState<'newest' | 'oldest' | 'likes'>('newest');
  const [gridColumns, setGridColumns] = useState<2 | 3>(3); // ★ デフォルトを3列に

  const [albumModalVisible, setAlbumModalVisible] = useState(false);
  const [albumActionLoading, setAlbumActionLoading] = useState(false);

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDetailCardId, setSelectedDetailCardId] =
    useState<string | null>(null);

  const [mode, setMode] = useState<'view' | 'delete' | 'album'>('view');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // アカウント画面と同じ計算方法
  const gridGap = theme.spacing.sm;
  const CARD_ASPECT_RATIO = 3 / 4;
  const cardWidth = (SCREEN_WIDTH - gridGap * (gridColumns + 1)) / gridColumns;
  const cardHeight = cardWidth / CARD_ASPECT_RATIO;
  
  const styles = useMemo(
    () => createStyles(theme, gridGap, cardWidth, cardHeight),
    [theme, gridGap, cardWidth, cardHeight]
  );

  const isSelecting = mode !== 'view';

  const sortedCards: SnapCard[] = useMemo(() => {
    return [...cards].sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else if (sortOrder === 'oldest') {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
      return b.likesCount - a.likesCount;
    });
  }, [cards, sortOrder]);

  const selectedCards = useMemo(
    () => sortedCards.filter(card => selectedIds.has(card.id)),
    [sortedCards, selectedIds],
  );

  const closeAlbumPicker = () => {
    setAlbumModalVisible(false);
  };

  const toggleMode = (nextMode: 'view' | 'delete' | 'album') => {
    setSelectedIds(new Set());
    setMode(prev => (prev === nextMode ? 'view' : nextMode));
  };

  const toggleSelection = (cardId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleCardPress = (cardId: string) => {
    if (mode === 'view') {
      setSelectedDetailCardId(cardId);
      setDetailVisible(true);
      return;
    }
    toggleSelection(cardId);
  };

  const handleBulkDelete = () => {
    if (selectedCards.length === 0) {
      Alert.alert('カードを選択してください');
      return;
    }
    Alert.alert(
      '削除の確認',
      `${selectedCards.length}枚のカードを削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(selectedCards.map(card => deleteCard(card.id)));
            } catch (error) {
              console.error('カード一括削除エラー:', error);
            }
            setSelectedIds(new Set());
            setMode('view');
          },
        },
      ],
    );
  };

  const handleSelectAlbum = async (albumId: string) => {
    if (selectedCards.length === 0) {
      Alert.alert('カードを選択してください');
      return;
    }
    try {
      setAlbumActionLoading(true);
      for (const card of selectedCards) {
        await addCardToAlbum(albumId, card);
      }
      Alert.alert('アルバムに追加しました');
      setSelectedIds(new Set());
      setMode('view');
      closeAlbumPicker();
    } catch (error) {
      console.error('アルバム追加エラー:', error);
      Alert.alert('エラー', 'アルバムへの追加に失敗しました');
    } finally {
      setAlbumActionLoading(false);
    }
  };

  const handleCreateAlbum = async (name: string) => {
    const coverImage =
      selectedCards[0]?.imageUri ?? selectedCards[0]?.videoUri;
    const album = await addAlbum(name, coverImage);
    await handleSelectAlbum(album.id);
    return album;
  };

  const openAlbumModal = () => {
    if (selectedCards.length === 0) {
      Alert.alert('カードを選択してください');
      return;
    }
    setAlbumModalVisible(true);
  };

  const cycleSortOrder = () => {
    setSortOrder(prev => {
      if (prev === 'newest') return 'oldest';
      if (prev === 'oldest') return 'likes';
      return 'newest';
    });
  };

  const sortLabel =
    sortOrder === 'newest'
      ? '新しい順'
      : sortOrder === 'oldest'
      ? '古い順'
      : 'いいね順';
  const gridLabel = gridColumns === 2 ? '2列' : '3列';

  return (
    <View style={styles.container}>
      {/* ツールバー */}
      <View style={styles.viewToggle}>
        <View style={styles.modeIconGroup}>
          <TouchableOpacity
            style={[
              styles.modeIconButton,
              mode === 'delete' && styles.modeIconButtonActive,
            ]}
            onPress={() => toggleMode('delete')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="trash"
              size={18}
              color={
                mode === 'delete'
                  ? theme.colors.secondary
                  : theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeIconButton,
              mode === 'album' && styles.modeIconButtonActive,
            ]}
            onPress={() => toggleMode('album')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="albums-outline"
              size={18}
              color={
                mode === 'album'
                  ? theme.colors.secondary
                  : theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.toolbarButtons}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={cycleSortOrder}
            activeOpacity={0.7}
          >
            <Ionicons
              name="swap-vertical"
              size={18}
              color={theme.colors.accent}
            />
            <Text style={styles.viewButtonText}>{sortLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewButton}
            onPress={() =>
              setGridColumns(prev => (prev === 2 ? 3 : 2))
            }
            activeOpacity={0.7}
          >
            <Ionicons
              name="grid"
              size={18}
              color={theme.colors.accent}
            />
            <Text style={styles.viewButtonText}>{gridLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={reloadCards}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Ionicons
              name={loading ? 'sync' : 'refresh'}
              size={20}
              color={
                loading
                  ? theme.colors.textTertiary
                  : theme.colors.accent
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 一覧 */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.accent}
          />
        </View>
      ) : sortedCards.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="camera-outline"
            size={80}
            color={theme.colors.textTertiary}
          />
          <Text style={styles.emptyText}>まだカードがありません</Text>
          <Text style={styles.emptySubtext}>
            カメラで写真を撮って最初のカードを作成しましょう
          </Text>
        </View>
      ) : (
        <FlatList
          key={gridColumns}
          data={sortedCards}
          numColumns={gridColumns}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <SnapCardItem
                card={item}
                onPress={() => handleCardPress(item.id)}
                metaVariant="overlay"
                selectionMode={isSelecting}
                selected={selectedIds.has(item.id)}
              />
            </View>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* アルバム選択モーダル */}
      <AlbumPickerModal
        visible={albumModalVisible}
        albums={albums}
        onSelect={handleSelectAlbum}
        onCreateAlbum={handleCreateAlbum}
        onClose={closeAlbumPicker}
        pendingAction={albumActionLoading}
      />

      {/* カード詳細モーダル */}
      <SnapCardDetailModal
        visible={detailVisible}
        cards={sortedCards}
        initialCardId={selectedDetailCardId ?? undefined}
        onClose={() => {
          setDetailVisible(false);
          setSelectedDetailCardId(null);
        }}
      />

      {/* 一括操作バー */}
      {isSelecting && (
        <View style={styles.bulkActionBar}>
          <Text style={styles.bulkInfo}>
            {selectedIds.size} 枚選択中
          </Text>
          {mode === 'delete' ? (
            <TouchableOpacity
              style={[styles.bulkButton, styles.bulkButtonDanger]}
              onPress={handleBulkDelete}
              disabled={selectedCards.length === 0}
            >
              <Ionicons
                name="trash"
                size={18}
                color={theme.colors.secondary}
              />
              <Text style={styles.bulkButtonText}>
                選択カードを削除
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.bulkButton, styles.bulkButtonPrimary]}
              onPress={openAlbumModal}
              disabled={selectedCards.length === 0}
            >
              <Ionicons
                name="albums"
                size={18}
                color={theme.colors.secondary}
              />
              <Text style={styles.bulkButtonText}>
                アルバムに追加
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: Theme, gridGap: number, cardWidth: number, cardHeight: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    viewToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    toolbarButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    viewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.cardBackground,
    },
    viewButtonText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.xs / 2,
    },
    modeIconGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    modeIconButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardBackground,
    },
    modeIconButtonActive: {
      backgroundColor: theme.colors.accent,
    },
    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardBackground,
    },
    list: {
      paddingTop: gridGap,
      paddingBottom: theme.spacing.lg,
    },
    columnWrapper: {
      paddingHorizontal: gridGap,
      justifyContent: 'space-between',
    },
    cardWrapper: {
      width: cardWidth,
      height: cardHeight,
      marginBottom: gridGap,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    emptyText: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.sm,
      textAlign: 'center',
    },
    bulkActionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.secondary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    bulkInfo: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    bulkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      gap: theme.spacing.xs,
    },
    bulkButtonPrimary: {
      backgroundColor: theme.colors.accent,
    },
    bulkButtonDanger: {
      backgroundColor: theme.colors.error,
    },
    bulkButtonText: {
      color: theme.colors.secondary,
      fontWeight: theme.fontWeight.semibold,
    },
  });
