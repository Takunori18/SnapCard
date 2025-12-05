import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SnapCard } from '../../types';
import { useTheme, Theme } from '../../theme';

interface CardKonvaEditorProps {
  card: SnapCard;
  onClose?: () => void;
  onSave?: (caption: string) => void;
}

export const CardKonvaEditor: React.FC<CardKonvaEditorProps> = ({ card, onClose }) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Web専用エディタ</Text>
      <Text style={styles.message}>
        この編集タブは現在 Web 版でのみ利用できます。カード「{card.caption || 'カード'}」の編集はブラウザから行ってください。
      </Text>
      {onClose && (
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>戻る</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    message: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    button: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.medium,
    },
  });
