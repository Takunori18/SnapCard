import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, TouchableOpacity, Modal, TextInput, Alert, useWindowDimensions } from 'react-native';
import { AlbumCard } from '../../components/cards/AlbumCard';
import { useAlbums } from '../../hooks/useAlbums';
import { useTheme, Theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { Album } from '../../types/card';
import { useSnapCardContext } from '../../contexts/SnapCardContext';
import { SnapCard } from '../../types/card';
import CardyImage from '../../components/common/CardyImage';
import { LinearGradient } from 'expo-linear-gradient';

export const AlbumsTab: React.FC = () => {
  const { albums, loading, addAlbum, renameAlbum, deleteAlbum, removeCardFromAlbum, moveCardWithinAlbum } = useAlbums();
  const { cards, loading: cardsLoading } = useSnapCardContext();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [modalVisible, setModalVisible] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [editName, setEditName] = useState('');
  const [updating, setUpdating] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerAlbum, setViewerAlbum] = useState<Album | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const viewerPageWidth = screenWidth - theme.spacing.md * 4;
  const cardGap = theme.spacing.sm;
  const cardWidth = Math.max(80, (viewerPageWidth - theme.spacing.md * 2 - cardGap * 2) / 3);
  const cardSizeStyle = useMemo(
    () => ({
      width: cardWidth,
      height: cardWidth * (4 / 3),
    }),
    [cardWidth]
  );
  const [pendingMove, setPendingMove] = useState<{ cardId: string; fromIndex: number } | null>(null);
  const [actionMode, setActionMode] = useState<'none' | 'move' | 'delete'>('none');
  const [actionPanelVisible, setActionPanelVisible] = useState(false);

  const handleCreateAlbum = async () => {
    const trimmed = albumName.trim();
    if (!trimmed) {
      Alert.alert('バインダー名を入力してください');
      return;
    }

    try {
      setCreating(true);
      await addAlbum(trimmed);
      setAlbumName('');
      setModalVisible(false);
    } catch (error) {
      console.error('バインダー作成エラー:', error);
      Alert.alert('エラー', 'バインダーの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (album: Album) => {
    setSelectedAlbum(album);
    setEditName(album.name);
    setEditModalVisible(true);
  };

  const handleOpenViewer = (album: Album) => {
    setViewerAlbum(album);
    setViewerVisible(true);
  };

  const handleCloseViewer = () => {
    setViewerVisible(false);
    setViewerAlbum(null);
    setPendingMove(null);
    setActionMode('none');
    setActionPanelVisible(false);
  };

  const viewerCards = useMemo(() => {
    if (!viewerAlbum) return [];
    const cardMap = new Map(cards.map(card => [card.id, card]));
    return viewerAlbum.cardIds
      .map(cardId => cardMap.get(cardId))
      .filter((card): card is SnapCard => Boolean(card));
  }, [cards, viewerAlbum]);

  const viewerPages = useMemo(() => {
    const total = viewerCards.length;
    const pageCount = Math.max(1, Math.ceil(total / 9));
    const pages: Array<Array<SnapCard | null>> = [];
    for (let page = 0; page < pageCount; page += 1) {
      const start = page * 9;
      const slots: Array<SnapCard | null> = viewerCards.slice(start, start + 9);
      while (slots.length < 9) {
        slots.push(null);
      }
      pages.push(slots);
    }
    return pages;
  }, [viewerCards]);

  useEffect(() => {
    if (!viewerAlbum) return;
    const latest = albums.find(album => album.id === viewerAlbum.id);
    if (!latest) {
      handleCloseViewer();
      return;
    }
    if (latest !== viewerAlbum) {
      setViewerAlbum(latest);
    }
  }, [albums, viewerAlbum]);

  const handleRemoveCard = async (cardId: string) => {
    if (!viewerAlbum) return;
    try {
      await removeCardFromAlbum(viewerAlbum.id, cardId);
    } catch (error) {
      console.error('アルバムからの削除エラー:', error);
      Alert.alert('エラー', 'カードの削除に失敗しました');
    }
  };

  const handleMoveTarget = async (targetIndex: number) => {
    if (!viewerAlbum || !pendingMove) return;
    try {
      await moveCardWithinAlbum(
        viewerAlbum.id,
        pendingMove.fromIndex,
        Math.max(0, Math.min(targetIndex, viewerAlbum.cardIds.length))
      );
    } catch (error) {
      console.error('カード移動エラー:', error);
      Alert.alert('エラー', 'カードの移動に失敗しました');
    } finally {
      setPendingMove(null);
      setActionMode('none');
    }
  };

  const handleCardPress = (card: SnapCard | null, globalIndex: number) => {
    if (!card) return;
    if (actionMode === 'delete') {
      Alert.alert('カードを削除', 'このカードをバインダーから削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => handleRemoveCard(card.id),
        },
      ]);
      return;
    }
    if (actionMode === 'move') {
      if (!pendingMove) {
        setPendingMove({ cardId: card.id, fromIndex: globalIndex });
      } else {
        handleMoveTarget(globalIndex);
      }
    }
  };

  const toggleActionMode = (mode: 'move' | 'delete') => {
    if (actionMode === mode) {
      setActionMode('none');
      setPendingMove(null);
    } else {
      setActionMode(mode);
      setPendingMove(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedAlbum) return;
    try {
      setUpdating(true);
      await renameAlbum(selectedAlbum.id, editName);
      setEditModalVisible(false);
      setSelectedAlbum(null);
    } catch (error) {
      console.error('バインダー更新エラー:', error);
      Alert.alert('エラー', 'バインダーの更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!selectedAlbum) return;

    Alert.alert(
      'バインダーを削除',
      'バインダー内のカードの紐付けが解除されます。削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAlbum(selectedAlbum.id);
              setEditModalVisible(false);
              setSelectedAlbum(null);
              if (viewerAlbum?.id === selectedAlbum.id) {
                handleCloseViewer();
              }
            } catch (error) {
              console.error('バインダー削除エラー:', error);
              Alert.alert('エラー', 'バインダーの削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.secondary} />
          <Text style={styles.createButtonText}>新しいバインダー</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={albums}
          renderItem={({ item }) => (
            <AlbumCard 
              album={item} 
              onPress={() => handleOpenViewer(item)}
              onEditPress={() => handleOpenEdit(item)}
            />
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={albums.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>バインダーを作成してカードを整理しましょう</Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新しいバインダー</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="バインダー名"
              placeholderTextColor={theme.colors.textTertiary}
              value={albumName}
              onChangeText={setAlbumName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setModalVisible(false);
                  setAlbumName('');
                }}
              >
                <Text style={styles.modalButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimary]}
                onPress={handleCreateAlbum}
                disabled={creating}
              >
                <Text style={styles.modalPrimaryText}>
                  {creating ? '作成中...' : '作成'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={viewerVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseViewer}
      >
        <View style={styles.viewerOverlay}>
    <View style={styles.viewerSheet}>
      <View style={styles.viewerPage}>
              <View style={styles.viewerHeader}>
                <TouchableOpacity onPress={handleCloseViewer} style={styles.viewerHeaderButton}>
                  <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.viewerTitleWrapper}>
                  <Text style={styles.viewerTitle} numberOfLines={1}>
                    {viewerAlbum?.name}
                  </Text>
                  <Text style={styles.viewerSubtitle}>
                    {viewerAlbum?.cardIds.length ?? 0} 枚
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setActionPanelVisible((prev) => !prev);
                    setActionMode('none');
                    setPendingMove(null);
                  }}
                  style={styles.viewerHeaderButton}
                >
                  <Ionicons name="create-outline" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <View style={styles.viewerDivider} />
              {actionPanelVisible && (
                <View style={styles.viewerActions}>
                  <TouchableOpacity
                    style={[styles.actionChip, actionMode === 'move' && styles.actionChipActive]}
                    onPress={() => toggleActionMode('move')}
                  >
                    <Ionicons name="swap-vertical" size={16} color={theme.colors.textPrimary} />
                    <Text style={styles.actionChipText}>位置を変更</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionChip, actionMode === 'delete' && styles.actionChipActive]}
                    onPress={() => toggleActionMode('delete')}
                  >
                    <Ionicons name="trash" size={16} color={theme.colors.textPrimary} />
                    <Text style={styles.actionChipText}>カード削除</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionChip}
                    onPress={() => viewerAlbum && handleOpenEdit(viewerAlbum)}
                  >
                    <Ionicons name="create-outline" size={16} color={theme.colors.textPrimary} />
                    <Text style={styles.actionChipText}>名前編集</Text>
                  </TouchableOpacity>
                </View>
              )}
              {actionMode === 'move' && (
                <Text style={styles.moveHint}>
                  {pendingMove ? '移動先をタップしてください' : '移動したいカードをタップしてください'}
                </Text>
              )}
              {cardsLoading ? (
                <View style={styles.viewerCenter}>
                  <ActivityIndicator size="large" color={theme.colors.accent} />
                </View>
              ) : viewerCards.length === 0 ? (
                <View style={styles.viewerCenter}>
                  <Ionicons name="image-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={styles.viewerEmptyText}>このバインダーにはまだカードがありません</Text>
                </View>
              ) : (
        <FlatList
          style={styles.viewerPager}
          data={viewerPages}
          keyExtractor={(_, idx) => `page-${idx}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: slots, index: pageIndex }) => (
            <View style={[styles.viewerPageContent, { width: viewerPageWidth }]}>
              {[0, 1, 2].map((rowIndex) => (
                <View key={`row-${rowIndex}`} style={[styles.viewerRow, { gap: cardGap }]}>
                  {[0, 1, 2].map((colIndex) => {
                    const slotIndex = pageIndex * 9 + rowIndex * 3 + colIndex;
                    const slot = slots[rowIndex * 3 + colIndex];
                    if (!slot) {
                      const emptyStyles = [styles.viewerCard, cardSizeStyle, styles.viewerCardPlaceholderEmpty] as const;
                      if (actionMode === 'move' && pendingMove) {
                        return (
                          <TouchableOpacity
                            key={`empty-${rowIndex}-${colIndex}`}
                            activeOpacity={0.7}
                            onPress={() => handleMoveTarget(slotIndex)}
                          >
                            <View style={emptyStyles} />
                          </TouchableOpacity>
                        );
                      }
                      return (
                        <View key={`empty-${rowIndex}-${colIndex}`} style={emptyStyles} />
                      );
                    }
                    const displayUri = slot.thumbnailUrl ?? slot.imageUri;
                    return (
                      <LinearGradient
                        key={slot.id}
                        colors={['#00B4FF', '#00FF99']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.viewerCardGradient, cardSizeStyle]}
                      >
                        <TouchableOpacity
                          activeOpacity={actionMode === 'none' ? 1 : 0.8}
                          onPress={() => handleCardPress(slot, slotIndex)}
                          style={[
                            styles.viewerCard,
                            slotIndex === pendingMove?.fromIndex && styles.viewerCardActive,
                          ]}
                        >
                          {displayUri ? (
                            <CardyImage
                              source={{ uri: displayUri, cacheKey: `album-card-${slot.id}` }}
                              style={styles.viewerCardImage}
                              contentFit="cover"
                              alt={`バインダーカード ${slot.id}`}
                            />
                          ) : (
                            <View style={styles.viewerCardPlaceholder}>
                              <Ionicons name="image" size={20} color={theme.colors.textSecondary} />
                            </View>
                          )}
                        </TouchableOpacity>
                      </LinearGradient>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  </View>
        </View>
      </Modal>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>バインダーを編集</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="バインダー名"
              placeholderTextColor={theme.colors.textTertiary}
            />
            <Text style={styles.editSummary}>
              カード数: {selectedAlbum?.cardIds.length ?? 0}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteAlbum}
              >
                <Text style={styles.deleteButtonText}>削除</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setEditModalVisible(false);
                  setSelectedAlbum(null);
                }}
              >
                <Text style={styles.modalButtonText}>閉じる</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimary]}
                onPress={handleSaveEdit}
                disabled={updating}
              >
                <Text style={styles.modalPrimaryText}>
                  {updating ? '保存中...' : '保存'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    actions: {
      padding: theme.spacing.md,
      paddingBottom: 0,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
    },
    createButtonText: {
      color: theme.colors.secondary,
      fontWeight: theme.fontWeight.bold,
      marginLeft: theme.spacing.sm,
    },
    list: {
      padding: theme.spacing.md,
    },
    emptyList: {
      flexGrow: 1,
      padding: theme.spacing.lg,
      justifyContent: 'center',
    },
    row: {
      justifyContent: 'space-between',
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    modalContent: {
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    modalTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    modalInput: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.md,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: theme.spacing.lg,
      flexWrap: 'wrap',
    },
    modalButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      marginLeft: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    modalButtonText: {
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeight.medium,
    },
    modalPrimary: {
      backgroundColor: theme.colors.accent,
    },
    modalPrimaryText: {
      color: theme.colors.secondary,
      fontWeight: theme.fontWeight.bold,
    },
    editSummary: {
      marginTop: theme.spacing.sm,
      color: theme.colors.textSecondary,
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
    },
    deleteButtonText: {
      color: theme.colors.secondary,
      fontWeight: theme.fontWeight.semibold,
    },
    viewerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
    },
    viewerSheet: {
      maxHeight: '90%',
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.secondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 5 },
      shadowRadius: 18,
      elevation: 12,
      padding: theme.spacing.lg,
      alignSelf: 'center',
      width: '95%',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    viewerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    viewerHeaderButton: {
      padding: theme.spacing.sm,
    },
    viewerTitleWrapper: {
      flex: 1,
      alignItems: 'center',
    },
    viewerTitle: {
      fontSize: theme.fontSize.lg,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.semibold,
    },
    viewerSubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    viewerCenter: {
      padding: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewerEmptyText: {
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
    },
    viewerPage: {
      width: '100%',
      flex: 1,
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewerDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    viewerActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    actionChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.xs,
    },
    actionChipActive: {
      borderColor: theme.colors.accent,
    },
    actionChipText: {
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.medium,
      fontSize: theme.fontSize.sm,
    },
    moveHint: {
      textAlign: 'center',
      color: theme.colors.accent,
      marginBottom: theme.spacing.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    viewerPager: {
      flexGrow: 0,
    },
    viewerPageContent: {
      flex: 1,
      paddingBottom: theme.spacing.sm,
      justifyContent: 'center',
      gap: theme.spacing.md,
      alignItems: 'center',
    },
    viewerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    viewerCard: {
      aspectRatio: 3 / 4,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      backgroundColor: theme.isDark ? theme.colors.cardBackground : '#fff',
      position: 'relative',
      borderWidth: 0,
    },
    viewerCardGradient: {
      padding: 3,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm / 2,
    },
    viewerCardActive: {
      borderColor: theme.colors.accent,
      borderWidth: 2,
    },
    viewerCardImage: {
      width: '100%',
      height: '100%',
    },
    viewerCardPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewerCardPlaceholderEmpty: {
      backgroundColor: theme.colors.secondary,
      borderStyle: 'dashed',
    },
  });
