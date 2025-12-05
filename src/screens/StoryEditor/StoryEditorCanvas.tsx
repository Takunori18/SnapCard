import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import CardyImage from '../../components/common/CardyImage';

const StoryEditorCanvas: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [text, setText] = useState('');
  const [selectedColor, setSelectedColor] = useState(theme.colors.secondary);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  const sampleImage = 'https://picsum.photos/400/700';

  const colors = [
    theme.colors.secondary,
    theme.colors.accent,
    theme.colors.primary,
    '#FF6B6B',
    '#4ECDC4',
    '#FFE66D',
    '#95E1D3',
  ];

  const handleSave = () => {
    Alert.alert('保存完了', 'ストーリーが作成されました', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ストーリー編集</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Ionicons name="checkmark" size={28} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* プレビュー */}
        <View style={styles.previewContainer}>
          <CardyImage
            source={{ uri: sampleImage }}
            style={styles.previewImage}
            contentFit="cover"
            alt="ストーリープレビュー"
          />

          {/* テキストオーバーレイ */}
          {text && (
            <View style={styles.textOverlay}>
              <Text
                style={[
                  styles.overlayText,
                  {
                    color: selectedColor,
                    fontSize:
                      fontSize === 'small'
                        ? theme.fontSize.lg
                        : fontSize === 'medium'
                        ? theme.fontSize.xl
                        : 32,
                  },
                ]}
              >
                {text}
              </Text>
            </View>
          )}
        </View>

        {/* 編集ツール */}
        <View style={styles.tools}>
          {/* テキスト入力 */}
          <View style={styles.toolSection}>
            <Text style={styles.toolLabel}>テキスト</Text>
            <TextInput
              style={styles.textInput}
              placeholder="テキストを入力..."
              placeholderTextColor={theme.colors.textTertiary}
              value={text}
              onChangeText={setText}
              maxLength={100}
            />
          </View>

          {/* 文字サイズ */}
          <View style={styles.toolSection}>
            <Text style={styles.toolLabel}>文字サイズ</Text>
            <View style={styles.sizeButtons}>
              {(['small', 'medium', 'large'] as const).map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.sizeButton, fontSize === size && styles.sizeButtonActive]}
                  onPress={() => setFontSize(size)}
                >
                  <Text
                    style={[
                      styles.sizeButtonText,
                      fontSize === size && styles.sizeButtonTextActive,
                    ]}
                  >
                    {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* カラーピッカー */}
          <View style={styles.toolSection}>
            <Text style={styles.toolLabel}>文字色</Text>
            <View style={styles.colorPicker}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorButtonActive,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
          </View>

          {/* 情報 */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.infoText}>
              ストーリーは24時間後に自動的に削除されます
            </Text>
          </View>
        </View>
      </View>
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
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.secondary,
    },
    headerButton: {
      minWidth: 60,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    content: {
      flex: 1,
    },
    previewContainer: {
      height: '50%',
      position: 'relative',
      backgroundColor: '#000',
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    textOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    overlayText: {
      fontWeight: theme.fontWeight.bold,
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: -1, height: 1 },
      textShadowRadius: 10,
    },
    tools: {
      flex: 1,
      padding: theme.spacing.md,
      gap: theme.spacing.lg,
    },
    toolSection: {
      gap: theme.spacing.sm,
    },
    toolLabel: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    textInput: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.cardBackground,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      minHeight: 44,
    },
    sizeButtons: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    sizeButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.cardBackground,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    sizeButtonActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent + '20',
    },
    sizeButtonText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textSecondary,
    },
    sizeButtonTextActive: {
      color: theme.colors.accent,
    },
    colorPicker: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    colorButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    colorButtonActive: {
      borderColor: theme.colors.textPrimary,
      transform: [{ scale: 1.2 }],
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.accent + '20',
      borderRadius: theme.borderRadius.md,
    },
    infoText: {
      flex: 1,
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
    },
  });

export default StoryEditorCanvas;