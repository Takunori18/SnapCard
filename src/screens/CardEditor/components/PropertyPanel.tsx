import React, { ReactNode, useMemo, useRef } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme, Theme } from '../../../theme';
import { useCardStore, TextElement, ShapeElement, ImageElement } from '../cardStore';

const FONT_OPTIONS = [
  { label: 'Grotesk', value: 'SpaceGrotesk-Regular' },
  { label: 'Pacifico', value: 'Pacifico-Regular' },
  { label: 'Script', value: 'GreatVibes-Regular' },
];

const COLOR_SWATCHES = ['#000000', '#1F2937', '#EF4444', '#FACC15', '#10B981', '#0EA5E9', '#6366F1', '#FFFFFF'];

type PanelProps<T> = {
  element: T;
  pushHistory: () => void;
};

export const PropertyPanel: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    selected,
    shapes,
    texts,
    images,
  } = useCardStore((state) => ({
    selected: state.selected,
    shapes: state.shapes,
    texts: state.texts,
    images: state.images,
  }));

  let propertiesContent: ReactNode = null;
  if (selected.type === 'text') {
    const element = texts.find((item) => item.id === selected.id);
    if (element) {
      propertiesContent = <TextProperties element={element} />;
    }
  } else if (selected.type === 'shape') {
    const element = shapes.find((item) => item.id === selected.id);
    if (element) {
      propertiesContent = <ShapeProperties element={element} />;
    }
  } else if (selected.type === 'image') {
    const element = images.find((item) => item.id === selected.id);
    if (element) {
      propertiesContent = <ImageProperties element={element} />;
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>プロパティ</Text>
      {propertiesContent ?? (
        <Text style={styles.empty}>オブジェクトを選択してください。</Text>
      )}
    </View>
  );
};

export const TextProperties: React.FC<PanelProps<TextElement>> = ({ element }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { updateText, pushHistory } = useCardStore((state) => ({
    updateText: state.updateText,
    pushHistory: state.pushHistory,
  }));
  const editingRef = useRef(false);

  const ensureHistory = () => {
    if (!editingRef.current) {
      pushHistory();
      editingRef.current = true;
    }
  };

  const handleBlur = () => {
    editingRef.current = false;
  };

  const toggleBold = () => {
    pushHistory();
    updateText(element.id, { fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' }, { recordHistory: false });
  };

  const toggleItalic = () => {
    pushHistory();
    updateText(
      element.id,
      { fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' },
      { recordHistory: false }
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>テキスト</Text>
      <TextInput
        style={styles.input}
        multiline
        value={element.text}
        onChangeText={(text) => {
          ensureHistory();
          updateText(element.id, { text }, { recordHistory: false });
        }}
        onBlur={handleBlur}
      />

      <Text style={styles.label}>フォントファミリー</Text>
      <View style={styles.row}>
        {FONT_OPTIONS.map((font) => {
          const active = element.fontFamily === font.value;
          return (
            <TouchableOpacity
              key={font.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                pushHistory();
                updateText(element.id, { fontFamily: font.value }, { recordHistory: false });
              }}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{font.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.chip, element.fontWeight === 'bold' && styles.chipActive]} onPress={toggleBold}>
          <Text style={[styles.chipLabel, element.fontWeight === 'bold' && styles.chipLabelActive]}>B</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, element.fontStyle === 'italic' && styles.chipActive]} onPress={toggleItalic}>
          <Text style={[styles.chipLabel, element.fontStyle === 'italic' && styles.chipLabelActive]}>I</Text>
        </TouchableOpacity>
      </View>

      <SliderField
        label={`フォントサイズ ${Math.round(element.fontSize)}`}
        value={element.fontSize}
        minimumValue={12}
        maximumValue={140}
        step={1}
        onSlidingStart={pushHistory}
        onValueChange={(val) => updateText(element.id, { fontSize: val }, { recordHistory: false })}
      />

      <SliderField
        label={`行間 ${element.lineHeight.toFixed(2)}`}
        value={element.lineHeight}
        minimumValue={0.8}
        maximumValue={2}
        step={0.02}
        onSlidingStart={pushHistory}
        onValueChange={(val) => updateText(element.id, { lineHeight: val }, { recordHistory: false })}
      />

      <SliderField
        label={`字間 ${element.letterSpacing.toFixed(1)}`}
        value={element.letterSpacing}
        minimumValue={-2}
        maximumValue={6}
        step={0.1}
        onSlidingStart={pushHistory}
        onValueChange={(val) => updateText(element.id, { letterSpacing: val }, { recordHistory: false })}
      />

      <SliderField
        label={`回転 ${Math.round(element.rotation)}°`}
        value={element.rotation}
        minimumValue={-180}
        maximumValue={180}
        step={1}
        onSlidingStart={pushHistory}
        onValueChange={(val) => updateText(element.id, { rotation: val }, { recordHistory: false })}
      />

      <SliderField
        label={`不透明度 ${(element.opacity * 100).toFixed(0)}%`}
        value={element.opacity}
        minimumValue={0.1}
        maximumValue={1}
        step={0.02}
        onSlidingStart={pushHistory}
        onValueChange={(val) => updateText(element.id, { opacity: val }, { recordHistory: false })}
      />

      <Text style={styles.label}>テキストカラー</Text>
      <ColorRow
        selectedColor={element.color}
        onPress={(color) => {
          pushHistory();
          updateText(element.id, { color }, { recordHistory: false });
        }}
      />

      <Text style={styles.label}>背景カラー</Text>
      <ColorRow
        allowNone
        selectedColor={element.backgroundColor ?? 'none'}
        onPress={(color) => {
          pushHistory();
          updateText(element.id, { backgroundColor: color === 'none' ? null : color }, { recordHistory: false });
        }}
      />
    </View>
  );
};

export const ShapeProperties: React.FC<PanelProps<ShapeElement>> = ({ element }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { updateShape, pushHistory } = useCardStore((state) => ({
    updateShape: state.updateShape,
    pushHistory: state.pushHistory,
  }));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>図形</Text>
      <Text style={styles.label}>塗り</Text>
      <ColorRow
        selectedColor={element.fillColor}
        onPress={(color) => {
          pushHistory();
          updateShape(element.id, { fillColor: color }, { recordHistory: false });
        }}
      />

      <Text style={styles.label}>枠線</Text>
      <ColorRow
        selectedColor={element.strokeColor}
        onPress={(color) => {
          pushHistory();
          updateShape(element.id, { strokeColor: color }, { recordHistory: false });
        }}
      />

      <SliderField
        label={`枠線 ${Math.round(element.strokeWidth)}px`}
        value={element.strokeWidth}
        minimumValue={0}
        maximumValue={20}
        step={1}
        onSlidingStart={pushHistory}
        onValueChange={(val) => updateShape(element.id, { strokeWidth: val }, { recordHistory: false })}
      />

      {(element.type === 'rect' || element.type === 'roundRect') && (
        <SliderField
          label={`角丸 ${Math.round(element.radius ?? 0)}`}
          value={element.radius ?? 0}
          minimumValue={0}
          maximumValue={120}
          step={2}
          onSlidingStart={pushHistory}
          onValueChange={(val) => updateShape(element.id, { radius: val }, { recordHistory: false })}
        />
      )}

      <SliderField
        label={`回転 ${Math.round(element.rotation)}°`}
        value={element.rotation}
        minimumValue={-180}
        maximumValue={180}
        step={1}
        onSlidingStart={pushHistory}
        onValueChange={(val) => updateShape(element.id, { rotation: val }, { recordHistory: false })}
      />

      <SliderField
        label={`不透明度 ${(element.opacity * 100).toFixed(0)}%`}
        value={element.opacity}
        minimumValue={0.1}
        maximumValue={1}
        step={0.02}
        onSlidingStart={pushHistory}
        onValueChange={(val) => updateShape(element.id, { opacity: val }, { recordHistory: false })}
      />
    </View>
  );
};

export const ImageProperties: React.FC<PanelProps<ImageElement>> = ({ element }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { updateImage, pushHistory, bringForward, sendBackward, selected } = useCardStore((state) => ({
    updateImage: state.updateImage,
    pushHistory: state.pushHistory,
    bringForward: state.bringForward,
    sendBackward: state.sendBackward,
    selected: state.selected,
  }));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>画像</Text>

      <SliderField
        label={`スケール ${element.scale.toFixed(2)}`}
        value={element.scale}
        minimumValue={0.2}
        maximumValue={2}
        step={0.02}
        onSlidingStart={pushHistory}
        onValueChange={(val) => updateImage(element.id, { scale: val }, { recordHistory: false })}
      />

      <SliderField
        label={`回転 ${Math.round(element.rotation)}°`}
        value={element.rotation}
        minimumValue={-180}
        maximumValue={180}
        step={1}
        onSlidingStart={pushHistory}
        onValueChange={(val) => updateImage(element.id, { rotation: val }, { recordHistory: false })}
      />

      <SliderField
        label={`不透明度 ${(element.opacity * 100).toFixed(0)}%`}
        value={element.opacity}
        minimumValue={0.1}
        maximumValue={1}
        step={0.02}
        onSlidingStart={pushHistory}
        onValueChange={(val) => updateImage(element.id, { opacity: val }, { recordHistory: false })}
      />

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.chip}
          onPress={() => bringForward(selected)}
        >
          <Text style={styles.chipLabel}>前面へ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chip}
          onPress={() => sendBackward(selected)}
        >
          <Text style={styles.chipLabel}>背面へ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

type SliderFieldProps = {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  onSlidingStart?: () => void;
};

const SliderField: React.FC<SliderFieldProps> = ({ label, value, minimumValue, maximumValue, step, onValueChange, onSlidingStart }) => {
  const theme = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={sliderStyles.label}>{label}</Text>
      <Slider
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        value={value}
        step={step}
        minimumTrackTintColor={theme.colors.accent}
        maximumTrackTintColor={theme.colors.border}
        onSlidingStart={onSlidingStart}
        onValueChange={onValueChange}
      />
    </View>
  );
};

const ColorRow = ({
  selectedColor,
  onPress,
  allowNone,
}: {
  selectedColor: string;
  onPress: (color: string) => void;
  allowNone?: boolean;
}) => (
  <View style={colorStyles.row}>
    {allowNone && (
      <TouchableOpacity
        style={[colorStyles.swatch, selectedColor === 'none' && colorStyles.swatchActive]}
        onPress={() => onPress('none')}
      >
        <Text style={colorStyles.swatchLabel}>なし</Text>
      </TouchableOpacity>
    )}
    {COLOR_SWATCHES.map((color) => (
      <TouchableOpacity
        key={color}
        style={[
          colorStyles.swatch,
          { backgroundColor: color },
          selectedColor === color && colorStyles.swatchActive,
        ]}
        onPress={() => onPress(color)}
      />
    ))}
  </View>
);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      width: 280,
      backgroundColor: theme.colors.secondary,
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    title: {
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.lg,
    },
    empty: {
      color: theme.colors.textSecondary,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    input: {
      minHeight: 60,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
      padding: theme.spacing.sm,
      color: theme.colors.textPrimary,
      textAlignVertical: 'top',
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.sm,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    chip: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.cardBackground,
    },
    chipActive: {
      backgroundColor: theme.colors.accent + '22',
    },
    chipLabel: {
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.medium,
    },
    chipLabelActive: {
      color: theme.colors.accent,
    },
  });

const sliderStyles = StyleSheet.create({
  label: {
    color: '#94A3B8',
    fontSize: 12,
  },
});

const colorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderColor: '#38BDF8',
    borderWidth: 2,
  },
  swatchLabel: {
    color: '#E5E7EB',
    fontSize: 10,
  },
});
