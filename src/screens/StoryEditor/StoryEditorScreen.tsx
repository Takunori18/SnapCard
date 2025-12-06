// src/screens/StoryEditor/StoryEditorScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, Theme } from '../../theme';
import { useEditorStore } from '../../store/editorStore';
import { SkiaCanvas } from '../../components/editors/SkiaCanvas';
import { StoryToolbar } from './components/StoryToolbar';
import { TextToolPanel } from './components/TextToolPanel';
import { DrawingToolPanel } from './components/DrawingToolPanel';
import { StickerToolPanel } from './components/StickerToolPanel';
import { BackgroundToolPanel } from './components/BackgroundToolPanel';
import { exportToImage, uploadToSupabase } from '../../utils/exportUtils';
import { useSnapCardContext } from '../../contexts/SnapCardContext';
import { useAuth } from '../../contexts/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type StoryEditorRouteProp = RouteProp<
  { StoryEditor: { imageUri?: string; mode?: 'story' | 'card' } },
  'StoryEditor'
>;

type ActiveTool = 'text' | 'drawing' | 'sticker' | 'background' | null;

export const StoryEditorScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<StoryEditorRouteProp>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { user, profile } = useAuth();
  const { addStory } = useSnapCardContext();

  const {
    setMode,
    setCanvas,
    canvas,
    elements,
    getSnapshot,
    undo,
    redo,
    undoStack,
    redoStack,
    reset,
  } = useEditorStore();

  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [saving, setSaving] = useState(false);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // 初期化
  useEffect(() => {
    setMode('story');
    setCanvas({
      width: 1080,
      height: 1920,
      backgroundColor: '#FFFFFF',
      backgroundImage: route.params?.imageUri,
      zoom: SCREEN_WIDTH / 1080,
      pan: { x: 0, y: 0 },
    });

    return () => {
      // クリーンアップ
      reset();
    };
  }, []);

  const handleToolSelect = useCallback((tool: ActiveTool) => {
    setActiveTool(activeTool === tool ? null : tool);
  }, [activeTool]);

  const handleSave = useCallback(async () => {
    if (!user || !profile?.id) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    try {
      setSaving(true);

      // 高解像度でエクスポート
      const snapshot = getSnapshot();
      const localUri = await exportToImage(snapshot, 'jpg', {
        quality: 0.95,
        scale: 1,
      });

      // Supabaseにアップロード
      const publicUrl = await uploadToSupabase(
        localUri,
        profile.id,
        `story_${Date.now()}.jpg`
      );

      // ストーリーとして保存
      await addStory({
        imageUri: publicUrl,
        userId: profile.id,
        mediaType: 'image',
      });

      Alert.alert('✅ 保存完了', 'ストーリーを公開しました', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', 'ストーリーの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }, [user, profile, getSnapshot, addStory, navigation]);

  const canvasScale = useMemo(() => {
    return SCREEN_WIDTH / 1080;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={28} color={theme.colors.secondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <TouchableOpacity
            onPress={undo}
            disabled={!canUndo}
            style={[styles.headerButton, !canUndo && styles.headerButtonDisabled]}
          >
            <Ionicons
              name="arrow-undo"
              size={24}
              color={canUndo ? theme.colors.secondary : 'rgba(255,255,255,0.3)'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={redo}
            disabled={!canRedo}
            style={[styles.headerButton, !canRedo && styles.headerButtonDisabled]}
          >
            <Ionicons
              name="arrow-redo"
              size={24}
              color={canRedo ? theme.colors.secondary : 'rgba(255,255,255,0.3)'}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveButton}
        >
          <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存'}</Text>
        </TouchableOpacity>
      </View>

      {/* キャンバスエリア */}
      <View style={styles.canvasContainer}>
        <View
          style={[
            styles.canvas,
            {
              width: SCREEN_WIDTH,
              height: SCREEN_WIDTH * (1920 / 1080),
            },
          ]}
        >
          <SkiaCanvas
            width={SCREEN_WIDTH}
            height={SCREEN_WIDTH * (1920 / 1080)}
            onElementSelect={(id) => console.log('Selected:', id)}
          />
        </View>
      </View>

      {/* ツールバー */}
      <View style={styles.toolbarContainer}>
        <StoryToolbar activeTool={activeTool} onToolSelect={handleToolSelect} />
      </View>

      {/* ツールパネル */}
      <TextToolPanel
        visible={activeTool === 'text'}
        onClose={() => setActiveTool(null)}
      />
      <DrawingToolPanel
        visible={activeTool === 'drawing'}
        onClose={() => setActiveTool(null)}
      />
      <StickerToolPanel
        visible={activeTool === 'sticker'}
        onClose={() => setActiveTool(null)}
      />
      <BackgroundToolPanel
        visible={activeTool === 'background'}
        onClose={() => setActiveTool(null)}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    headerCenter: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    headerButton: {
      padding: theme.spacing.sm,
    },
    headerButtonDisabled: {
      opacity: 0.3,
    },
    saveButton: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.accent,
    },
    saveButtonText: {
      color: theme.colors.secondary,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
    },
    canvasContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000000',
    },
    canvas: {
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
    },
    toolbarContainer: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingVertical: theme.spacing.sm,
    },
  });
