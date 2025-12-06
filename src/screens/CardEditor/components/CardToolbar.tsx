// src/screens/CardEditor/components/CardToolbar.tsx
import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../../theme';
import { useEditorStore } from '../../../store/editorStore';

export const CardToolbar: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    selection,
    removeElements,
    duplicateElements,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
  } = useEditorStore();

  const hasSelection = selection.selectedIds.length > 0;

  return (
    <View style={styles.toolbar}>
      <TouchableOpacity
        style={[styles.toolButton, !hasSelection && styles.toolButtonDisabled]}
        onPress={() => duplicateElements(selection.selectedIds)}
        disabled={!hasSelection}
      >
        <Ionicons
          name="copy-outline"
          size={20}
          color={hasSelection ? theme.colors.textPrimary : theme.colors.textTertiary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toolButton, !hasSelection && styles.toolButtonDisabled]}
        onPress={() => removeElements(selection.selectedIds)}
        disabled={!hasSelection}
      >
        <Ionicons
          name="trash-outline"
          size={20}
          color={hasSelection ? theme.colors.error : theme.colors.textTertiary}
        />
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={[styles.toolButton, !hasSelection && styles.toolButtonDisabled]}
        onPress={() => selection.selectedIds.forEach(bringToFront)}
        disabled={!hasSelection}
      >
        <Ionicons
          name="chevron-up-outline"
          size={20}
          color={hasSelection ? theme.colors.textPrimary : theme.colors.textTertiary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toolButton, !hasSelection && styles.toolButtonDisabled]}
        onPress={() => selection.selectedIds.forEach(bringForward)}
        disabled={!hasSelection}
      >
        <Ionicons
          name="arrow-up-outline"
          size={20}
          color={hasSelection ? theme.colors.textPrimary : theme.colors.textTertiary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toolButton, !hasSelection && styles.toolButtonDisabled]}
        onPress={() => selection.selectedIds.forEach(sendBackward)}
        disabled={!hasSelection}
      >
        <Ionicons
          name="arrow-down-outline"
          size={20}
          color={hasSelection ? theme.colors.textPrimary : theme.colors.textTertiary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toolButton, !hasSelection && styles.toolButtonDisabled]}
        onPress={() => selection.selectedIds.forEach(sendToBack)}
        disabled={!hasSelection}
      >
        <Ionicons
          name="chevron-down-outline"
          size={20}
          color={hasSelection ? theme.colors.textPrimary : theme.colors.textTertiary}
        />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    toolButton: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardBackground,
    },
    toolButtonDisabled: {
      opacity: 0.3,
    },
    divider: {
      width: 1,
      height: 20,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.xs,
    },
  });
