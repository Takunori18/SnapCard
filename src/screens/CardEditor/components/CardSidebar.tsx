// src/screens/CardEditor/components/CardSidebar.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, Theme } from '../../../theme';
import { useEditorStore } from '../../../store/editorStore';

type Tab = 'text' | 'shape' | 'image' | 'background';

const TABS: Array<{ id: Tab; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { id: 'text', icon: 'text', label: 'テキスト' },
  { id: 'shape', icon: 'shapes', label: '図形' },
  { id: 'image', icon: 'image', label: '画像' },
  { id: 'background', icon: 'color-palette', label: '背景' },
];

const TEXT_PRESETS = [
  { label: '大見出し', fontSize: 72, fontWeight: 'bold' as const },
  { label: '中見出し', fontSize: 48, fontWeight: 'bold' as const },
  { label: '小見出し', fontSize: 32, fontWeight: 'bold' as const },
  { label: '本文', fontSize: 24, fontWeight: 'normal' as const },
];

const SHAPES = [
  { type: 'rect' as const, label: '四角形' },
  { type: 'roundRect' as const, label: '角丸四角' },
  { type: 'circle' as const, label: '円' },
  { type: 'ellipse' as const, label: '楕円' },
  { type: 'triangle' as const, label: '三角形' },
  { type: 'star' as const, label: '星' },
];

const BG_COLORS = [
  '#FFFFFF', '#F3F4F6', '#E5E7EB', '#1F2937', '#111827',
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
];

export const CardSidebar: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { canvas, addElement, setCanvas } = useEditorStore();
  const [activeTab, setActiveTab] = useState<Tab>('text');

  const handleAddText = (preset: typeof TEXT_PRESETS[0]) => {
    addElement({
      type: 'text',
      text: preset.label,
      fontSize: preset.fontSize,
      fontFamily: 'System',
      color: '#000000',
      fontWeight: preset.fontWeight,
      fontStyle: 'normal',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0,
      transform: {
        x: canvas.width / 2 - 100,
        y: canvas.height / 2 - preset.fontSize / 2,
        scale: 1,
        rotation: 0,
      },
      opacity: 1,
      name: preset.label,
    });
  };

  const handleAddShape = (shapeType: typeof SHAPES[0]['type']) => {
    addElement({
      type: 'shape',
      shapeType,
      width: 200,
      height: 200,
      fillColor: '#3B82F6',
      strokeColor: '#1E40AF',
      strokeWidth: 2,
      cornerRadius: shapeType === 'roundRect' ? 20 : undefined,
      points: shapeType === 'star' ? 5 : undefined,
      transform: {
        x: canvas.width / 2 - 100,
        y: canvas.height / 2 - 100,
        scale: 1,
        rotation: 0,
      },
      opacity: 1,
      name: `図形 ${shapeType}`,
    });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', 'フォトライブラリへのアクセスを許可してください。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      addElement({
        type: 'image',
        uri: result.assets[0].uri,
        width: 400,
        height: 400,
        mask: null,
        flipX: false,
        flipY: false,
        transform: {
          x: canvas.width / 2 - 200,
          y: canvas.height / 2 - 200,
          scale: 1,
          rotation: 0,
        },
        opacity: 1,
        name: '画像',
      });
    }
  };

  return (
    <View style={styles.sidebar}>
      {/* タブ */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={activeTab === tab.id ? theme.colors.accent : theme.colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* コンテンツ */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'text' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>テキストを追加</Text>
            {TEXT_PRESETS.map((preset, index) => (
              <TouchableOpacity
                key={index}
                style={styles.presetButton}
                onPress={() => handleAddText(preset)}
              >
                <Ionicons name="text" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.presetLabel}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'shape' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>図形を追加</Text>
            <View style={styles.shapeGrid}>
              {SHAPES.map((shape, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.shapeButton}
                  onPress={() => handleAddShape(shape.type)}
                >
                  <Ionicons name="square" size={40} color={theme.colors.accent} />
                  <Text style={styles.shapeLabel}>{shape.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'image' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>画像を追加</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
              <Ionicons name="cloud-upload-outline" size={32} color={theme.colors.accent} />
              <Text style={styles.uploadLabel}>アップロード</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'background' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>背景色</Text>
            <View style={styles.colorGrid}>
              {BG_COLORS.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.colorSwatch, { backgroundColor: color }]}
                  onPress={() => setCanvas({ backgroundColor: color })}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sidebar: {
      width: 280,
      backgroundColor: theme.colors.secondary,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
    },
    tabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tab: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.accent,
    },
    tabLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    tabLabelActive: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.bold,
    },
    content: {
      flex: 1,
      padding: theme.spacing.md,
    },
    section: {
      gap: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    presetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
    },
    presetLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textPrimary,
    },
    shapeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    shapeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '30%',
      aspectRatio: 1,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
      gap: theme.spacing.xs,
    },
    shapeLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    uploadButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl * 2,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 2,
      borderColor: theme.colors.accent,
      borderStyle: 'dashed',
      gap: theme.spacing.sm,
    },
    uploadLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.semibold,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    colorSwatch: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });
