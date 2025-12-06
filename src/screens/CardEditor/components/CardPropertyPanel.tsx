// src/screens/CardEditor/components/CardPropertyPanel.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../../theme';
import { useEditorStore } from '../../../store/editorStore';

export const CardPropertyPanel: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { elements, selection, updateElement } = useEditorStore();

  const selectedElement = useMemo(() => {
    if (selection.selectedIds.length !== 1) return null;
    return elements.find((el) => el.id === selection.selectedIds[0]);
  }, [elements, selection.selectedIds]);

  if (!selectedElement) return null;

  const handleUpdateOpacity = (opacity: number) => {
    updateElement(selectedElement.id, { opacity });
  };

  const handleUpdateRotation = (rotation: number) => {
    updateElement(selectedElement.id, {
      transform: { ...selectedElement.transform, rotation },
    });
  };

  const handleFlipX = () => {
    if (selectedElement.type === 'image') {
      updateElement(selectedElement.id, { flipX: !selectedElement.flipX });
    }
  };

  const handleFlipY = () => {
    if (selectedElement.type === 'image') {
      updateElement(selectedElement.id, { flipY: !selectedElement.flipY });
    }
  };

  return (
    <View style={styles.panel}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 要素情報 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>プロパティ</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>タイプ:</Text>
              <Text style={styles.infoValue}>{selectedElement.type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {selectedElement.id}
              </Text>
            </View>
          </View>

          {/* 不透明度 */}
          <View style={styles.section}>
            <View style={styles.sliderHeader}>
              <Text style={styles.label}>不透明度</Text>
              <Text style={styles.value}>
                {Math.round((selectedElement.opacity || 1) * 100)}%
              </Text>
            </View>
            <Slider
              minimumValue={0}
              maximumValue={1}
              value={selectedElement.opacity || 1}
              step={0.01}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              onValueChange={handleUpdateOpacity}
            />
          </View>

          {/* 回転 */}
          <View style={styles.section}>
            <View style={styles.sliderHeader}>
              <Text style={styles.label}>回転</Text>
              <Text style={styles.value}>
                {Math.round(selectedElement.transform.rotation)}°
              </Text>
            </View>
            <Slider
              minimumValue={0}
              maximumValue={360}
              value={selectedElement.transform.rotation}
              step={1}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.border}
              onValueChange={handleUpdateRotation}
            />
          </View>

          {/* 画像固有のプロパティ */}
          {selectedElement.type === 'image' && (
            <View style={styles.section}>
              <Text style={styles.label}>反転</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.flipButton,
                    selectedElement.flipX && styles.flipButtonActive,
                  ]}
                  onPress={handleFlipX}
                >
                  <Ionicons
                    name="swap-horizontal"
                    size={20}
                    color={theme.colors.textPrimary}
                  />
                  <Text style={styles.flipButtonText}>左右反転</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.flipButton,
                    selectedElement.flipY && styles.flipButtonActive,
                  ]}
                  onPress={handleFlipY}
                >
                  <Ionicons
                    name="swap-vertical"
                    size={20}
                    color={theme.colors.textPrimary}
                  />
                  <Text style={styles.flipButtonText}>上下反転</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 位置情報 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>変形</Text>
            <View style={styles.transformGrid}>
              <View style={styles.transformItem}>
                <Text style={styles.transformLabel}>X</Text>
                <Text style={styles.transformValue}>
                  {Math.round(selectedElement.transform.x)}
                </Text>
              </View>
              <View style={styles.transformItem}>
                <Text style={styles.transformLabel}>Y</Text>
                <Text style={styles.transformValue}>
                  {Math.round(selectedElement.transform.y)}
                </Text>
              </View>
              <View style={styles.transformItem}>
                <Text style={styles.transformLabel}>スケール</Text>
                <Text style={styles.transformValue}>
                  {selectedElement.transform.scale.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      width: 280,
      backgroundColor: theme.colors.secondary,
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.border,
      padding: theme.spacing.md,
    },
    content: {
      gap: theme.spacing.lg,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.xs,
    },
    infoLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    infoValue: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.medium,
      flex: 1,
      textAlign: 'right',
    },
    sliderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    value: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.accent,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    flipButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    flipButtonActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent + '11',
    },
    flipButtonText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textPrimary,
    },
    transformGrid: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    transformItem: {
      flex: 1,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
    },
    transformLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    transformValue: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
  });
