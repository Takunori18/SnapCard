import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import CardyImage from '../../components/common/CardyImage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { useTheme, Theme } from '../../theme';
import { useSnapCardContext } from '../../contexts/SnapCardContext';
import { useAuth } from '../../contexts/AuthContext';
import { SnapCard } from '../../types/card';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

type MapCard = SnapCard & {
  latitude: number;
  longitude: number;
  username?: string;
  userAvatarUrl?: string;
  isShopAccount?: boolean;
};

type ShopMarker = {
  id: string;
  latitude: number;
  longitude: number;
  shopName: string;
  username: string;
  avatarUrl?: string;
  isPublic: boolean;
};

const FALLBACK_REGION: Region = {
  latitude: 35.6804,
  longitude: 139.769,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const MapScreen: React.FC = () => {
  const { cards } = useSnapCardContext();
  const { user, profile } = useAuth();
  const navigation = useNavigation();
  const activeProfileId = profile?.id ?? user?.id ?? null;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [region, setRegion] = useState<Region>(FALLBACK_REGION);
  const [selectedCard, setSelectedCard] = useState<MapCard | null>(null);
  const [selectedShop, setSelectedShop] = useState<ShopMarker | null>(null);
  const [locating, setLocating] = useState(false);
  const [shopMarkers, setShopMarkers] = useState<ShopMarker[]>([]);
  const [userProfiles, setUserProfiles] = useState<Map<string, any>>(new Map());

  const mountedRef = useRef(true);
  const mapRef = useRef<MapView>(null);

  // ユーザー位置情報取得
  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('位置情報の権限が拒否されました');
        return;
      }

      setLocating(true);
      const location = await Location.getCurrentPositionAsync({});
      
      if (!mountedRef.current) return;

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      setLocating(false);
    } catch (error) {
      console.warn('位置情報取得エラー:', error);
      if (mountedRef.current) setLocating(false);
    }
  }, []);

  // ショップアカウント取得
  const fetchShopMarkers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, avatar_url, shop_latitude, shop_longitude, shop_name, is_public, is_shop_account')
        .eq('is_shop_account', true)
        .not('shop_latitude', 'is', null)
        .not('shop_longitude', 'is', null);

      if (error) throw error;

      if (data) {
        const shops: ShopMarker[] = data
          .filter((shop) => shop.shop_latitude && shop.shop_longitude)
          .map((shop) => ({
            id: shop.id,
            latitude: shop.shop_latitude!,
            longitude: shop.shop_longitude!,
            shopName: shop.shop_name || shop.username,
            username: shop.username,
            avatarUrl: shop.avatar_url,
            isPublic: shop.is_public ?? true,
          }));

        setShopMarkers(shops);
      }
    } catch (error) {
      console.error('ショップマーカー取得エラー:', error);
    }
  }, []);

  // ユーザープロフィール取得
  const fetchUserProfiles = useCallback(async (userIds: string[]) => {
    try {
      const uniqueUserIds = [...new Set(userIds)];
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, avatar_url, is_public')
        .in('id', uniqueUserIds);

      if (error) throw error;

      if (data) {
        const profileMap = new Map();
        data.forEach((profile) => {
          profileMap.set(profile.id, profile);
        });
        setUserProfiles(profileMap);
      }
    } catch (error) {
      console.error('ユーザープロフィール取得エラー:', error);
    }
  }, []);

  // 初期化
  useEffect(() => {
    void requestLocation();
    void fetchShopMarkers();

    return () => {
      mountedRef.current = false;
    };
  }, [requestLocation, fetchShopMarkers]);

  // カードの位置情報フィルタリング
  const cardsWithLocation = useMemo(() => {
    if (!activeProfileId) return [] as MapCard[];

    // 位置情報付きカードのみ抽出
    const locationCards = cards.filter(
      (card) => card.locationData?.latitude && card.locationData?.longitude
    );

    // ユーザーIDを収集してプロフィール取得
    const userIds = locationCards.map((card) => card.userId);
    if (userIds.length > 0) {
      void fetchUserProfiles(userIds);
    }

    // 表示ルール適用
    const visibleCards = locationCards.filter((card) => {
      // 自分のカードは常に表示
      if (card.userId === activeProfileId) return true;

      // 他人のカードは公開設定をチェック
      const userProfile = userProfiles.get(card.userId);
      return userProfile?.is_public === true && card.isPublic === true;
    });

    // MapCard型に変換
    return visibleCards.map((card) => {
      const userProfile = userProfiles.get(card.userId);
      return {
        ...card,
        latitude: card.locationData!.latitude,
        longitude: card.locationData!.longitude,
        username: userProfile?.username,
        userAvatarUrl: userProfile?.avatar_url,
      } as MapCard;
    });
  }, [cards, activeProfileId, userProfiles, fetchUserProfiles]);

  // 表示可能なショップマーカー（公開アカウントのみ）
  const visibleShopMarkers = useMemo(() => {
    return shopMarkers.filter((shop) => shop.isPublic);
  }, [shopMarkers]);

  // カードマーカータップ
  const handleMarkerPress = useCallback((card: MapCard) => {
    setSelectedCard(card);
    setSelectedShop(null);
  }, []);

  // ショップマーカータップ
  const handleShopMarkerPress = useCallback((shop: ShopMarker) => {
    setSelectedShop(shop);
    setSelectedCard(null);
  }, []);

  // プレビュー閉じる
  const closePreview = () => {
    setSelectedCard(null);
    setSelectedShop(null);
  };

  // カード詳細に移動
  const handleViewCard = () => {
    if (selectedCard) {
      closePreview();
      // TODO: カード詳細画面に遷移
      // navigation.navigate('CardDetail', { cardId: selectedCard.id });
    }
  };

  // ショップのカード一覧表示
  const handleViewShopCards = () => {
    if (selectedShop) {
      closePreview();
      navigation.navigate('UserProfile', { profileId: selectedShop.id } as never);
    }
  };

  // 地図の中心を調整
  const centerMapOnCards = useCallback(() => {
    if (cardsWithLocation.length === 0) return;

    const ownCards = cardsWithLocation.filter((card) => card.userId === activeProfileId);
    const cardsToCenter = ownCards.length > 0 ? ownCards : cardsWithLocation;

    if (cardsToCenter.length === 1) {
      const card = cardsToCenter[0];
      mapRef.current?.animateToRegion(
        {
          latitude: card.latitude,
          longitude: card.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000
      );
    } else {
      // 複数カードの中心を計算
      const avgLat =
        cardsToCenter.reduce((sum, card) => sum + card.latitude, 0) / cardsToCenter.length;
      const avgLng =
        cardsToCenter.reduce((sum, card) => sum + card.longitude, 0) / cardsToCenter.length;

      mapRef.current?.animateToRegion(
        {
          latitude: avgLat,
          longitude: avgLng,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        },
        1000
      );
    }
  }, [cardsWithLocation, activeProfileId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
      >
        {/* カードマーカー */}
        {cardsWithLocation.map((card) => (
          <Marker
            key={`card-${card.id}`}
            coordinate={{ latitude: card.latitude, longitude: card.longitude }}
            onPress={() => handleMarkerPress(card)}
          >
            <View style={styles.markerContainer}>
              {card.imageUri ? (
                <CardyImage
                  source={{ uri: card.imageUri, cacheKey: `map-pin-${card.id}` }}
                  style={styles.markerImage}
                  contentFit="cover"
                  alt={`マーカー ${card.caption || card.id}`}
                />
              ) : (
                <View style={[styles.markerImage, styles.markerPlaceholder]}>
                  <Ionicons name="image-outline" size={18} color={theme.colors.textSecondary} />
                </View>
              )}
            </View>
          </Marker>
        ))}

        {/* ショップマーカー */}
        {visibleShopMarkers.map((shop) => (
          <Marker
            key={`shop-${shop.id}`}
            coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
            onPress={() => handleShopMarkerPress(shop)}
          >
            <View style={styles.shopMarkerContainer}>
              {shop.avatarUrl ? (
                <CardyImage
                  source={{ uri: shop.avatarUrl }}
                  style={styles.shopMarkerImage}
                  contentFit="cover"
                  alt={shop.shopName}
                />
              ) : (
                <View style={styles.shopMarkerInitial}>
                  <Text style={styles.shopMarkerInitialText}>
                    {shop.shopName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.shopMarkerBadge}>
                <Ionicons name="storefront" size={12} color="#fff" />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* 操作ボタン群 */}
      <View style={styles.controlButtons}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={requestLocation}
          activeOpacity={0.8}
        >
          {locating ? (
            <ActivityIndicator size="small" color={theme.colors.accentBlue} />
          ) : (
            <Ionicons name="navigate-circle" size={28} color={theme.colors.accentBlue} />
          )}
        </TouchableOpacity>

        {cardsWithLocation.length > 0 && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={centerMapOnCards}
            activeOpacity={0.8}
          >
            <Ionicons name="images" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* カードプレビュー */}
      {selectedCard && (
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closePreview}>
          <View style={[styles.previewSheet, { maxHeight: SCREEN_HEIGHT * 0.5 }]}>
            <View style={styles.previewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {selectedCard.title || 'タイトルなし'}
                </Text>
                <Text style={styles.previewMeta} numberOfLines={1}>
                  @{selectedCard.username || 'unknown'} ・{' '}
                  {selectedCard.createdAt.toLocaleDateString()}
                </Text>
                {selectedCard.locationData?.placeName && (
                  <View style={styles.previewLocationRow}>
                    <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.previewLocationText} numberOfLines={1}>
                      {selectedCard.locationData.placeName}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={closePreview}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedCard.imageUri ? (
              <CardyImage
                source={{ uri: selectedCard.imageUri }}
                style={styles.previewImage}
                contentFit="cover"
                alt={selectedCard.caption || 'カードプレビュー'}
                priority
              />
            ) : (
              <View style={[styles.previewImage, styles.markerPlaceholder]}>
                <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
              </View>
            )}

            {selectedCard.caption && (
              <Text style={styles.previewCaption} numberOfLines={2}>
                {selectedCard.caption}
              </Text>
            )}

            <TouchableOpacity style={styles.previewButton} onPress={handleViewCard}>
              <Text style={styles.previewButtonText}>カードを見る</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* ショッププレビュー */}
      {selectedShop && (
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closePreview}>
          <View style={[styles.previewSheet, { maxHeight: SCREEN_HEIGHT * 0.4 }]}>
            <View style={styles.previewHeader}>
              <View style={styles.shopPreviewInfo}>
                {selectedShop.avatarUrl ? (
                  <CardyImage
                    source={{ uri: selectedShop.avatarUrl }}
                    style={styles.shopPreviewAvatar}
                    contentFit="cover"
                    alt={selectedShop.shopName}
                  />
                ) : (
                  <View style={styles.shopPreviewAvatarPlaceholder}>
                    <Text style={styles.shopPreviewAvatarText}>
                      {selectedShop.shopName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.shopBadgeRow}>
                    <Ionicons name="storefront" size={16} color={theme.colors.accent} />
                    <Text style={styles.shopBadgeText}>ショップアカウント</Text>
                  </View>
                  <Text style={styles.shopPreviewName} numberOfLines={1}>
                    {selectedShop.shopName}
                  </Text>
                  <Text style={styles.shopPreviewUsername} numberOfLines={1}>
                    @{selectedShop.username}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={closePreview}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.previewButton} onPress={handleViewShopCards}>
              <Text style={styles.previewButtonText}>カード一覧を見る</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    map: {
      flex: 1,
    },
    // カードマーカー
    markerContainer: {
      width: 54,
      height: 72,
      borderRadius: 14,
      borderWidth: 3,
      borderColor: '#fff',
      overflow: 'hidden',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    markerImage: {
      width: '100%',
      height: '100%',
    },
    markerPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.cardBackground,
    },
    // ショップマーカー
    shopMarkerContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 3,
      borderColor: theme.colors.accent,
      overflow: 'hidden',
      backgroundColor: theme.colors.secondary,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    shopMarkerImage: {
      width: '100%',
      height: '100%',
    },
    shopMarkerInitial: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    shopMarkerInitialText: {
      fontSize: 20,
      fontWeight: theme.fontWeight.bold,
      color: '#fff',
    },
    shopMarkerBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#fff',
    },
    // 操作ボタン
    controlButtons: {
      position: 'absolute',
      right: 16,
      bottom: 96,
      gap: 12,
    },
    controlButton: {
      backgroundColor: theme.colors.secondary,
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 6,
    },
    // プレビュー
    backdrop: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    previewSheet: {
      backgroundColor: theme.colors.secondary,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    previewTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    previewMeta: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    previewLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    previewLocationText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    previewImage: {
      width: '100%',
      height: 200,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.md,
    },
    previewCaption: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
      lineHeight: 20,
    },
    previewButton: {
      flexDirection: 'row',
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    previewButtonText: {
      color: '#fff',
      fontWeight: theme.fontWeight.bold,
      fontSize: theme.fontSize.md,
    },
    // ショッププレビュー
    shopPreviewInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      flex: 1,
    },
    shopPreviewAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    shopPreviewAvatarPlaceholder: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    shopPreviewAvatarText: {
      fontSize: 24,
      fontWeight: theme.fontWeight.bold,
      color: '#fff',
    },
    shopBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    shopBadgeText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.semibold,
    },
    shopPreviewName: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    shopPreviewUsername: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });