import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Story } from '../../contexts/StoryContext';
import { useTheme, Theme } from '../../theme';
import CardyImage from '../common/CardyImage';

interface StoryViewerModalProps {
  visible: boolean;
  stories: Story[];
  onClose: () => void;
  userName: string;
  avatarUri?: string;
  currentUserId?: string;
  onDeleteStory?: (storyId: string) => Promise<void> | void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  visible,
  stories,
  onClose,
  userName,
  avatarUri,
  currentUserId,
  onDeleteStory,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayStories, setDisplayStories] = useState<Story[]>([]);
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (visible) {
      setDisplayStories(stories);
      setCurrentIndex(0);
    }
  }, [visible, stories]);

  const currentStory = displayStories[currentIndex];

  const textSizes = useMemo(
    () => ({
      small: theme.fontSize.lg,
      medium: theme.fontSize.xl,
      large: theme.fontSize.xxl,
    }),
    [theme]
  );

  const renderEmptyState = () => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.emptyCard}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text style={styles.emptyText}>ストーリーを表示できません</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color={theme.colors.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (!displayStories.length || !currentStory) {
    return visible ? renderEmptyState() : null;
  }

  const handleNext = () => {
    if (currentIndex < displayStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDelete = () => {
    if (!currentStory || !onDeleteStory) return;

    Alert.alert('ストーリーを削除', 'このストーリーを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await onDeleteStory(currentStory.id);
            setDisplayStories(prev => {
              const updated = prev.filter(story => story.id !== currentStory.id);
              if (!updated.length) {
                return [];
              }
              if (currentIndex >= updated.length) {
                setCurrentIndex(updated.length - 1);
              }
              return updated;
            });
            if (displayStories.length <= 1) {
              onClose();
            }
          } catch (error) {
            console.error('ストーリー削除エラー:', error);
            Alert.alert('エラー', 'ストーリーの削除に失敗しました');
          }
        },
      },
    ]);
  };

  const isOwnStory = !!(currentUserId && currentStory.userId === currentUserId);

  const computeOverlayPosition = () => {
    if (!cardSize?.width || !cardSize?.height) {
      return { left: theme.spacing.md, top: theme.spacing.lg };
    }
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const position = currentStory.textPosition ?? { x: 0.1, y: 0.75 };
    const baseLeft = position.x * cardSize.width;
    const baseTop = position.y * cardSize.height;
    const margin = theme.spacing.md;
    return {
      left: clamp(baseLeft, margin, cardSize.width - margin),
      top: clamp(baseTop, margin, cardSize.height - margin),
    };
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={styles.card}
          onLayout={event => {
            const { width, height } = event.nativeEvent.layout;
            setCardSize(prev => {
              if (prev && prev.width === width && prev.height === height) {
                return prev;
              }
              return { width, height };
            });
          }}
        >
          <CardyImage
            source={{ uri: currentStory.imageUri }}
            style={styles.storyImage}
            resizeMode="cover"
            alt={`${userName}のストーリー`}
            priority
          />
          {currentStory.text ? (
            <View
              pointerEvents="none"
              style={[
                styles.textOverlay,
                {
                  backgroundColor: currentStory.backgroundColor || 'rgba(0,0,0,0.4)',
                  ...computeOverlayPosition(),
                },
              ]}
            >
              <Text
                style={[
                  styles.overlayText,
                  {
                    color: currentStory.textColor || theme.colors.secondary,
                    fontSize: textSizes[currentStory.textSize as keyof typeof textSizes] ?? theme.fontSize.xl,
                    fontFamily: currentStory.textFont || undefined,
                  },
                ]}
              >
                {currentStory.text}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.header}>
          <View style={styles.userInfo}>
            {avatarUri ? (
              <CardyImage
              source={{ uri: avatarUri }}
              style={styles.avatar}
              resizeMode="cover"
              alt={`${userName}のアバター`}
              priority
            />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.userInfoText}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.counter}>
                {currentIndex + 1}/{displayStories.length}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {isOwnStory && onDeleteStory && (
              <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
                <Ionicons name="trash" size={24} color={theme.colors.secondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlArea} onPress={handlePrev} disabled={currentIndex === 0} />
          <TouchableOpacity style={styles.controlArea} onPress={handleNext} />
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      width: '90%',
      height: '75%',
      maxWidth: 380,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: '#111',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.1)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 12,
    },
    storyImage: {
      width: '100%',
      height: '100%',
    },
    header: {
      position: 'absolute',
      top: 40,
      left: 20,
      right: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    userInfoText: {
      marginLeft: theme.spacing.sm,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: theme.colors.secondary,
    },
    avatarPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    userName: {
      color: theme.colors.secondary,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
    counter: {
      color: theme.colors.secondary,
      fontSize: theme.fontSize.sm,
      opacity: 0.8,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: theme.spacing.xs,
      marginRight: theme.spacing.sm,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    controls: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
    },
    controlArea: {
      flex: 1,
    },
    textOverlay: {
      position: 'absolute',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      maxWidth: '80%',
    },
    overlayText: {
      fontWeight: theme.fontWeight.bold,
      textAlign: 'center',
    },
    emptyCard: {
      width: '80%',
      maxWidth: 360,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      backgroundColor: 'rgba(0,0,0,0.8)',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    emptyText: {
      color: theme.colors.secondary,
      fontSize: theme.fontSize.md,
    },
  });
