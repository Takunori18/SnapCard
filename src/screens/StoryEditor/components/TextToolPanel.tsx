// src/screens/StoryEditor/components/TextToolPanel.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../../../components/editors/BottomSheet';
import { useTheme, Theme } from '../../../theme';
import { useEditorStore } from '../../../store/editorStore';

type TextToolPanelProps = {
  visible: boolean;
  onClose: () => void;
};

const FONTS = [
  { label: 'Classic', value: 'System', preview: 'Aa' },
  { label: 'Modern', value: 'SpaceGrotesk-Regular', preview: 'Aa' },
  { label: 'Script', value: 'GreatVibes-Regular', preview: 'Aa' },
  { label: 'Elegant', value: 'Pacifico-Regular', preview: 'Aa' },
  { label: 'Bold', value: 'System-Bold', preview: 'Aa' },
];

const COLORS = [
  '#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#00C7BE', '#007AFF', '#5856D6', '#FF2D55',
];

const BACKGROUND_COLORS = [
  'transparent', '#000000', '#FFFFFF', 'rgba(0,0,0,0.5)',
  'rgba(255,255,255,0.5)', 'rgba(255,59,48,0.5)',
];

export const TextToolPanel: React.FC<TextToolPanelProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { canvas, addElement, updateElement, selection, elements } = useEditorStore();

  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(64);
  const [fontFamily, setFontFamily] = useState('System');
  const [color, setColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState<string>('transparent');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [lineHeight, setLineHeight] = useState(1.2);
  const [letterSpacing, setLetterSpacing] = useState(0);

  const selectedElement = useMemo(() => {
    if (selection.selectedIds.length === 1) {
      const element = elements.find((el) => el.id === selection.selectedIds[0]);
      if (element?.type === 'text') return element;
    }
    return null;
  }, [selection.selectedIds, elements]);

  const handleAddText = () => {
    if (!text.trim()) return;

    const id = addElement({
      type: 'text',
      text: text.trim(),
      fontSize,
      fontFamily,
      color,
      fontWeight,
      fontStyle,
      textAlign,
      lineHeight,
      letterSpacing,
      backgroundColor: backgroundColor === 'transparent' ? undefined : backgroundColor,
      transform: {
        x: canvas.width / 2,
        y: canvas.height / 2,
        scale: 1,
        rotation: 0,
      },
      opacity: 1,
      name: 'テキスト',
    });

    setText('');
    onClose();
  };

  const handleUpdateText = () => {
    if (!selectedElement) return;

    updateElement(selectedElement.id, {
      text: text || selectedElement.text,
      fontSize,
      fontFamily,
      color,
      fontWeight,
      fontStyle,
      textAlign,
      lineHeight,
      letterSpacing,
      backgroundColor: backgroundColor === 'transparent' ? undefined : backgroundColor,
    });
  };

  // 選択されたテキストの値を反映
  React.useEffect(() => {
    if (selectedElement) {
      setText(selectedElement.text);
      setFontSize(selectedElement.fontSize);
      setFontFamily(selectedElement.fontFamily);
      setColor(selectedElement.color);
      setBackgroundColor(selectedElement.backgroundColor || 'transparent');
      setFontWeight(selectedElement.fontWeight);
      setFontStyle(selectedElement.fontStyle);
      setTextAlign(selectedElement.textAlign);
      setLineHeight(selectedElement.lineHeight);
      setLetterSpacing(selectedElement.letterSpacing);
    }
  }, [selectedElement]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="テキスト" height={600}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* テキスト入力 */}
          <View style={styles.section}>
            <Text style={styles.label}>テキスト内容</Text>
            <TextInput
              style={styles.input}
              placeholder="テキストを入力..."
              placeholderTextColor={theme.colors.textTertiary}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={200}
            />
            <Text style={styles.charCount}>{text.length}/200</Text>
          </View>

          {/* フォント選択 */}
          <View style={styles.section}>
            <Text style={styles.label}>フォント</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.fontRow}>
                {FONTS.map((font) => (
                  <TouchableOpacity
                    key={font.value}
                    style={[
                      styles.fontButton,
                      fontFamily === font.value && styles.fontButtonActive,
                    ]}
                    onPress={() => setFontFamily(font.value)}
                  >
                    <Text style={styles.fontPreview}>{font.preview}</Text>
                    <Text style={styles.fontLabel}>{font.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* フォントサイズ */}
          <View style={styles.section}>
            <View style={styles.sliderHeader}>
              <Text style={styles.label}>サイズ</Text>
              <Text style={styles.sliderValue}>{Math.round(fontSize)}</Text>
            </View>
            <Slider
              minimumValue={24}
              maximumValue={140}
              value={fontSize}
              step={1}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              onValueChange={setFontSize}
              onSlidingComplete={selectedElement ? handleUpdateText : undefined}
            />
          </View>

          {/* テキストスタイル */}
          <View style={styles.section}>
            <Text style={styles.label}>スタイル</Text>
            <View style={styles.styleRow}>
              <TouchableOpacity
                style={[styles.styleButton, fontWeight === 'bold' && styles.styleButtonActive]}
                onPress={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
              >
                <Ionicons
                  name="text"
                  size={20}
                  color={fontWeight === 'bold' ? theme.colors.accent : theme.colors.textPrimary}
                />
                <Text style={styles.styleButtonLabel}>太字</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleButton, fontStyle === 'italic' && styles.styleButtonActive]}
                onPress={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
              >
                <Ionicons
                  name="text"
                  size={20}
                  color={fontStyle === 'italic' ? theme.colors.accent : theme.colors.textPrimary}
                />
                <Text style={styles.styleButtonLabel}>斜体</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleButton, textAlign === 'left' && styles.styleButtonActive]}
                onPress={() => setTextAlign('left')}
              >
                <Ionicons
                  name="align-left"
                  size={20}
                  color={textAlign === 'left' ? theme.colors.accent : theme.colors.textPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleButton, textAlign === 'center' && styles.styleButtonActive]}
                onPress={() => setTextAlign('center')}
              >
                <Ionicons
                  name="align-center"
                  size={20}
                  color={textAlign === 'center' ? theme.colors.accent : theme.colors.textPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleButton, textAlign === 'right' && styles.styleButtonActive]}
                onPress={() => setTextAlign('right')}
              >
                <Ionicons
                  name="align-right"
                  size={20}
                  color={textAlign === 'right' ? theme.colors.accent : theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* 色選択 */}
          <View style={styles.section}>
            <Text style={styles.label}>テキストカラー</Text>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorButton,
                    { backgroundColor: c },
                    color === c && styles.colorButtonActive,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
          </View>

          {/* 背景色 */}
          <View style={styles.section}>
            <Text style={styles.label}>背景カラー</Text>
            <View style={styles.colorRow}>
              <TouchableOpacity
                style={[
                  styles.colorButton,
                  styles.colorButtonTransparent,
                  backgroundColor === 'transparent' && styles.colorButtonActive,
                ]}
                onPress={() => setBackgroundColor('transparent')}
              >
                <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {BACKGROUND_COLORS.slice(1).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorButton,
                    { backgroundColor: c },
                    backgroundColor === c && styles.colorButtonActive,
                  ]}
                  onPress={() => setBackgroundColor(c)}
                />
              ))}
            </View>
          </View>

          {/* 行間 */}
          <View style={styles.section}>
            <View style={styles.sliderHeader}>
              <Text style={styles.label}>行間</Text>
              <Text style={styles.sliderValue}>{lineHeight.toFixed(1)}</Text>
            </View>
            <Slider
              minimumValue={0.8}
              maximumValue={2}
              value={lineHeight}
              step={0.1}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              onValueChange={setLineHeight}
              onSlidingComplete={selectedElement ? handleUpdateText : undefined}
            />
          </View>

          {/* 文字間隔 */}
          <View style={styles.section}>
            <View style={styles.sliderHeader}>
              <Text style={styles.label}>文字間隔</Text>
              <Text style={styles.sliderValue}>{letterSpacing.toFixed(1)}</Text>
            </View>
            <Slider
              minimumValue={-2}
              maximumValue={10}
              value={letterSpacing}
              step={0.5}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              onValueChange={setLetterSpacing}
              onSlidingComplete={selectedElement ? handleUpdateText : undefined}
            />
          </View>

          {/* アクションボタン */}
          <View style={styles.actions}>
            {selectedElement ? (
              <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateText}>
                <Text style={styles.primaryButtonText}>テキストを更新</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, !text.trim() && styles.primaryButtonDisabled]}
                onPress={handleAddText}
                disabled={!text.trim()}
              >
                <Text style={styles.primaryButtonText}>テキストを追加</Text>
              </TouchableOpacity>
            )}
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
    input: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    charCount: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
      textAlign: 'right',
    },
    fontRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    fontButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 70,
      height: 70,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    fontButtonActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent + '11',
    },
    fontPreview: {
      fontSize: 24,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    fontLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
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
    styleRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    styleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    styleButtonActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent + '11',
    },
    styleButtonLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textPrimary,
    },
    colorRow: {
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
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorButtonActive: {
      borderColor: theme.colors.textPrimary,
      transform: [{ scale: 1.1 }],
    },
    colorButtonTransparent: {
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    actions: {
      paddingTop: theme.spacing.md,
    },
    primaryButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: theme.colors.secondary,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
    },
  });
