import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CardyImage from '../../components/common/CardyImage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTheme, Theme } from '../../theme';
import { useAuth, Profile } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { readUriAsArrayBuffer } from '../../utils/file';
import { Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_BUCKET = 'card-images';
const AVATAR_FOLDER = 'avatars';

const isWebPlatform = Platform.OS === 'web';

// ★ 近くの場所のダミーデータ型
type NearbyPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
};

export const ProfileEditScreen: React.FC = () => {
  const { profile, user, updateProfile } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url || '');
  const [loading, setLoading] = useState(false);

  // ★ ショップアカウント関連の状態
  const [isShopAccount, setIsShopAccount] = useState(profile?.isShopAccount || false);
  const [shopName, setShopName] = useState(profile?.shopName || '');
  const [shopAddress, setShopAddress] = useState(profile?.shopAddress || '');
  const [shopLatitude, setShopLatitude] = useState(profile?.shopLatitude);
  const [shopLongitude, setShopLongitude] = useState(profile?.shopLongitude);

  // ★ 位置情報モーダル関連
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // ★ プロフィール変更時に状態を更新
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUri(profile.avatar_url || '');
      setIsShopAccount(profile.isShopAccount || false);
      setShopName(profile.shopName || '');
      setShopAddress(profile.shopAddress || '');
      setShopLatitude(profile.shopLatitude);
      setShopLongitude(profile.shopLongitude);
    }
  }, [profile]);

  // ★ 位置情報取得（初回のみ）
  useEffect(() => {
    if (isWebPlatform) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('位置情報の権限が拒否されました');
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location);
      } catch (error) {
        console.error('位置情報取得エラー:', error);
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  const uploadAvatar = async (uri: string): Promise<string | null> => {
    try {
      const fileName = `${user?.id}-${Date.now()}.jpg`;
      const filePath = `${AVATAR_FOLDER}/${fileName}`;

      const fileBuffer = await readUriAsArrayBuffer(uri);

      const { data, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('アバターアップロードエラー:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('アバター処理エラー:', error);
      return null;
    }
  };

  // ★ 位置情報モーダルを開く
  const handleOpenLocationModal = async () => {
    if (isWebPlatform) {
      Alert.alert('非対応', 'Web版では位置情報機能を使用できません');
      return;
    }

    if (!currentLocation) {
      Alert.alert('位置情報が取得できません', '位置情報の使用を許可してください');
      return;
    }

    setLoadingLocation(true);
    setLocationModalVisible(true);

    // TODO: 実際のGoogle Places API呼び出しに置き換える
    setTimeout(() => {
      const dummyPlaces: NearbyPlace[] = [
        {
          id: 'place-1',
          name: 'スターバックス 渋谷店',
          latitude: currentLocation.coords.latitude + 0.001,
          longitude: currentLocation.coords.longitude + 0.001,
          address: '東京都渋谷区道玄坂1-2-3',
        },
        {
          id: 'place-2',
          name: 'ブルーボトルコーヒー 青山店',
          latitude: currentLocation.coords.latitude + 0.002,
          longitude: currentLocation.coords.longitude - 0.001,
          address: '東京都港区南青山3-13-14',
        },
        {
          id: 'place-3',
          name: 'カフェ・ド・パリ',
          latitude: currentLocation.coords.latitude - 0.001,
          longitude: currentLocation.coords.longitude + 0.002,
          address: '東京都渋谷区恵比寿1-5-8',
        },
      ];
      setNearbyPlaces(dummyPlaces);
      setLoadingLocation(false);
    }, 1000);
  };

  // ★ 現在地を選択
  const handleSelectCurrentLocation = () => {
    if (!currentLocation) return;

    setShopLatitude(currentLocation.coords.latitude);
    setShopLongitude(currentLocation.coords.longitude);
    setShopName(shopName || '現在地のお店');
    setShopAddress('現在地');
    setLocationModalVisible(false);

    Alert.alert('✅ 位置情報を設定', '現在地をショップ位置として設定しました');
  };

  // ★ 近くの場所を選択
  const handleSelectPlace = (place: NearbyPlace) => {
    setShopLatitude(place.latitude);
    setShopLongitude(place.longitude);
    setShopName(place.name);
    setShopAddress(place.address || '');
    setLocationModalVisible(false);

    Alert.alert('✅ 位置情報を設定', `${place.name} をショップ位置として設定しました`);
  };

  // ★ ショップ位置情報をクリア
  const handleClearShopLocation = () => {
    Alert.alert(
      '位置情報を削除',
      'ショップの位置情報を削除してもよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setShopLatitude(undefined);
            setShopLongitude(undefined);
            setShopName('');
            setShopAddress('');
            Alert.alert('✅ 削除完了', 'ショップの位置情報を削除しました');
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    // ★ バリデーション
    if (isShopAccount && !shopName.trim()) {
      Alert.alert('入力エラー', 'ショップアカウントの場合、ショップ名は必須です');
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = profile?.avatar_url;

      const isLocalImage =
        avatarUri && (avatarUri.startsWith('file://') || avatarUri.startsWith('data:'));
      if (avatarUri && isLocalImage) {
        const uploadedUrl = await uploadAvatar(avatarUri);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      } else if (avatarUri && avatarUri !== avatarUrl) {
        avatarUrl = avatarUri;
      }

      const updates: Partial<Profile> = {
        display_name: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        // ★ ショップアカウント情報を追加
        isShopAccount,
        shopName: isShopAccount ? shopName.trim() : undefined,
        shopAddress: isShopAccount ? shopAddress.trim() : undefined,
        shopLatitude: isShopAccount ? shopLatitude : undefined,
        shopLongitude: isShopAccount ? shopLongitude : undefined,
      };

      if (avatarUrl) {
        updates.avatar_url = avatarUrl;
      }

      await updateProfile(updates);

      Alert.alert('✅ 保存完了', 'プロフィールを更新しました', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
      setAvatarUri(avatarUrl || profile?.avatar_url || '');
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プロフィール編集</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
            {loading ? '保存中...' : '完了'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* アバター */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {avatarUri ? (
              <CardyImage
                source={{ uri: avatarUri }}
                style={styles.avatar}
                contentFit="cover"
                alt="編集中のアバター"
                priority
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={60} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.avatarOverlay}>
              <Ionicons name="camera" size={24} color={theme.colors.secondary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>タップして変更</Text>
        </View>

        {/* 表示名 */}
        <View style={styles.section}>
          <Text style={styles.label}>表示名</Text>
          <TextInput
            style={styles.input}
            placeholder="表示名を入力"
            placeholderTextColor={theme.colors.textTertiary}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        {/* ユーザー名（変更不可） */}
        <View style={styles.section}>
          <Text style={styles.label}>ユーザー名</Text>
          <View style={styles.disabledInput}>
            <Text style={styles.disabledInputText}>@{profile?.username}</Text>
          </View>
          <Text style={styles.hint}>ユーザー名は変更できません</Text>
        </View>

        {/* 自己紹介 */}
        <View style={styles.section}>
          <Text style={styles.label}>自己紹介</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="自己紹介を入力"
            placeholderTextColor={theme.colors.textTertiary}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/150</Text>
        </View>

        {/* ★ ショップアカウント設定 */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="storefront" size={24} color={theme.colors.accent} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>ショップアカウント</Text>
                <Text style={styles.toggleDescription}>
                  お店として地図に表示されます
                </Text>
              </View>
            </View>
            <Switch
              value={isShopAccount}
              onValueChange={setIsShopAccount}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.accent,
              }}
              thumbColor={theme.colors.secondary}
            />
          </View>
        </View>

        {/* ★ ショップ情報（ショップアカウントの場合のみ表示） */}
        {isShopAccount && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>ショップ名 *</Text>
              <TextInput
                style={styles.input}
                placeholder="例: スターバックス 渋谷店"
                placeholderTextColor={theme.colors.textTertiary}
                value={shopName}
                onChangeText={setShopName}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>住所</Text>
              <TextInput
                style={styles.input}
                placeholder="例: 東京都渋谷区道玄坂1-2-3"
                placeholderTextColor={theme.colors.textTertiary}
                value={shopAddress}
                onChangeText={setShopAddress}
              />
            </View>

            {/* ★ ショップ位置情報設定 */}
            {!isWebPlatform && (
              <View style={styles.section}>
                <Text style={styles.label}>ショップ位置情報</Text>
                
                {shopLatitude && shopLongitude ? (
                  <View style={styles.locationInfo}>
                    <View style={styles.locationInfoHeader}>
                      <Ionicons name="location" size={20} color={theme.colors.accentGreen} />
                      <Text style={styles.locationInfoTitle}>位置情報設定済み</Text>
                    </View>
                    <Text style={styles.locationInfoText}>
                      {shopName || 'ショップ'}
                    </Text>
                    {shopAddress && (
                      <Text style={styles.locationInfoSubtext}>{shopAddress}</Text>
                    )}
                    <Text style={styles.locationInfoCoords}>
                      緯度: {shopLatitude.toFixed(6)}, 経度: {shopLongitude.toFixed(6)}
                    </Text>
                    
                    <View style={styles.locationActions}>
                      <TouchableOpacity
                        style={[styles.locationButton, styles.locationButtonSecondary]}
                        onPress={handleOpenLocationModal}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil" size={18} color={theme.colors.accent} />
                        <Text style={styles.locationButtonSecondaryText}>変更</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.locationButton, styles.locationButtonDanger]}
                        onPress={handleClearShopLocation}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash" size={18} color={theme.colors.error} />
                        <Text style={styles.locationButtonDangerText}>削除</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.locationAddButton}
                    onPress={handleOpenLocationModal}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="map-outline" size={20} color={theme.colors.accent} />
                    <Text style={styles.locationAddButtonText}>位置情報を設定</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.hint}>
                  ショップの位置情報を設定すると、地図上にお店が表示されます
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ★ 位置情報選択モーダル */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationModal}>
            <View style={styles.locationModalHeader}>
              <Text style={styles.locationModalTitle}>ショップ位置を設定</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {loadingLocation ? (
              <View style={styles.locationModalLoading}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
                <Text style={styles.locationModalLoadingText}>近くの場所を検索中...</Text>
              </View>
            ) : (
              <ScrollView style={styles.locationModalContent}>
                {/* 現在地オプション */}
                <TouchableOpacity
                  style={styles.locationOption}
                  onPress={handleSelectCurrentLocation}
                  activeOpacity={0.7}
                >
                  <View style={styles.locationOptionIcon}>
                    <Ionicons name="navigate" size={24} color={theme.colors.accent} />
                  </View>
                  <View style={styles.locationOptionText}>
                    <Text style={styles.locationOptionName}>現在地</Text>
                    <Text style={styles.locationOptionAddress}>
                      {currentLocation
                        ? `${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`
                        : '位置情報を取得中...'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 近くの場所 */}
                {nearbyPlaces.length > 0 && (
                  <>
                    <Text style={styles.locationSectionTitle}>近くの場所</Text>
                    {nearbyPlaces.map((place) => (
                      <TouchableOpacity
                        key={place.id}
                        style={styles.locationOption}
                        onPress={() => handleSelectPlace(place)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.locationOptionIcon}>
                          <Ionicons name="location" size={24} color={theme.colors.textSecondary} />
                        </View>
                        <View style={styles.locationOptionText}>
                          <Text style={styles.locationOptionName}>{place.name}</Text>
                          {place.address && (
                            <Text style={styles.locationOptionAddress}>{place.address}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                <Text style={styles.locationModalHint}>
                  ※ 現在はダミーデータを表示しています。Google Places APIと統合後、実際の近くの店舗が表示されます。
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) =>
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
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    saveButton: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.accent,
    },
    saveButtonDisabled: {
      color: theme.colors.textTertiary,
    },
    content: {
      flex: 1,
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      backgroundColor: theme.colors.secondary,
      marginBottom: theme.spacing.sm,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.colors.secondary,
    },
    avatarHint: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
    },
    section: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.secondary,
      marginBottom: theme.spacing.sm,
    },
    label: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    input: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.cardBackground,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textArea: {
      minHeight: 100,
    },
    disabledInput: {
      backgroundColor: theme.colors.cardBackground,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      opacity: 0.6,
    },
    disabledInputText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    hint: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.xs,
    },
    charCount: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
      textAlign: 'right',
      marginTop: theme.spacing.xs,
    },
    // ★ ショップアカウントトグル
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.md,
    },
    toggleTextContainer: {
      flex: 1,
    },
    toggleTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    toggleDescription: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    // ★ 位置情報表示
    locationInfo: {
      backgroundColor: theme.colors.cardBackground,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    locationInfoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    locationInfoTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.accentGreen,
    },
    locationInfoText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    locationInfoSubtext: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    locationInfoCoords: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
      marginBottom: theme.spacing.md,
    },
    locationActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    locationButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
    },
    locationButtonSecondary: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.accent,
    },
    locationButtonSecondaryText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.accent,
    },
    locationButtonDanger: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.error,
    },
    locationButtonDangerText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.error,
    },
    // ★ 位置情報追加ボタン
    locationAddButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    locationAddButtonText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.semibold,
    },
    bottomSpacer: {
      height: 40,
    },
    // ★ 位置情報モーダル
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    locationModal: {
      backgroundColor: theme.colors.secondary,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      maxHeight: '80%',
    },
    locationModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    locationModalTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    locationModalLoading: {
      padding: theme.spacing.xl * 2,
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    locationModalLoadingText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    locationModalContent: {
      padding: theme.spacing.md,
    },
    locationSectionTitle: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    locationOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    locationOptionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    locationOptionText: {
      flex: 1,
    },
    locationOptionName: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    locationOptionAddress: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    locationModalHint: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
  });