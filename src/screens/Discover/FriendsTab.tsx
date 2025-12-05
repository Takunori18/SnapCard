import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import CardyImage from '../../components/common/CardyImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SnapCardItem } from '../../components/cards/SnapCardItem';
import { useStoryContext } from '../../contexts/StoryContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useTheme, Theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { isValidUUID } from '../../utils/uuid';
import { StoryViewerModal } from '../../components/story/StoryViewerModal';
import { Story } from '../../contexts/StoryContext';
import { useFollowContext } from '../../contexts/FollowContext';
import { SnapCard, CardMediaType } from '../../types/card';

const isMissingUserProfilesTable = (error: any) => error?.code === 'PGRST205';

const STORY_GRADIENT = ['#5AC8FA', '#34C759'];

export const FriendsTab: React.FC = () => {
  const { stories, deleteStory } = useStoryContext();
  const { user: currentUser, profile: currentProfile } = useAuth();
  const activeProfileId = currentProfile?.id ?? currentUser?.id ?? null;
  const { following } = useFollowContext();
  const navigation = useNavigation();
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerStories, setViewerStories] = useState<Story[]>([]);
  const [viewerUserName, setViewerUserName] = useState('');
  const [viewerAvatar, setViewerAvatar] = useState<string | undefined>(undefined);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [followingCards, setFollowingCards] = useState<SnapCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);

  const allowedStoryUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (activeProfileId) ids.add(activeProfileId);
    following.forEach(id => ids.add(id));
    return ids;
  }, [activeProfileId, following]);

  const filteredStories = useMemo(
    () => stories.filter(story => allowedStoryUserIds.has(story.userId)),
    [stories, allowedStoryUserIds]
  );

  // ユーザーごとにストーリーをグループ化
  const userStories = filteredStories.reduce((acc, story) => {
    if (!acc[story.userId]) {
      acc[story.userId] = [];
    }
    acc[story.userId].push(story);
    return acc;
  }, {} as Record<string, typeof stories>);

  // ストーリーに関連するユーザープロフィールを取得
  useEffect(() => {
    const fetchUserProfiles = async () => {
      const userIds = Object.keys(userStories).filter(id => isValidUUID(id));
      if (userIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        let rows = data ?? [];
        if (error) {
          if (isMissingUserProfilesTable(error)) {
            const fallback = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .in('id', userIds);
            if (fallback.error) {
              throw fallback.error;
            }
            rows = fallback.data ?? [];
          } else {
            throw error;
          }
        }
        if (rows.length) {
          const profiles = rows.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>);
          setUserProfiles(prev => ({ ...prev, ...profiles }));
        }
      } catch (error) {
        console.error('プロフィール取得エラー:', error);
      }
    };

    fetchUserProfiles();
  }, [stories, following]);

  const handleStoryPress = (userId: string) => {
    const userStoriesList = userStories[userId];
    if (userStoriesList && userStoriesList.length > 0) {
      const sortedStories = [...userStoriesList].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      setViewerStories(sortedStories);
      setViewerUserName(getUserDisplayName(userId));
      setViewerAvatar(getUserAvatar(userId));
      setViewerUserId(userId);
      setViewerVisible(true);
    }
  };

  const handleAddStory = () => {
    navigation.navigate('Camera' as never);
  };

  const getUserDisplayName = (userId: string) => {
    if (userId === activeProfileId) {
      return currentProfile?.display_name || currentProfile?.username || 'あなた';
    }
    const profile = userProfiles[userId];
    return profile?.display_name || profile?.username || 'ユーザー';
  };

  const getUserUsername = (userId: string) => {
    if (userId === activeProfileId) {
      return currentProfile?.username || 'あなた';
    }
    const profile = userProfiles[userId];
    return profile?.username || 'ユーザー';
  };

  const getUserAvatar = (userId: string) => {
    if (userId === activeProfileId) {
      return currentProfile?.avatar_url || userProfiles[userId]?.avatar_url || undefined;
    }
    const profile = userProfiles[userId];
    return profile?.avatar_url || stories.find(s => s.userId === userId)?.imageUri;
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await deleteStory(storyId);
    } catch (error) {
      console.error('Delete story error:', error);
      Alert.alert('エラー', 'ストーリーの削除に失敗しました');
    }
  };

  useEffect(() => {
    const fetchCards = async () => {
      if (following.length === 0) {
        setFollowingCards([]);
        return;
      }
      setCardsLoading(true);
      try {
        const { data, error } = await supabase
          .from('cards')
          .select('*')
          .in('user_id', following)
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const mapped =
          data?.map(card => ({
            id: card.id,
            imageUri: card.image_url,
            caption: card.caption,
            location: card.location,
            tags: card.tags || [],
            likesCount: card.likes_count || 0,
            createdAt: new Date(card.created_at),
            userId: card.user_id,
            isPublic: true,
          })) ?? [];
        setFollowingCards(mapped);
      } catch (error) {
        console.error('フォロー中カード取得エラー:', error);
      } finally {
        setCardsLoading(false);
      }
    };

    fetchCards();
  }, [following]);

  useEffect(() => {
    const fetchCardAuthors = async () => {
      const userIds = Array.from(
        new Set(
          followingCards
            .map(card => card.userId)
            .filter(userId => userId && isValidUUID(userId) && !userProfiles[userId])
        )
      ) as string[];
      if (userIds.length === 0) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        let rows = data ?? [];
        if (error) {
          if (isMissingUserProfilesTable(error)) {
            const fallback = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .in('id', userIds);
            if (fallback.error) {
              throw fallback.error;
            }
            rows = fallback.data ?? [];
          } else {
            throw error;
          }
        }
        if (rows.length) {
          const profiles = rows.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>);
          setUserProfiles(prev => ({ ...prev, ...profiles }));
        }
      } catch (error) {
        console.error('カード作者取得エラー:', error);
      }
    };

    fetchCardAuthors();
  }, [followingCards, userProfiles]);

  return (
    <View style={styles.container}>
      {/* ストーリー一覧 */}
      <View style={styles.storiesSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesContent}
        >
          {/* 自分のストーリーを追加 */}
          <TouchableOpacity style={styles.storyItem} onPress={handleAddStory}>
            <View style={styles.addStoryCircle}>
              <LinearGradient
                colors={STORY_GRADIENT}
                style={styles.gradient}
              >
                <Ionicons name="add" size={24} color={theme.colors.secondary} />
              </LinearGradient>
            </View>
            <Text style={styles.storyName}>追加</Text>
          </TouchableOpacity>

          {/* 他のユーザーのストーリー */}
          {Object.entries(userStories).map(([userId, userStoriesList]) => {
            const avatarUri = getUserAvatar(userId);
            return (
              <TouchableOpacity 
                key={userId} 
                style={styles.storyItem}
                onPress={() => handleStoryPress(userId)}
              >
                <LinearGradient
                  colors={STORY_GRADIENT}
                  style={styles.storyCircle}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.storyInner}>
                    {avatarUri ? (
                      <CardyImage
                        source={{ uri: avatarUri, cacheKey: `story-avatar-${userId}` }}
                        style={styles.storyImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        alt={`${getUserDisplayName(userId)}のストーリー`}
                        priority
                      />
                    ) : (
                      <View style={styles.storyPlaceholder}>
                        <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
                      </View>
                    )}
                  </View>
                </LinearGradient>
                <Text style={styles.storyName} numberOfLines={1}>
                  {getUserDisplayName(userId)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* フォロー中のカード一覧 */}
      {cardsLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={followingCards}
          renderItem={({ item }) => (
            <SnapCardItem
              card={item}
              onPress={() => console.log('Card pressed:', item.id)}
              authorName={getUserUsername(item.userId)}
              authorAvatarUri={getUserAvatar(item.userId)}
              onAuthorPress={() => openProfile(item.userId)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.cardsList}
          initialNumToRender={6}
          windowSize={6}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={60}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>フォロー中の公開カードが表示されます</Text>
            </View>
          }
        />
      )}
      <StoryViewerModal
        visible={viewerVisible}
        stories={viewerStories}
        onClose={() => setViewerVisible(false)}
        userName={viewerUserName}
        avatarUri={viewerAvatar}
        currentUserId={activeProfileId}
        onDeleteStory={handleDeleteStory}
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    storiesSection: {
      backgroundColor: theme.colors.secondary,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    storiesContent: {
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
      borderColor: 'transparent',
    },
    storyImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    storyPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
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
      maxWidth: 70,
    },
    cardsList: {
      padding: theme.spacing.md,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl * 2,
    },
    emptyText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.md,
    },
  });
