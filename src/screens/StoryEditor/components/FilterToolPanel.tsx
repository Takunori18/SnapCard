import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { BottomSheet } from './BottomSheet';
import { useStoryStore, FilterValues } from '../storyStore';
import { useTheme, Theme } from '../../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type FilterKey = keyof FilterValues;

const FILTER_CONFIG: Array<{ key: FilterKey; label: string; min: number; max: number }> = [
  { key: 'brightness', label: '明るさ', min: 0, max: 2 },
  { key: 'contrast', label: 'コントラスト', min: 0, max: 2 },
  { key: 'saturation', label: '彩度', min: 0, max: 2 },
  { key: 'blur', label: 'ぼかし', min: 0, max: 20 },
] as const;

export const FilterToolPanel: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { filters, updateFilters } = useStoryStore((state) => ({
    filters: state.filters,
    updateFilters: state.updateFilters,
  }));

  return (
    <BottomSheet visible={visible} onClose={onClose} title="フィルター" scrollable={false}>
      {FILTER_CONFIG.map((config) => (
        <View key={config.key} style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>{config.label}</Text>
            <Text style={styles.value}>{filters[config.key].toFixed(2)}</Text>
          </View>
          <Slider
            minimumValue={config.min}
            maximumValue={config.max}
            value={filters[config.key]}
            minimumTrackTintColor={theme.colors.accent}
            maximumTrackTintColor={theme.colors.border}
            onValueChange={(value) => updateFilters({ [config.key]: value })}
          />
        </View>
      ))}
    </BottomSheet>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    field: {
      marginBottom: theme.spacing.sm,
    },
    fieldHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    label: {
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeight.semibold,
    },
    value: {
      color: theme.colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
  });
