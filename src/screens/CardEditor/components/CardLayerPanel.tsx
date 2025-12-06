// src/screens/CardEditor/components/CardLayerPanel.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme, Theme } from '../../../theme';
import { useEditorStore, EditorElement } from '../../../store/editorStore';

type CardLayerPanelProps = {
  onClose: () => void;
};

type LayerItemData = EditorElement & {
  key: string;
};

export const CardLayerPanel: React.FC<CardLayerPanelProps> = ({ onClose }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    elements,
    groups,
    selection,
    selectElements,
    updateElement,
    removeElements,
    duplicateElements,
    reorderElements,
    createGroup,
    ungroup,
  } = useEditorStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // レイヤーデータを逆順（上が最前面）で準備
  const layerData = useMemo((): LayerItemData[] => {
    return [...elements]
      .reverse()
      .map((el) => ({ ...el, key: el.id }));
  }, [elements]);

  const handleDragEnd = ({ data }: { data: LayerItemData[] }) => {
    // 逆順に戻して再配置
    const newOrder = [...data].reverse().map((item) => item.id);
    reorderElements(newOrder);
  };

  const handleToggleLock = (id: string, currentLock?: boolean) => {
    updateElement(id, { locked: !currentLock });
  };

  const handleToggleVisibility = (id: string, currentVisibility?: boolean) => {
    updateElement(id, { visible: currentVisibility === false ? true : false });
  };

  const handleStartRename = (id: string, currentName?: string) => {
    setEditingId(id);
    setEditingName(currentName || '');
  };

  const handleFinishRename = (id: string) => {
    if (editingName.trim()) {
      updateElement(id, { name: editingName.trim() });
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = (id: string) => {
    Alert.alert('レイヤーを削除', 'このレイヤーを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => removeElements([id]),
      },
    ]);
  };

  const handleDuplicate = (id: string) => {
    duplicateElements([id]);
  };

  const handleSelect = (id: string) => {
    selectElements([id]);
  };

  const getElementIcon = (element: EditorElement): keyof typeof Ionicons.glyphMap => {
    switch (element.type) {
      case 'text':
        return 'text';
      case 'image':
        return 'image';
      case 'shape':
        return 'shapes';
      case 'sticker':
        return 'happy';
      case 'drawing':
        return 'brush';
      default:
        return 'square-outline';
    }
  };

  const getElementLabel = (element: EditorElement): string => {
    if (element.name) return element.name;
    
    switch (element.type) {
      case 'text':
        return element.text?.substring(0, 20) || 'テキスト';
      case 'image':
        return '画像';
      case 'shape':
        return `図形 (${element.shapeType})`;
      case 'sticker':
        return 'スタンプ';
      case 'drawing':
        return '描画';
      default:
        return 'レイヤー';
    }
  };

  const renderLayerItem = ({ item, drag, isActive }: RenderItemParams<LayerItemData>) => {
    const isSelected = selection.selectedIds.includes(item.id);
    const isEditing = editingId === item.id;
    const isVisible = item.visible !== false;
    const isLocked = item.locked || false;

    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[
            styles.layerItem,
            isSelected && styles.layerItemSelected,
            isActive && styles.layerItemDragging,
          ]}
          onPress={() => handleSelect(item.id)}
          onLongPress={drag}
          disabled={isActive}
        >
          {/* ドラッグハンドル */}
          <View style={styles.dragHandle}>
            <Ionicons name="reorder-two" size={20} color={theme.colors.textTertiary} />
          </View>

          {/* アイコン */}
          <View style={styles.layerIcon}>
            <Ionicons
              name={getElementIcon(item)}
              size={20}
              color={isVisible ? theme.colors.textPrimary : theme.colors.textTertiary}
            />
          </View>

          {/* 名前 */}
          <View style={styles.layerName}>
            {isEditing ? (
              <TextInput
                style={styles.nameInput}
                value={editingName}
                onChangeText={setEditingName}
                onBlur={() => handleFinishRename(item.id)}
                onSubmitEditing={() => handleFinishRename(item.id)}
                autoFocus
                selectTextOnFocus
              />
            ) : (
              <Text
                style={[
                  styles.nameText,
                  !isVisible && styles.nameTextHidden,
                ]}
                numberOfLines={1}
              >
                {getElementLabel(item)}
              </Text>
            )}
          </View>

          {/* アクション */}
          <View style={styles.layerActions}>
            <TouchableOpacity
              onPress={() => handleToggleVisibility(item.id, isVisible)}
              style={styles.actionButton}
            >
              <Ionicons
                name={isVisible ? 'eye' : 'eye-off'}
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleToggleLock(item.id, isLocked)}
              style={styles.actionButton}
            >
              <Ionicons
                name={isLocked ? 'lock-closed' : 'lock-open'}
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleStartRename(item.id, item.name)}
              style={styles.actionButton}
            >
              <Ionicons name="pencil" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDuplicate(item.id)}
              style={styles.actionButton}
            >
              <Ionicons name="copy" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.actionButton}
            >
              <Ionicons name="trash" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.panel}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>レイヤー</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ツールバー */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => {
            if (selection.selectedIds.length > 1) {
              createGroup(selection.selectedIds, 'グループ');
            } else {
              Alert.alert('グループ化', '2つ以上のレイヤーを選択してください');
            }
          }}
        >
          <Ionicons name="folder-outline" size={20} color={theme.colors.textPrimary} />
          <Text style={styles.toolButtonText}>グループ化</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => {
            const selectedElement = elements.find((el) => el.id === selection.selectedIds[0]);
            if (selectedElement?.groupId) {
              ungroup(selectedElement.groupId);
            }
          }}
          disabled={!selection.selectedIds[0] || !elements.find((el) => el.id === selection.selectedIds[0])?.groupId}
        >
          <Ionicons name="folder-open-outline" size={20} color={theme.colors.textPrimary} />
          <Text style={styles.toolButtonText}>グループ解除</Text>
        </TouchableOpacity>
      </View>

      {/* レイヤーリスト */}
      <GestureHandlerRootView style={styles.listContainer}>
        <DraggableFlatList
          data={layerData}
          renderItem={renderLayerItem}
          keyExtractor={(item) => item.key}
          onDragEnd={handleDragEnd}
          activationDistance={10}
          containerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </GestureHandlerRootView>

      {/* フッター情報 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {elements.length} レイヤー {selection.selectedIds.length > 0 && `· ${selection.selectedIds.length} 選択中`}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      width: 320,
      backgroundColor: theme.colors.secondary,
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    toolbar: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    toolButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
    },
    toolButtonText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textPrimary,
    },
    listContainer: {
      flex: 1,
    },
    list: {
      padding: theme.spacing.sm,
    },
    layerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
      gap: theme.spacing.sm,
    },
    layerItemSelected: {
      backgroundColor: theme.colors.accent + '22',
      borderWidth: 2,
      borderColor: theme.colors.accent,
    },
    layerItemDragging: {
      opacity: 0.8,
      transform: [{ scale: 1.05 }],
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    dragHandle: {
      padding: theme.spacing.xs,
    },
    layerIcon: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.background,
    },
    layerName: {
      flex: 1,
    },
    nameText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textPrimary,
    },
    nameTextHidden: {
      color: theme.colors.textTertiary,
      fontStyle: 'italic',
    },
    nameInput: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    layerActions: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    actionButton: {
      padding: theme.spacing.xs,
    },
    footer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    footerText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
