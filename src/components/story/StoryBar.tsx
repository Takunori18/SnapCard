import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import CardyImage from '../common/CardyImage';
import { useStoryContext } from '../../contexts/StoryContext';
import { useNavigation } from '@react-navigation/native';

export const StoryBar: React.FC = () => {
  const { stories, getUserStories } = useStoryContext();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // ユーザーごとにストーリーをグループ化
  const userStories = stories.reduce((acc, story) => {
    if (!acc[story.userId]) {
      acc[story.userId] = [];
    }
    acc[story.userId].push(story);
    return acc;
  }, {} as Record<string, typeof stories>);

  const handleStoryPress = (userId: string) => {
    const userStoriesList = userStories[userId];
    if (userStoriesList && userStoriesList.length > 0) {
      navigation.navigate('StoryViewer' as never, { 
        stories: userStoriesList,
        initialIndex: 0 
      } as never);
    }
  };

  const handleAddStory = () => {
    navigation.navigate('Camera' as never);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 自分のストーリーを追加 */}
        <TouchableOpacity style={styles.storyItem} onPress={handleAddStory}>
          <View style={styles.addStoryCircle}>
            <LinearGradient
              colors={[theme.colors.accent, theme.colors.primary]}
              style={styles.gradient}
            >
              <Ionicons name="add" size={24} color={theme.colors.secondary} />
            </LinearGradient>
          </View>
          <Text style={styles.storyName}>あなた</Text>
        </TouchableOpacity>

        {/* 他のユーザーのストーリー */}
        {Object.entries(userStories).map(([userId, userStoriesList]) => (
          <TouchableOpacity 
            key={userId} 
            style={styles.storyItem}
            onPress={() => handleStoryPress(userId)}
          >
            <LinearGradient
              colors={[theme.colors.accent, theme.colors.primary]}
              style={styles.storyCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.storyInner}>
                <CardyImage
                  source={{ uri: userStoriesList[0].imageUri }}
                  style={styles.storyImage}
                  resizeMode="cover"
                  alt={`ユーザー${userId}のストーリー`}
                  priority
                />
              </View>
            </LinearGradient>
            <Text style={styles.storyName}>
              {userId === '1' ? 'あなた' : `ユーザー ${userId}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.secondary,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.md,
    },
    storyItem: {
      alignItems: 'center',
      width: 70,
    },
    storyCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      padding: 2,
      marginBottom: theme.spacing.xs,
    },
    storyInner: {
      width: '100%',
      height: '100%',
      borderRadius: 30,
      overflow: 'hidden',
      backgroundColor: theme.colors.secondary,
      borderWidth: 2,
      borderColor: theme.colors.secondary,
    },
    storyImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    addStoryCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      marginBottom: theme.spacing.xs,
    },
    gradient: {
      width: '100%',
      height: '100%',
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    storyName: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
  });
