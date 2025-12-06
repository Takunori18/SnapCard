// src/screens/StoryEditor/components/DrawingToolPanel.tsx
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../../../components/editors/BottomSheet';
import { useTheme, Theme } from '../../../theme';
import { useEditorStore } from '../../../store/editorStore';

type DrawingToolPanelProps = {
  visible: boolean;
  onClose: () => void;
};

type BrushType = 'pen' | 'marker' | 'highlighter';

const BRUSHES: Array<{ type: BrushType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { type: 'pen', label: 'ペン', icon: 'create-outline' },
  { type: 'marker', label: 'マーカー', icon: 'brush-outline' },
  { type: 'highlighter', label: '蛍光ペン', icon: 'color-fill-outline' },
];

const COLORS = [
  '#000000', '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#00C7BE', '#007AFF', '#5856D6', '#FF2D55',
  '#8E8E93', '#FFC0CB', '#FFD700', '#98FB98', '#87CEEB',
];

const STROKE_WIDTHS = [2, 4, 8, 12, 16, 20];

export const DrawingToolPanel: React.FC<DrawingToolPanelProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { startDrawing, updateDrawing, finishDrawing, isDrawing } = useEditorStore();

  const [brushType, setBrushType] = useState<BrushType>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(8);
  const [opacity, setOpacity] = useState(1);

  const handleStartDrawing = useCallback(() => {
    startDrawing({
      points: [],
      color,
      strokeWidth,
      brushType,
    });
    onClose();
  }, [color, strokeWidth, brushType, startDrawing, onClose]);

  const handleClearAll = useCallback(() => {
    // TODO: 全描画要素を削除
    console.log('Clear all drawings');
  }, []);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="描画ツール" height={500}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* ブラシタイプ */}
          <View style={styles.section}>
            <Text style={styles.label}>ブラシタイプ</Text>
            <View style={styles.brushRow}>
              {BRUSHES.map((brush) => (
                <TouchableOpacity
                  key={brush.type}
                  style={[
                    styles.brushButton,
                    brushType === brush.type && styles.brushButtonActive,
                  ]}
                  onPress={() => setBrushType(brush.type)}
                >
                  <Ionicons
                    name={brush.icon}
                    size={28}
                    color={brushType === brush.type ? theme.colors.accent : theme.colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.brushLabel,
                      brushType === brush.type && styles.brushLabelActive,
                    ]}
                  >
                    {brush.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 色選択 */}
          <View style={styles.section}>
            <Text style={styles.label}>カラー</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorButton,
                    { backgroundColor: c },
                    color === c && styles.colorButtonActive,
                    c === '#FFFFFF' && styles.colorButtonWhite,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
          </View>

          {/* 太さ */}
          <View style={styles.section}>
            <View style={styles.sliderHeader}>
              <Text style={styles.label}>ブラシの太さ</Text>
              <Text style={styles.sliderValue}>{strokeWidth}px</Text>
            </View>
            <View style={styles.strokePreviewContainer}>
              {STROKE_WIDTHS.map((width) => (
                <TouchableOpacity
                  key={width}
                  style={styles.strokePreviewButton}
                  onPress={() => setStrokeWidth(width)}
                >
                  <View
                    style={[
                      styles.strokePreview,
                      {
                        width: width * 2,
                        height: width * 2,
                        backgroundColor: strokeWidth === width ? theme.colors.accent : color,
                      },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Slider
              minimumValue={1}
              maximumValue={30}
              value={strokeWidth}
              step={1}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              onValueChange={setStrokeWidth}
            />
          </View>

          {/* 不透明度 */}
          <View style={styles.section}>
            <View style={styles.sliderHeader}>
              <Text style={styles.label}>不透明度</Text>
              <Text style={styles.sliderValue}>{Math.round(opacity * 100)}%</Text>
            </View>
            <Slider
              minimumValue={0.1}
              maximumValue={1}
              value={opacity}
              step={0.1}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              onValueChange={setOpacity}
            />
          </View>

          {/* プレビュー */}
          <View style={styles.section}>
            <Text style={styles.label}>プレビュー</Text>
            <View style={styles.previewContainer}>
              <View
                style={[
                  styles.previewStroke,
                  {
                    width: strokeWidth * 4,
                    height: strokeWidth * 4,
                    backgroundColor: color,
                    opacity,
                    borderRadius: brushType === 'pen' ? strokeWidth * 2 : brushType === 'marker' ? strokeWidth : 0,
                  },
                ]}
              />
            </View>
          </View>

          {/* ヒント */}
          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.hintText}>
              描画を開始するには、キャンバスを直接タッチしてドラッグしてください
            </Text>
          </View>

          {/* アクション */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleStartDrawing}>
              <Ionicons name="brush" size={20} color={theme.colors.secondary} />
              <Text style={styles.primaryButtonText}>描画開始</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              <Text style={styles.secondaryButtonText}>すべてクリア</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.lg,
    },
    section: {
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    brushRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    brushButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 2,
      borderColor: 'transparent',
      gap: theme.spacing.xs,
    },
    brushButtonActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent + '11',
    },
    brushLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    brushLabelActive: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.bold,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    colorButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    colorButtonActive: {
      borderColor: theme.colors.textPrimary,
      transform: [{ scale: 1.15 }],
    },
    colorButtonWhite: {
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    sliderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sliderValue: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.accent,
    },
    strokePreviewContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
    },
    strokePreviewButton: {
      padding: theme.spacing.sm,
    },
    strokePreview: {
      borderRadius: 999,
    },
    previewContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
    },
    previewStroke: {
      borderRadius: 999,
    },
    hintBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.accent + '11',
      borderRadius: theme.borderRadius.md,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.accent,
    },
    hintText: {
      flex: 1,
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    actions: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.md,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.md,
    },
    primaryButtonText: {
      color: theme.colors.secondary,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.md,
      borderWidth: 2,
      borderColor: theme.colors.error,
    },
    secondaryButtonText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
  });
