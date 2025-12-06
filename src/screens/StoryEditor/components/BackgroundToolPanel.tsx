// src/screens/StoryEditor/components/BackgroundToolPanel.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheet } from '../../../components/editors/BottomSheet';
import { useTheme, Theme } from '../../../theme';
import { useEditorStore } from '../../../store/editorStore';

type BackgroundToolPanelProps = {
  visible: boolean;
  onClose: () => void;
};

// 背景色プリセット
const BG_COLORS = [
  '#FFFFFF', '#000000', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF',
  '#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#F97316', '#84CC16', '#06B6D4', '#6366F1', '#A855F7',
  '#FCA5A5', '#FCD34D', '#FDE047', '#86EFAC', '#93C5FD', '#C4B5FD',
];

// グラデーションプリセット
const GRADIENTS = [
  { colors: ['#667eea', '#764ba2'], name: 'パープル' },
  { colors: ['#f093fb', '#f5576c'], name: 'ピンク' },
  { colors: ['#4facfe', '#00f2fe'], name: 'ブルー' },
  { colors: ['#43e97b', '#38f9d7'], name: 'グリーン' },
  { colors: ['#fa709a', '#fee140'], name: 'サンセット' },
  { colors: ['#30cfd0', '#330867'], name: 'オーシャン' },
  { colors: ['#a8edea', '#fed6e3'], name: 'パステル' },
  { colors: ['#ff9a56', '#ff6a88'], name: 'オレンジ' },
  { colors: ['#ffecd2', '#fcb69f'], name: 'ピーチ' },
  { colors: ['#ff6e7f', '#bfe9ff'], name: 'スカイ' },
  { colors: ['#e0c3fc', '#8ec5fc'], name: 'ラベンダー' },
  { colors: ['#f8cdda', '#1d2b64'], name: 'トワイライト' },
];

type TabType = 'solid' | 'gradient' | 'image';

export const BackgroundToolPanel: React.FC<BackgroundToolPanelProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { setCanvas } = useEditorStore();
  const [activeTab, setActiveTab] = useState<TabType>('solid');

  const handleColorSelect = (color: string) => {
    setCanvas({ backgroundColor: color, backgroundImage: undefined });
    onClose();
  };

  const handleGradientSelect = (gradient: typeof GRADIENTS[0]) => {
    // グラデーションは実装が複雑なため、単色で代用
    setCanvas({ backgroundColor: gradient.colors[0], backgroundImage: undefined });
    onClose();
  };

  const handleImageSelect = async () => {
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
      setCanvas({ backgroundImage: result.assets[0].uri });
      onClose();
    }
  };

  const handleRemoveBackground = () => {
    setCanvas({ backgroundColor: '#FFFFFF', backgroundImage: undefined });
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="背景" height={500}>
      <View style={styles.content}>
        {/* タブ */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'solid' && styles.tabActive]}
            onPress={() => setActiveTab('solid')}
          >
            <Ionicons
              name="color-palette"
              size={20}
              color={activeTab === 'solid' ? theme.colors.accent : theme.colors.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === 'solid' && styles.tabTextActive]}
            >
              単色
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'gradient' && styles.tabActive]}
            onPress={() => setActiveTab('gradient')}
          >
            <Ionicons
              name="color-filter"
              size={20}
              color={activeTab === 'gradient' ? theme.colors.accent : theme.colors.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === 'gradient' && styles.tabTextActive]}
            >
              グラデーション
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'image' && styles.tabActive]}
            onPress={() => setActiveTab('image')}
          >
            <Ionicons
              name="image"
              size={20}
              color={activeTab === 'image' ? theme.colors.accent : theme.colors.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === 'image' && styles.tabTextActive]}
            >
              画像
            </Text>
          </TouchableOpacity>
        </View>

        {/* コンテンツ */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
          {activeTab === 'solid' && (
            <View style={styles.colorGrid}>
              {BG_COLORS.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    color === '#FFFFFF' && styles.colorSwatchWhite,
                  ]}
                  onPress={() => handleColorSelect(color)}
                />
              ))}
            </View>
          )}

          {activeTab === 'gradient' && (
            <View style={styles.gradientGrid}>
              {GRADIENTS.map((gradient, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.gradientButton}
                  onPress={() => handleGradientSelect(gradient)}
                >
                  <LinearGradient
                    colors={gradient.colors}
                    style={styles.gradientPreview}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Text style={styles.gradientName}>{gradient.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeTab === 'image' && (
            <View style={styles.imageSection}>
              <TouchableOpacity style={styles.uploadButton} onPress={handleImageSelect}>
                <Ionicons name="cloud-upload-outline" size={32} color={theme.colors.accent} />
                <Text style={styles.uploadLabel}>画像をアップロード</Text>
              </TouchableOpacity>

              <Text style={styles.sectionHint}>
                フォトライブラリから画像を選択して背景に設定できます
              </Text>
            </View>
          )}
        </ScrollView>

        {/* 背景をクリア */}
        <TouchableOpacity style={styles.clearButton} onPress={handleRemoveBackground}>
          <Ionicons name="close-circle-outline" size={20} color={theme.colors.error} />
          <Text style={styles.clearButtonText}>背景をクリア</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      flex: 1,
      gap: theme.spacing.md,
    },
    tabs: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
    },
    tabActive: {
      backgroundColor: theme.colors.accent + '22',
    },
    tabText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.bold,
    },
    scrollContent: {
      flex: 1,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    colorSwatch: {
      width: '22%',
      aspectRatio: 1,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorSwatchWhite: {
      borderColor: theme.colors.border,
    },
    gradientGrid: {
      gap: theme.spacing.sm,
    },
    gradientButton: {
      gap: theme.spacing.xs,
    },
    gradientPreview: {
      height: 80,
      borderRadius: theme.borderRadius.md,
    },
    gradientName: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    imageSection: {
      gap: theme.spacing.md,
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
    sectionHint: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      lineHeight: 18,
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 2,
      borderColor: theme.colors.error,
    },
    clearButtonText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.error,
      fontWeight: theme.fontWeight.semibold,
    },
  });
