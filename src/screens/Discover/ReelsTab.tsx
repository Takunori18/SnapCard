import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mockDiscoverCards } from '../../mock/data';
import CardyImage from '../../components/common/CardyImage';
import { useTheme, Theme } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ReelsTab: React.FC = () => {
  const flatListRef = useRef<FlatList>(null);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderReelItem = ({ item, index }: any) => {
    return (
      <View style={styles.reelContainer}>
        <CardyImage
        source={{ uri: item.imageUrl }}
        style={styles.reelImage}
        contentFit="cover"
        alt={`リール ${item.caption || item.id}`}
      />
        
        {/* オーバーレイ */}
        <View style={styles.overlay}>
          {/* 右側のアクションボタン */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="heart-outline" size={32} color={theme.colors.secondary} />
              <Text style={styles.actionText}>{item.likesCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={28} color={theme.colors.secondary} />
              <Text style={styles.actionText}>{item.commentsCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="paper-plane-outline" size={28} color={theme.colors.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="ellipsis-horizontal" size={28} color={theme.colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* 下部の情報 */}
          <View style={styles.infoContainer}>
            <View style={styles.userInfo}>
              <CardyImage
                source={{ uri: 'https://i.pravatar.cc/150?img=' + (index % 10 + 1) }}
                style={styles.userAvatar}
                contentFit="cover"
                alt={`@user_${index + 1}のアバター`}
                priority
              />
              <Text style={styles.username}>@user_{index + 1}</Text>
            </View>

            <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
            
            {item.location && (
              <View style={styles.locationInfo}>
                <Ionicons name="location-outline" size={16} color={theme.colors.secondary} />
                <Text style={styles.locationText}>{item.location.name}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={mockDiscoverCards.slice(0, 15)}
        renderItem={renderReelItem}
        keyExtractor={(item) => item.id}
        initialNumToRender={3}
        windowSize={3}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={80}
        removeClippedSubviews
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT - 90} // タブバーの高さを引く
        snapToAlignment="start"
        decelerationRate="fast"
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  reelContainer: {
    height: SCREEN_HEIGHT - 90, // タブバーの高さを引く
    width: '100%',
  },
  reelImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  actionsContainer: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: 120,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  actionText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  infoContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  username: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.secondary,
  },
  caption: {
    fontSize: theme.fontSize.md,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.sm,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.secondary,
    marginLeft: 4,
  },
});
