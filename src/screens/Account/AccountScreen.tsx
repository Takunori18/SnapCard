import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Dimensions, Alert, Text, ScrollView, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileHeader } from '../../components/social/ProfileHeader';
import { SnapCardDetailModal } from '../../components/cards/SnapCardDetailModal';
import { useAuth } from '../../contexts/AuthContext';
import { useSnapCardContext } from '../../contexts/SnapCardContext';
import { useTheme, Theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useFollowContext } from '../../contexts/FollowContext';
import CardyImage from '../../components/common/CardyImage';
import { optimizeRemoteImageUri } from '../../utils/image';
import { fetchFollowStats } from '../../utils/follow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const CARD_ASPECT_RATIO = 3 / 4;

const DUMMY_HIGHLIGHTS = [
  { id: '1', title: '旅行', coverImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e' },
  { id: '2', title: 'グルメ', coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836' },
  { id: '3', title: 'カフェ', coverImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf' },
];

export const AccountScreen: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const activeProfileId = profile?.id ?? user?.id ?? null;
  const { cards } = useSnapCardContext();
  const { following } = useFollowContext();
  const navigation = useNavigation();
  const theme = useTheme();
  const [qrVisible, setQrVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [detailIndex, setDetailIndex] = useState(0);
  const gridGap = theme.spacing.sm;
  const cardWidth = (SCREEN_WIDTH - gridGap * (GRID_COLUMNS + 1)) / GRID_COLUMNS;
  const cardHeight = cardWidth / CARD_ASPECT_RATIO;
  const styles = useMemo(
    () => createStyles(theme, gridGap, cardWidth, cardHeight),
    [theme, gridGap, cardWidth, cardHeight]
  );

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      if (!activeProfileId) {
        if (isMounted) {
          setFollowerCount(0);
        }
        return;
      }
      const stats = await fetchFollowStats(activeProfileId);
      if (isMounted) {
        setFollowerCount(stats.followers);
      }
    };
    loadStats();
    return () => {
      isMounted = false;
    };
  }, [activeProfileId]);

  const myPublicCards = cards.filter(card => activeProfileId && card.userId === activeProfileId && card.isPublic !== false);

  const handleLogout = async () => {
    const confirm = Platform.OS === 'web' ? window.confirm?.('ログアウトしますか？') ?? true : true;
    if (!confirm) {
      return;
    }

    setSettingsVisible(false);
    try {
      const { error } = await signOut();
      if (error) {
        Alert.alert('エラー', 'ログアウトに失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', 'ログアウトに失敗しました');
    }
  };

  const handleSettings = () => {
    setSettingsVisible(true);
  };

  const handleEditProfile = () => {
    navigation.navigate('ProfileEdit' as never);
  };

  if (!user) return null;
  const username = profile?.username || user.email || user.id;
  const profileLink = `https://snapcard.app/u/${username}`;
  const qrImageUri = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileLink)}`;

  const renderGridItem = ({ item, index }: { item: any; index: number }) => {
    // ★ サムネイル優先で最適化
    const displayUri = item.thumbnailUrl ?? item.imageUri;
    const optimized = optimizeRemoteImageUri(displayUri, 700);
    
    return (
      <TouchableOpacity 
        onPress={() => {
          setDetailIndex(index);
          setDetailVisible(true);
        }}
        activeOpacity={0.8}
        style={styles.gridItemTouchable}
      >
        <LinearGradient
          colors={['#00B4FF', '#00FF99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gridItemGradient}
        >
          <View style={styles.gridItem}>
            {optimized ? (
              <CardyImage
                source={{ uri: optimized, cacheKey: `account-${item.id}` }}
                style={styles.gridImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={`account-${item.id}`}
                blurhash={DEFAULT_BLURHASH}
                transition={200}
                alt={`カード ${item.caption || item.id}`}
              />
            ) : null}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHighlight = ({ item }: any) => {
    const optimized = optimizeRemoteImageUri(item.coverImage, 320);
    return (
      <TouchableOpacity style={styles.highlightItem} onPress={() => console.log('Highlight pressed:', item.id)}>
        <LinearGradient
          colors={['#5AC8FA', '#34C759']}
          style={styles.highlightCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.highlightInner}>
            {optimized ? (
              <CardyImage
                source={{ uri: optimized, cacheKey: `highlight-${item.id}` }}
                style={styles.highlightImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={`highlight-${item.id}`}
                blurhash={DEFAULT_BLURHASH}
                transition={200}
                alt={`${item.title}のハイライト`}
                priority
              />
            ) : null}
          </View>
        </LinearGradient>
        <Text style={styles.highlightTitle} numberOfLines={1}>{item.title}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="menu" size={28} color={theme.colors.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Ionicons name="person" size={20} color={theme.colors.primary} />
        </View>

        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleSettings}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            <ProfileHeader 
              profile={profile}
              cardCount={myPublicCards.length}
              onEditPress={handleEditProfile}
              followingCount={following.length}
              followersCount={followerCount}
            />
            
            <View style={styles.actionsRow}>
              <TouchableOpacity 
                style={styles.qrButton}
                onPress={() => setQrVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="qr-code-outline" size={20} color={theme.colors.secondary} />
                <Text style={styles.qrButtonText}>QRコードを表示</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.highlightsSection}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.highlightsContent}
              >
                <TouchableOpacity style={styles.highlightItem}>
                  <LinearGradient
                    colors={['#5AC8FA', '#34C759']}
                    style={styles.highlightCircle}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.highlightInner}>
                      <View style={styles.addHighlightContent}>
                        <Ionicons name="add" size={32} color={theme.colors.textPrimary} />
                      </View>
                    </View>
                  </LinearGradient>
                  <Text style={styles.highlightTitle}>新規</Text>
                </TouchableOpacity>

                {DUMMY_HIGHLIGHTS.map((highlight) => (
                  <View key={highlight.id}>
                    {renderHighlight({ item: highlight })}
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.tabBar}>
              <View style={[styles.tab, styles.tabActive]}>
                <Ionicons name="grid" size={24} color={theme.colors.primary} />
              </View>
            </View>
          </>
        }
        data={myPublicCards}
        renderItem={renderGridItem}
        keyExtractor={(item) => item.id}
        numColumns={GRID_COLUMNS}
        columnWrapperStyle={styles.accountColumnWrapper}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={60} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>まだ公開カードがありません</Text>
          </View>
        }
      />

      <SnapCardDetailModal
        visible={detailVisible}
        cards={myPublicCards}
        initialIndex={detailIndex}
        onClose={() => setDetailVisible(false)}
      />

      <Modal
        transparent
        visible={settingsVisible}
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <Text style={styles.modalTitle}>設定</Text>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setSettingsVisible(false);
                navigation.navigate('ProfileEdit' as never);
              }}
            >
              <Ionicons name="create-outline" size={20} color={theme.colors.textPrimary} />
              <Text style={styles.settingsText}>プロフィール編集</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setSettingsVisible(false);
                handleLogout();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              <Text style={[styles.settingsText, { color: theme.colors.error }]}>ログアウト</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setSettingsVisible(false)}>
              <Text style={styles.closeModalText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={qrVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrVisible(false)}
      >
        <View style={styles.qrOverlay}>
          <View style={styles.qrModal}>
            <Text style={styles.qrTitle}>あなたのQRコード</Text>
            <CardyImage
              source={{ uri: qrImageUri }}
              style={styles.qrImage}
              contentFit="cover"
              alt="プロフィールQRコード"
              priority
            />
            <Text style={styles.qrSubtitle}>@{username}</Text>
            <Text style={styles.qrLink}>{profileLink}</Text>
            <TouchableOpacity 
              style={styles.qrCloseButton}
              onPress={() => setQrVisible(false)}
            >
              <Text style={styles.qrCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme, gridGap: number, cardWidth: number, cardHeight: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    actionsRow: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.secondary,
    },
    qrButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.sm,
    },
    qrButtonText: {
      color: theme.colors.secondary,
      fontWeight: theme.fontWeight.bold,
      marginLeft: theme.spacing.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    settingsModal: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    modalTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    settingsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    settingsText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.medium,
    },
    closeModalButton: {
      marginTop: theme.spacing.lg,
      alignSelf: 'flex-end',
    },
    closeModalText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.sm,
    },
    highlightsSection: {
      backgroundColor: theme.colors.secondary,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    highlightsContent: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.md,
    },
    highlightItem: {
      alignItems: 'center',
      width: 70,
    },
    highlightCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      padding: 2,
      marginBottom: theme.spacing.xs,
    },
    highlightInner: {
      width: '100%',
      height: '100%',
      borderRadius: 30,
      overflow: 'hidden',
      backgroundColor: theme.colors.secondary,
      borderWidth: 2,
      borderColor: theme.colors.secondary,
    },
    highlightImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    addHighlightContent: {
      flex: 1,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    highlightTitle: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      maxWidth: 70,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: theme.colors.primary,
    },
    gridContainer: {
      paddingTop: gridGap,
      paddingBottom: theme.spacing.lg,
    },
    accountColumnWrapper: {
      paddingHorizontal: gridGap,
      justifyContent: 'flex-start',
    },
    gridItemTouchable: {
      width: cardWidth,
      height: cardHeight,
      marginBottom: gridGap,
      marginRight: gridGap,
    },
    gridItemGradient: {
      width: '100%',
      height: '100%',
      padding: 3,
      borderRadius: theme.borderRadius.lg,
    },
    gridItem: {
      width: '100%',
      height: '100%',
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.cardBackground,
    },
    gridImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
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
    qrOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    qrModal: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    qrTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    qrImage: {
      width: 220,
      height: 220,
      marginBottom: theme.spacing.md,
    },
    qrSubtitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    qrLink: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    qrCloseButton: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.sm,
    },
    qrCloseText: {
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.semibold,
    },
  });

const DEFAULT_BLURHASH = 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH';
