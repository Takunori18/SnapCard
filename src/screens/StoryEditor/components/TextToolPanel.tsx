import React, { useMemo, useState, useEffect } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { BottomSheet } from './BottomSheet';
import { useStoryStore } from '../storyStore';
import { useTheme, Theme } from '../../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const FONT_OPTIONS = [
  { label: 'Script', value: 'GreatVibes-Regular' },
  { label: 'Grotesk', value: 'SpaceGrotesk-Regular' },
  { label: 'Pacifico', value: 'Pacifico-Regular' },
];

const COLOR_HUES = [0, 30, 60, 120, 180, 210, 260, 300];

export const TextToolPanel: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    canvasSize,
    texts,
    selected,
    addText,
    updateText,
    setSelected,
  } = useStoryStore((state) => ({
    canvasSize: state.canvasSize,
    texts: state.texts,
    selected: state.selected,
    addText: state.addText,
    updateText: state.updateText,
    setSelected: state.setSelected,
  }));

  const selectedText = useMemo(
    () => (selected.type === 'text' ? texts.find((item) => item.id === selected.id) ?? null : null),
    [selected.id, selected.type, texts]
  );

  const [hueValue, setHueValue] = useState(0);

  useEffect(() => {
    if (selectedText) {
      const { h } = hexToHsl(selectedText.color);
      setHueValue(Math.round(h));
    }
  }, [selectedText?.color]);

  const handleAddText = () => {
    const newId = `text-${Date.now()}`;
    const newText = {
      id: newId,
      text: 'New caption',
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      fontSize: 64,
      color: '#FFFFFF',
      fontFamily: 'GreatVibes-Regular',
      rotation: 0,
    };
    addText(newText);
    setSelected({ type: 'text', id: newId });
  };

  const handleHueChange = (value: number) => {
    setHueValue(value);
    if (selectedText) {
      const hex = hslToHex(value, 0.8, 0.6);
      updateText(selectedText.id, { color: hex });
    }
  };

  const renderContent = () => {
    if (!selectedText) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>テキストを追加して選択すると編集できます。</Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.field}>
          <Text style={styles.label}>テキスト内容</Text>
          <TextInput
            style={styles.input}
            value={selectedText.text}
            onChangeText={(value) => updateText(selectedText.id, { text: value })}
            placeholder="テキストを入力"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>フォントサイズ {Math.round(selectedText.fontSize)}</Text>
          <Slider
            minimumValue={24}
            maximumValue={140}
            value={selectedText.fontSize}
            step={1}
            minimumTrackTintColor={theme.colors.accent}
            maximumTrackTintColor={theme.colors.border}
            onValueChange={(value) => updateText(selectedText.id, { fontSize: value })}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>カラー（Hue）</Text>
          <Slider
            minimumValue={0}
            maximumValue={360}
            step={1}
            value={hueValue}
            minimumTrackTintColor={theme.colors.accent}
            maximumTrackTintColor={theme.colors.border}
            onValueChange={handleHueChange}
          />
          <View
            style={[
              styles.colorPreview,
              { backgroundColor: selectedText?.color ?? theme.colors.cardBackground },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>クイックカラー</Text>
          <View style={styles.paletteRow}>
            {COLOR_HUES.map((hue) => {
              const color = hslToHex(hue, 0.8, 0.5);
              return (
                <TouchableOpacity
                  key={hue}
                  style={[styles.colorDot, { backgroundColor: color }]}
                  onPress={() => {
                    setHueValue(hue);
                    updateText(selectedText.id, { color });
                  }}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>フォントファミリー</Text>
          <View style={styles.fontRow}>
            {FONT_OPTIONS.map((option) => {
              const isActive = option.value === selectedText.fontFamily;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.fontButton, isActive && styles.fontButtonActive]}
                  onPress={() => updateText(selectedText.id, { fontFamily: option.value })}
                >
                  <Text style={[styles.fontButtonLabel, isActive && styles.fontButtonLabelActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="テキスト" height={420}>
      <TouchableOpacity style={styles.primaryButton} onPress={handleAddText}>
        <Text style={styles.primaryButtonText}>＋ 新しいテキスト</Text>
      </TouchableOpacity>
      {renderContent()}
    </BottomSheet>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    primaryButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#fff',
      fontWeight: theme.fontWeight.bold,
    },
    field: {
      gap: theme.spacing.xs,
    },
    label: {
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeight.semibold,
    },
    input: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      color: theme.colors.textPrimary,
      padding: theme.spacing.sm,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    colorPreview: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
    },
    paletteRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    colorDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    fontRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    fontButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.cardBackground,
    },
    fontButtonActive: {
      backgroundColor: theme.colors.accent + '22',
    },
    fontButtonLabel: {
      color: theme.colors.textSecondary,
    },
    fontButtonLabelActive: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.bold,
    },
    emptyState: {
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.colors.textSecondary,
    },
  });

const hexToHsl = (hex: string) => {
  let r = 0;
  let g = 0;
  let b = 0;
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
};

const hslToHex = (h: number, s: number, l: number) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) {
    r = c;
    g = x;
  } else if (hp >= 1 && hp < 2) {
    r = x;
    g = c;
  } else if (hp >= 2 && hp < 3) {
    g = c;
    b = x;
  } else if (hp >= 3 && hp < 4) {
    g = x;
    b = c;
  } else if (hp >= 4 && hp < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = l - c / 2;
  const toHex = (value: number) => {
    const hex = Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');
    return hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
