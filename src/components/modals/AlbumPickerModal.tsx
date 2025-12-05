import React, { useMemo, useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  Alert 
} from 'react-native';
import { Album } from '../../types/card';
import { useTheme, Theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

interface AlbumPickerModalProps {
  visible: boolean;
  albums: Album[];
  onSelect: (albumId: string) => Promise<void> | void;
  onCreateAlbum: (name: string) => Promise<Album>;
  onClose: () => void;
  pendingAction?: boolean;
}

export const AlbumPickerModal: React.FC<AlbumPickerModalProps> = ({
  visible,
  albums,
  onSelect,
  onCreateAlbum,
  onClose,
  pendingAction = false,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [albumName, setAlbumName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const trimmed = albumName.trim();
    if (!trimmed) {
      Alert.alert('アルバム名を入力してください');
      return;
    }

    try {
      setCreating(true);
      const album = await onCreateAlbum(trimmed);
      setAlbumName('');
      await onSelect(album.id);
    } catch (error) {
      console.error('アルバム作成エラー:', error);
      Alert.alert('エラー', 'アルバムの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>アルバムを選択</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={albums}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={styles.emptyText}>まだアルバムがありません</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.albumItem}
                onPress={() => onSelect(item.id)}
                disabled={pendingAction}
              >
                <View style={styles.albumAvatar}>
                  <Ionicons name="images-outline" size={20} color={theme.colors.textSecondary} />
                </View>
                <View style={styles.albumInfo}>
                  <Text style={styles.albumName}>{item.name}</Text>
                  <Text style={styles.albumCount}>{item.cardIds.length} 枚</Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.list}
          />

          <View style={styles.newAlbumSection}>
            <Text style={styles.sectionTitle}>新しいアルバムを作成</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="アルバム名"
                value={albumName}
                onChangeText={setAlbumName}
                placeholderTextColor={theme.colors.textTertiary}
              />
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreate}
                disabled={creating || pendingAction}
              >
                <Text style={styles.createButtonText}>
                  {creating ? '作成中...' : '作成'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      padding: theme.spacing.md,
    },
    modal: {
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    list: {
      paddingBottom: theme.spacing.md,
    },
    albumItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    albumAvatar: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    albumInfo: {
      flex: 1,
    },
    albumName: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.medium,
    },
    albumCount: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.border,
    },
    emptyText: {
      textAlign: 'center',
      color: theme.colors.textSecondary,
      marginVertical: theme.spacing.md,
    },
    newAlbumSection: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      color: theme.colors.textPrimary,
      marginRight: theme.spacing.sm,
    },
    createButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    createButtonText: {
      color: theme.colors.secondary,
      fontWeight: theme.fontWeight.bold,
    },
  });
