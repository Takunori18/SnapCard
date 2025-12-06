// src/screens/CardEditor/CardEditorScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '../../theme';
import { useEditorStore } from '../../store/editorStore';
import { SkiaCanvas } from '../../components/editors/SkiaCanvas';
import { CardSidebar } from './components/CardSidebar';
import { CardPropertyPanel } from './components/CardPropertyPanel';
import { CardLayerPanel } from './components/CardLayerPanel';
import { CardToolbar } from './components/CardToolbar';
import { exportToImage, uploadToSupabase, generateThumbnail } from '../../utils/exportUtils';
import { useSnapCardContext } from '../../contexts/SnapCardContext';
import { useAuth } from '../../contexts/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ViewMode = 'edit' | 'layers' | 'export';

export const CardEditorScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { user, profile } = useAuth();
  const { addCard } = useSnapCardContext();

  const {
    setMode,
    setCanvas,
    canvas,
    elements,
    selection,
    getSnapshot,
    undo,
    redo,
    undoStack,
    redoStack,
    setZoom,
    reset,
  } = useEditorStore();

  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [saving, setSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // 初期化
  useEffect(() => {
    setMode('card');
    setCanvas({
      width: 1200,
      height: 1200,
      backgroundColor: '#FFFFFF',
      zoom: Math.min(SCREEN_WIDTH / 1200, (SCREEN_HEIGHT - 200) / 1200),
      pan: { x: 0, y: 0 },
    });

    return () => {
      reset();
    };
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(Math.min(canvas.zoom + 0.1, 3));
  }, [canvas.zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(Math.max(canvas.zoom - 0.1, 0.1));
  }, [canvas.zoom, setZoom]);

  const handleZoomReset = useCallback(() => {
    const fitZoom = Math.min(SCREEN_WIDTH / 1200, (SCREEN_HEIGHT - 200) / 1200);
    setZoom(fitZoom);
  }, [setZoom]);

  const handleSave = useCallback(async () => {
    if (!user || !profile?.id) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    try {
      setSaving(true);

      const snapshot = getSnapshot();
      
      // 高解像度画像
      const localUri = await exportToImage(snapshot, 'jpg', {
        quality: 0.95,
        scale: 2,
      });

      // サムネイル
      const thumbnailUri = await generateThumbnail(snapshot, 400);

      // Supabaseにアップロード
      const publicUrl = await uploadToSupabase(
        localUri,
        profile.id,
        `card_${Date.now()}.jpg`
      );

      const thumbnailUrl = await uploadToSupabase(
        thumbnailUri,
        profile.id,
        `card_thumb_${Date.now()}.jpg`
      );

      // カードとして保存
      await addCard({
        imageUri: publicUrl,
        userId: profile.id,
        title: '新しいカード',
        isPublic: true,
        mediaType: 'image',
      });

      Alert.alert('✅ 保存完了', 'カードを保存しました', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('MainTabs' as never),
        },
      ]);
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', 'カードの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }, [user, profile, getSnapshot, addCard, navigation]);

  const canvasSize = useMemo(() => {
    const maxSize = Math.min(SCREEN_WIDTH - 40, SCREEN_HEIGHT - 300);
    return {
      width: maxSize,
      height: maxSize,
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>カードエディター</Text>
        </View>

        <View style={styles.headerCenter}>
          <TouchableOpacity
            onPress={undo}
            disabled={!canUndo}
            style={[styles.iconButton, !canUndo && styles.iconButtonDisabled]}
          >
            <Ionicons
              name="arrow-undo"
              size={20}
              color={canUndo ? theme.colors.textPrimary : theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={redo}
            disabled={!canRedo}
            style={[styles.iconButton, !canRedo && styles.iconButtonDisabled]}
          >
            <Ionicons
              name="arrow-redo"
              size={20}
              color={canRedo ? theme.colors.textPrimary : theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity onPress={handleZoomOut} style={styles.iconButton}>
            <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleZoomReset} style={styles.zoomDisplay}>
            <Text style={styles.zoomText}>{Math.round(canvas.zoom * 100)}%</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleZoomIn} style={styles.iconButton}>
            <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'layers' ? 'edit' : 'layers')}
            style={[styles.iconButton, viewMode === 'layers' && styles.iconButtonActive]}
          >
            <Ionicons name="layers-outline" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* メインコンテンツ */}
      <View style={styles.mainContent}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ツールバー */}
          <CardToolbar />

          {/* キャンバス */}
          <View style={styles.canvasWrapper}>
            <SkiaCanvas
              width={canvasSize.width}
              height={canvasSize.height}
              onElementSelect={(id) => console.log('Selected:', id)}
            />
          </View>

          {/* サイドバー（モバイル用は下部に配置） */}
          <CardSidebar />
        </ScrollView>
      </View>

      {/* レイヤーパネル（モーダル） */}
      {viewMode === 'layers' && (
        <View style={styles.layerPanelOverlay}>
          <CardLayerPanel onClose={() => setViewMode('edit')} />
        </View>
      )}

      {/* プロパティパネル（選択時のみ） */}
      {selection.selectedIds.length > 0 && viewMode === 'edit' && (
        <View style={styles.propertyPanelOverlay}>
          <CardPropertyPanel />
        </View>
      )}
    </SafeAreaView>
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    },
    headerCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      flex: 1,
      justifyContent: 'flex-end',
    },
    headerButton: {
      padding: theme.spacing.sm,
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardBackground,
    },
    iconButtonActive: {
      backgroundColor: theme.colors.accent + '22',
    },
    iconButtonDisabled: {
      opacity: 0.3,
    },
    divider: {
      width: 1,
      height: 20,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.xs,
    },
    zoomDisplay: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.cardBackground,
      minWidth: 60,
      alignItems: 'center',
    },
    zoomText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
    saveButton: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.accent,
    },
    saveButtonText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.secondary,
    },
    mainContent: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    canvasWrapper: {
      marginVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    layerPanelOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '80%',
      maxWidth: 320,
      backgroundColor: theme.colors.secondary,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    propertyPanelOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '50%',
      backgroundColor: theme.colors.secondary,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
  });
