import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import CardyImage from '../../components/common/CardyImage';
import { Ionicons } from '@expo/vector-icons';
import { SnapCardItem } from '../../components/cards/SnapCardItem';
import { useTheme, Theme } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useFollowContext } from '../../contexts/FollowContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDm } from '../../contexts/DmContext';
import { SnapCard, CardMediaType } from '../../types/card';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { isValidUUID } from '../../utils/uuid';

const resolveAvatarUrl = (value?: string | null) => {
  if (!value) {
    return undefined;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const cleaned = value.replace(/^\/+/, '');
  try {
    const { data } = supabase.storage.from('card-images').getPublicUrl(cleaned);
    return data?.publicUrl ?? value;
  } catch {
    return value;
  }
};

export const FeedTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [feedCards, setFeedCards] = useState<SnapCard[]>([]);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardAuthors, setCardAuthors] = useState<Record<string, { displayName?: string | null; username?: string | null; avatarUrl?: string | null }>>(
    {}
  );
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { following, isFollowing, toggleFollow } = useFollowContext();
  const { user, profile } = useAuth();
  const { getOrCreateConversation } = useDm();
  const activeProfileId = profile?.id ?? user?.id ?? null;

  const filteredCards = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === '') return feedCards;
    const lower = trimmed.toLowerCase();
    return feedCards.filter(card =>
      (card.caption || '').toLowerCase().includes(lower) ||
      (card.location || '').toLowerCase().includes(lower) ||
      card.tags.some(tag => tag.toLowerCase().includes(lower))
    );
  }, [searchQuery, feedCards]);

  useEffect(() => {
    const fetchFeed = async () => {
      if (!following.length) {
        setFeedCards([]);
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
        if (error) throw error;
        const mapped =
          data?.map((card: any) => {
            const mediaType: CardMediaType =
              (card.media_type as CardMediaType) ?? (card.video_url ? 'video' : 'image');
            return {
              id: card.id,
              imageUri: card.image_url ?? undefined,
              videoUri: card.video_url ?? undefined,
              mediaType,
              caption: card.caption,
              location: card.location,
              tags: card.tags || [],
              likesCount: card.likes_count || 0,
              createdAt: new Date(card.created_at),
              userId: card.user_id,
              isPublic: true,
            };
          }) ?? [];
        setFeedCards(mapped);
      } catch (error) {
        console.error('フィード取得エラー:', error);
      } finally {
        setCardsLoading(false);
      }
    };

    fetchFeed();
  }, [following]);

  useEffect(() => {
    const fetchAuthorProfiles = async () => {
      const userIds = Array.from(new Set(feedCards.map(card => card.userId).filter(id => id && isValidUUID(id)))) as string[];
      if (userIds.length === 0) {
        setCardAuthors({});
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);
        if (error) {
          throw error;
        }
        const profiles =
          (data ?? []).reduce((acc, profile) => {
            acc[profile.id] = {
              displayName: profile.display_name,
              username: profile.username,
              avatarUrl: resolveAvatarUrl(profile.avatar_url),
            };
            return acc;
          }, {} as Record<string, { displayName?: string | null; username?: string | null; avatarUrl?: string | null }>);
        setCardAuthors(profiles);
      } catch (error) {
        console.error('カード作者取得エラー:', error);
      }
    };

    fetchAuthorProfiles();
  }, [feedCards]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === '') {
      setUserResults([]);
      setSearchingUsers(false);
      return;
    }

    let isCancelled = false;
    const fetchProfiles = async () => {
      setSearchingUsers(true);
      const likePattern = `%${trimmed}%`;
      const combined = new Map<string, any>();
      const appendRows = (rows?: any[] | null) => {
        (rows ?? []).forEach(row => {
          if (!row?.id || combined.has(row.id)) {
            return;
          }
          combined.set(row.id, { ...row, avatar_url: resolveAvatarUrl(row?.avatar_url) });
        });
      };

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, username, display_name, avatar_url')
          .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
          .limit(10);

        if (error) {
          throw error;
        }
        appendRows(data);
      } catch (lookupError) {
        console.error('ユーザー検索エラー:', lookupError);
      }

      if (!isCancelled) {
        setUserResults(Array.from(combined.values()));
        setSearchingUsers(false);
      }
    };

    fetchProfiles();
    return () => {
      isCancelled = true;
    };
  }, [searchQuery]);

  const handleToggleFollow = async (targetId: string) => {
    if (!targetId) {
      return;
    }
    if (activeProfileId && targetId === activeProfileId) {
      return;
    }
    if (user?.id && targetId === user.id) {
      return;
    }
    await toggleFollow(targetId);
  };

  const handleStartConversation = async (profileId: string) => {
    try {
      const conversationId = await getOrCreateConversation(profileId);
      navigation.navigate('DmThread', { conversationId });
    } catch (error) {
      console.error('DM開始エラー:', error);
      Alert.alert(
        'メッセージ',
        error instanceof Error ? error.message : 'メッセージを開始できませんでした',
      );
    }
  };

  const openProfile = (
    targetId?: string | null,
    meta?: { displayName?: string | null; username?: string | null; avatarUrl?: string | null },
  ) => {
    if (!targetId) return;
    navigation.navigate('UserProfile', {
      profileId: targetId,
      displayName: meta?.displayName,
      username: meta?.username,
      avatarUrl: meta?.avatarUrl,
    });
  };

  return (
    <View style={styles.container}>
      {/* 検索バー */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="カードを検索..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.trim() !== '' && (
        <View style={styles.userResultsSection}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          {searchingUsers ? (
            <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: theme.spacing.md }} />
          ) : userResults.length === 0 ? (
            <Text style={styles.emptyUsersText}>一致するアカウントがありません</Text>
          ) : (
              userResults.map(profile => (
              <TouchableOpacity
                 key={profile.id}
                 style={styles.userRow}
                 onPress={() => openProfile(profile.id, {
                   displayName: profile.display_name,
                   username: profile.username,
                   avatarUrl: profile.avatar_url,
                 })}
               >
                {profile.avatar_url ? (
                  <CardyImage
                    source={{ uri: profile.avatar_url, cacheKey: `feed-avatar-${profile.id}` }}
                    style={styles.userAvatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={120}
                    alt={`${profile.username}のアバター`}
                    priority
                  />
                ) : (
                  <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                    <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userDisplayName}>
                    {profile.display_name || profile.username}
                  </Text>
                  <Text style={styles.userHandle}>@{profile.username}</Text>
                </View>
                {(() => {
                  const isOwnAccount =
                    (activeProfileId && profile.id === activeProfileId) ||
                    (user?.id && profile.id === user.id);
                  if (isOwnAccount) {
                    return (
                      <View style={styles.userActions}>
                        <Text style={styles.selfAccountLabel}>自分のアカウント</Text>
                      </View>
                    );
                  }
                  return (
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        style={[
                          styles.followButton,
                          isFollowing(profile.id) && styles.followingButton,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          handleToggleFollow(profile.id);
                        }}
                      >
                        <Text
                          style={[
                            styles.followButtonText,
                            isFollowing(profile.id) && styles.followingButtonText,
                          ]}
                        >
                          {isFollowing(profile.id) ? 'フォロー中' : 'フォロー'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.messageButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          handleStartConversation(profile.id);
                        }}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.colors.textPrimary} />
                        <Text style={styles.messageButtonText}>メッセージ</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* カード一覧 */}
      {cardsLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredCards}
          renderItem={({ item }) => (
              <SnapCardItem
                card={item}
                onPress={() => console.log('Card pressed:', item.id)}
                authorName={cardAuthors[item.userId]?.username || undefined}
                authorAvatarUri={cardAuthors[item.userId]?.avatarUrl}
                onAuthorPress={() =>
                  openProfile(item.userId, {
                    displayName: cardAuthors[item.userId]?.displayName,
                    username: cardAuthors[item.userId]?.username,
                    avatarUrl: cardAuthors[item.userId]?.avatarUrl,
                  })
                }
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
              <Ionicons name="images-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>フォロー中の公開カードが表示されます</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    searchBar: {
      backgroundColor: theme.colors.secondary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      marginLeft: theme.spacing.sm,
    },
    cardsList: {
      padding: theme.spacing.md,
    },
    userResultsSection: {
      backgroundColor: theme.colors.secondary,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    userAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: theme.spacing.sm,
    },
    userAvatarPlaceholder: {
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userInfo: {
      flex: 1,
    },
    userActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    userDisplayName: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.semibold,
    },
    userHandle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    followButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    followButtonText: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.semibold,
    },
    followingButton: {
      backgroundColor: theme.colors.accent,
    },
    followingButtonText: {
      color: theme.colors.secondary,
    },
    messageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      gap: 4,
    },
    messageButtonText: {
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.semibold,
    },
    selfAccountLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.sm,
    },
    emptyUsersText: {
      color: theme.colors.textSecondary,
      paddingVertical: theme.spacing.sm,
    },
  });
