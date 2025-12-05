import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Story } from '../../types';
import { useTheme, Theme } from '../../theme';
import CardyImage from '../common/CardyImage';

interface StoryBubbleProps {
  story: Story;
  onPress?: () => void;
}

export const StoryBubble: React.FC<StoryBubbleProps> = ({ story, onPress }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {!story.hasViewed ? (
        <LinearGradient
          colors={['#FF6B6B', '#4A90E2', '#9B59B6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <View style={styles.innerBorder}>
            <CardyImage
              source={{ uri: story.avatarUrl, cacheKey: `story-${story.id}` }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              alt={`${story.username}のストーリー`}
              priority
            />
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.viewedBorder}>
          <CardyImage
            source={{ uri: story.avatarUrl, cacheKey: `story-${story.id}` }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            alt={`${story.username}のストーリー`}
            priority
          />
        </View>
      )}
      
      <Text style={styles.username} numberOfLines={1}>{story.username}</Text>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      marginRight: theme.spacing.md,
      width: 72,
    },
    gradientBorder: {
      width: 68,
      height: 68,
      borderRadius: theme.borderRadius.full,
      padding: 2,
    },
    innerBorder: {
      width: '100%',
      height: '100%',
      borderRadius: theme.borderRadius.full,
      padding: 3,
      backgroundColor: theme.colors.secondary,
    },
    viewedBorder: {
      width: 68,
      height: 68,
      borderRadius: theme.borderRadius.full,
      padding: 2,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    avatar: {
      width: '100%',
      height: '100%',
      borderRadius: theme.borderRadius.full,
    },
    username: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.xs,
      textAlign: 'center',
    },
  });
