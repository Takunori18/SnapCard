import React, { Suspense, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '../../theme';
import { useSkiaWebReady } from '../../hooks/useSkiaWebReady';

const StoryEditorCanvas = React.lazy(() => import('./StoryEditorCanvas'));

const createLoadingStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.md,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.sm,
      textAlign: 'center',
    },
  });

export const StoryEditorScreen: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createLoadingStyles(theme), [theme]);
  const { ready, error } = useSkiaWebReady();

  const fallback = (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <RNText style={styles.loadingText}>Skia Canvasを準備中です...</RNText>
        {error && <RNText style={styles.errorText}>{error.message}</RNText>}
      </View>
    </SafeAreaView>
  );

  if (!ready) {
    return fallback;
  }

  return (
    <Suspense fallback={fallback}>
      <StoryEditorCanvas />
    </Suspense>
  );
};

export default StoryEditorScreen;
