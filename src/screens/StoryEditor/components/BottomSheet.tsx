import React from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useTheme, Theme } from '../../../theme';
import { Text } from 'react-native';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  height?: number;
  scrollable?: boolean;
};

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  height = 360,
  scrollable = true,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme, height);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.scrim} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeText}>閉じる</Text>
          </TouchableOpacity>
        </View>
        {scrollable ? (
          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme, height: number) =>
  StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
      backgroundColor: theme.colors.secondary,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      minHeight: height,
    },
    grabber: {
      width: 60,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginBottom: theme.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    closeText: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.medium,
    },
    content: {
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.md,
    },
  });
