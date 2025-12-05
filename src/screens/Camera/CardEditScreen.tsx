import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CardyImage from '../../components/common/CardyImage';
import CardyVideo from '../../components/common/CardyVideo';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useTheme, Theme } from '../../theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSnapCardContext } from '../../contexts/SnapCardContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAlbumContext } from '../../contexts/AlbumContext';
import { AlbumPickerModal } from '../../components/modals/AlbumPickerModal';
import { ThumbnailEditor } from '../../components/cards/ThumbnailEditor';
import { CardMediaType } from '../../types/card';

const isWebPlatform = Platform.OS === 'web';
const supportsVideoThumbnails = !isWebPlatform;

type NativeSliderType = typeof import('@react-native-community/slider')['default'];
const NativeSlider: NativeSliderType | null = !isWebPlatform
  ? require('@react-native-community/slider').default
  : null;

const formatDurationLabel = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

type CardEditParamList = {
  CardEdit: {
    mediaUri: string;
    mediaType?: 'photo' | 'video';
  };
};

type CardEditScreenRouteProp = RouteProp<CardEditParamList, 'CardEdit'>;

export const CardEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CardEditScreenRouteProp>();
  const { mediaUri, mediaType = 'photo' } = route.params;

  const { addCard } = useSnapCardContext();
  const { albums, addAlbum, addCardToAlbum } = useAlbumContext();
  const { user, profile } = useAuth();

  const activeProfileId = profile?.id ?? user?.id ?? null;

  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isVideoMedia = mediaType === 'video';
  const cardMediaType: CardMediaType = isVideoMedia ? 'video' : 'image';

  const [thumbnailEditorVisible, setThumbnailEditorVisible] = useState(false);
  const [customThumbnailUri, setCustomThumbnailUri] = useState<string | undefined>(undefined);

  const [previewImageUri, setPreviewImageUri] = useState<string | undefined>(
    isVideoMedia ? undefined : mediaUri,
  );
  const [thumbnailGenerating, setThumbnailGenerating] = useState(
    isVideoMedia && supportsVideoThumbnails,
  );
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [thumbnailTime, setThumbnailTime] = useState(0);

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [albumPickerVisible, setAlbumPickerVisible] = useState(false);

  const sliderStepMs = 500;

  const generateThumbnailAt = useCallback(
    async (timeMs: number) => {
      if (!isVideoMedia || !supportsVideoThumbnails) {
        setThumbnailGenerating(false);
        if (!supportsVideoThumbnails) {
          setThumbnailError('この環境では動画サムネイル生成はサポートされていません。');
        }
        return;
      }

      setThumbnailGenerating(true);

      try {
        const normalized = Math.max(0, Math.floor(timeMs));
        const { uri } = await VideoThumbnails.getThumbnailAsync(mediaUri, {
          time: normalized,
          quality: 0.5,
        });
        setPreviewImageUri(uri);
        setThumbnailError(null);
      } catch (error) {
        console.warn('サムネイル生成エラー:', error);
        setThumbnailError('サムネイルを生成できませんでした');
      } finally {
        setThumbnailGenerating(false);
      }
    },
    [isVideoMedia, mediaUri],
  );

  useEffect(() => {
    if (!isVideoMedia) {
      setThumbnailEditorVisible(true);
      return;
    }

    setThumbnailTime(0);

    if (supportsVideoThumbnails) {
      void generateThumbnailAt(0);
    } else {
      setThumbnailGenerating(false);
      setThumbnailError('この環境では動画サムネイル生成はサポートされていません。');
    }
  }, [generateThumbnailAt, isVideoMedia, mediaUri]);

  const handleThumbnailSlide = (value: number) => {
    setThumbnailTime(value);
  };

  const handleThumbnailSlideComplete = (value: number) => {
    setThumbnailTime(value);
    void generateThumbnailAt(value);
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleThumbnailConfirm = (thumbnailUri: string) => {
    setCustomThumbnailUri(thumbnailUri);
    setThumbnailEditorVisible(false);
  };

  const handleEditThumbnail = () => {
    setThumbnailEditorVisible(true);
  };

  const handleSave = async () => {
    if (!user || !activeProfileId) {
      Alert.alert('エラー', 'アカウント情報を取得できませんでした');
      return;
    }

    try {
      const normalizedTitle = title.trim() || '無題';

      const coverImageUri = isVideoMedia ? previewImageUri : mediaUri;
      const finalThumbnailUri = customThumbnailUri ?? coverImageUri;

      const newCard = await addCard({
        imageUri: coverImageUri,
        videoUri: isVideoMedia ? mediaUri : undefined,
        thumbnailUrl: finalThumbnailUri,
        mediaType: cardMediaType,
        title: normalizedTitle,
        caption: caption.trim() || undefined,
        location: location.trim() || undefined,
        tags,
        userId: activeProfileId,
        isPublic,
      });

      if (selectedAlbumId) {
        await addCardToAlbum(selectedAlbumId, newCard);
      }

      Alert.alert('✅ 保存完了', 'カードを保存しました', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('MainTabs' as never);
          },
        },
      ]);
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', 'カードの保存に失敗しました');
    }
  };

  const selectedAlbumName = selectedAlbumId
    ? albums.find(album => album.id === selectedAlbumId)?.name
    : undefined;

  const handleAlbumCreate = async (name: string) => {
    const baseCover = customThumbnailUri ?? previewImageUri ?? (!isVideoMedia ? mediaUri : undefined);
    const album = await addAlbum(name, baseCover);
    setSelectedAlbumId(album.id);
    setAlbumPickerVisible(false);
    return album;
  };

  const handleAlbumSelect = async (albumId: string) => {
    setSelectedAlbumId(albumId);
    setAlbumPickerVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>新しいカード</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isVideoMedia ? (
            <View style={styles.videoWrapper}>
              <CardyVideo
                source={{ uri: mediaUri }}
                style={styles.videoPreview}
                resizeMode="cover"
                shouldPlay={false}
                isLooping
                useNativeControls
                onLoad={({ durationMillis }) => {
                  if (durationMillis) {
                    setVideoDuration(durationMillis);
                  }
                }}
              />
              {thumbnailGenerating && (
                <View style={styles.videoOverlay}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.videoOverlayText}>サムネイル生成中...</Text>
                </View>
              )}
            </View>
          ) : (
            <CardyImage
              source={{ uri: customThumbnailUri ?? mediaUri }}
              style={styles.image}
              contentFit="cover"
              alt="編集中のカード"
              priority
            />
          )}

          <TouchableOpacity
            style={styles.thumbnailEditButton}
            onPress={handleEditThumbnail}
            activeOpacity={0.7}
          >
            <Ionicons name="crop-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.thumbnailEditText}>
              {customThumbnailUri ? 'サムネイルを再編集' : 'サムネイルを編集'}
            </Text>
          </TouchableOpacity>

          {isVideoMedia && (
            <Text style={styles.videoHint}>
              {thumbnailError ??
                '一覧ではサムネイル、詳細では動画が再生されます。'}
            </Text>
          )}

          {isVideoMedia && videoDuration && supportsVideoThumbnails ? (
            <View style={styles.thumbnailSelector}>
              <View style={styles.thumbnailHeader}>
                <Text style={styles.thumbnailLabel}>サムネイル位置</Text>
                <Text style={styles.thumbnailTime}>
                  {formatDurationLabel(thumbnailTime / 1000)}
                </Text>
              </View>
              {isWebPlatform ? null : NativeSlider ? (
                <NativeSlider
                  style={styles.thumbnailSlider}
                  minimumValue={0}
                  maximumValue={videoDuration}
                  step={sliderStepMs}
                  value={thumbnailTime}
                  onValueChange={handleThumbnailSlide}
                  onSlidingComplete={handleThumbnailSlideComplete}
                  minimumTrackTintColor={theme.colors.accent}
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor={theme.colors.accent}
                />
              ) : null}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.label}>タイトル</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="カードのタイトル"
              placeholderTextColor={theme.colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              returnKeyType="done"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>キャプション</Text>
            <TextInput
              style={styles.textInput}
              placeholder="この写真・動画について..."
              placeholderTextColor={theme.colors.textTertiary}
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>場所</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="location-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="場所を追加"
                placeholderTextColor={theme.colors.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>タグ</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="タグを追加"
                placeholderTextColor={theme.colors.textTertiary}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
              {tagInput.length > 0 && (
                <TouchableOpacity onPress={addTag}>
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={theme.colors.accent}
                  />
                </TouchableOpacity>
              )}
            </View>

            {tags.length > 0 && (
              <View style={styles.tagsList}>
                {tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                    <TouchableOpacity onPress={() => removeTag(tag)}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>アルバム</Text>
            <TouchableOpacity
              style={styles.albumButton}
              onPress={() => setAlbumPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="albums-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.albumButtonText}>
                {selectedAlbumName
                  ? `${selectedAlbumName} に追加`
                  : 'アルバムを選択'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.publicToggleContainer}
            onPress={() => setIsPublic(!isPublic)}
            activeOpacity={0.7}
          >
            <View style={styles.publicToggleInfo}>
              <Ionicons
                name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                size={24}
                color={theme.colors.textPrimary}
              />
              <View style={styles.publicToggleText}>
                <Text style={styles.publicToggleTitle}>
                  {isPublic ? '公開' : '非公開'}
                </Text>
                <Text style={styles.publicToggleDescription}>
                  {isPublic
                    ? 'みんなのカードに表示されます'
                    : 'マイカードのみに表示されます'}
                </Text>
              </View>
            </View>
            <View style={[styles.toggle, isPublic && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleCircle,
                  isPublic && styles.toggleCircleActive,
                ]}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <AlbumPickerModal
          visible={albumPickerVisible}
          albums={albums}
          onSelect={handleAlbumSelect}
          onCreateAlbum={handleAlbumCreate}
          onClose={() => setAlbumPickerVisible(false)}
        />

        <ThumbnailEditor
          visible={thumbnailEditorVisible}
          imageUri={isVideoMedia ? (previewImageUri ?? mediaUri) : mediaUri}
          onCancel={() => {
            setThumbnailEditorVisible(false);
            if (!isVideoMedia && !customThumbnailUri) {
              navigation.goBack();
            }
          }}
          onConfirm={handleThumbnailConfirm}
        />
      </KeyboardAvoidingView>
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
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
    content: {
      flex: 1,
    },
    image: {
      width: '100%',
      height: 300,
      backgroundColor: theme.colors.cardBackground,
    },
    videoWrapper: {
      width: '100%',
      height: 300,
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      backgroundColor: '#000',
      marginBottom: theme.spacing.xs,
    },
    videoPreview: {
      width: '100%',
      height: '100%',
    },
    videoOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    videoOverlayText: {
      color: '#fff',
      marginTop: theme.spacing.xs,
      fontSize: theme.fontSize.sm,
    },
    videoHint: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.sm,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    thumbnailEditButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    thumbnailEditText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.semibold,
    },
    thumbnailSelector: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    thumbnailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    thumbnailLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    thumbnailTime: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.medium,
    },
    thumbnailSlider: {
      width: '100%',
      height: 32,
    },
    section: {
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    label: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    textInput: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.cardBackground,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    titleInput: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.cardBackground,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.cardBackground,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    input: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      marginLeft: theme.spacing.sm,
    },
    tagsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: theme.spacing.md,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    tagText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.secondary,
      marginRight: theme.spacing.xs,
    },
    albumButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.cardBackground,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    albumButtonText: {
      marginLeft: theme.spacing.sm,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.md,
    },
    publicToggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.secondary,
      marginBottom: theme.spacing.sm,
    },
    publicToggleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    publicToggleText: {
      marginLeft: theme.spacing.md,
      flex: 1,
    },
    publicToggleTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    publicToggleDescription: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    toggle: {
      width: 51,
      height: 31,
      borderRadius: 15.5,
      backgroundColor: theme.colors.cardBackground,
      padding: 2,
      justifyContent: 'center',
    },
    toggleActive: {
      backgroundColor: theme.colors.accent,
    },
    toggleCircle: {
      width: 27,
      height: 27,
      borderRadius: 13.5,
      backgroundColor: theme.colors.secondary,
    },
    toggleCircleActive: {
      alignSelf: 'flex-end',
    },
    bottomSpacer: {
      height: 40,
    },
  });
