// src/screens/EditScreen/EditScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useTheme, Theme } from '../../theme';
import { useSnapCardContext } from '../../contexts/SnapCardContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type EditScreenRouteProp = RouteProp<
  {
    EditScreen: {
      cardId?: string;
      mode: 'create' | 'edit';
      initialImageUri?: string;
    };
  },
  'EditScreen'
>;

export const EditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EditScreenRouteProp>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { profile } = useAuth();
  const { cards, addCard, updateCard } = useSnapCardContext();

  const [imageUri, setImageUri] = useState<string | undefined>(
    route.params?.initialImageUri
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEditMode = route.params?.mode === 'edit';
  const cardId = route.params?.cardId;

  // 編集モードの場合、既存データをロード
  useEffect(() => {
    if (isEditMode && cardId) {
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        setImageUri(card.imageUri);
        setTitle(card.title || '');
        setDescription(card.description || '');
        setIsPublic(card.isPublic);
      }
    }
  }, [isEditMode, cardId, cards]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', 'フォトライブラリへのアクセスを許可してください。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleOpenStoryEditor = () => {
    navigation.navigate('StoryEditor' as never, {
      imageUri,
      mode: 'story',
    } as never);
  };

  const handleOpenCardEditor = () => {
    navigation.navigate('CardEditor' as never, {
      imageUri,
      mode: 'card',
    } as never);
  };

  const uploadImage = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${profile?.id}_${Date.now()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('card-images')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('card-images').getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!imageUri) {
      Alert.alert('エラー', '画像を選択してください');
      return;
    }

    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    try {
      setSaving(true);

      let finalImageUri = imageUri;

      // ローカル画像の場合はアップロード
      if (imageUri.startsWith('file://') || !imageUri.startsWith('http')) {
        finalImageUri = await uploadImage(imageUri);
      }

      if (isEditMode && cardId) {
        // 更新
        await updateCard(cardId, {
          imageUri: finalImageUri,
          title: title.trim(),
          description: description.trim() || undefined,
          isPublic,
        });

        Alert.alert('✅ 更新完了', 'カードを更新しました', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        // 新規作成
        await addCard({
          imageUri: finalImageUri,
          userId: profile?.id || '',
          title: title.trim(),
          description: description.trim() || undefined,
          isPublic,
          mediaType: 'image',
        });

        Alert.alert('✅ 保存完了', 'カードを作成しました', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MainTabs' as never),
          },
        ]);
      }
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', 'カードの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'カードを編集' : '新しいカード'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 画像プレビュー */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>画像</Text>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
                <TouchableOpacity
                  style={styles.imageChangeButton}
                  onPress={handlePickImage}
                >
                  <Ionicons name="camera" size={20} color={theme.colors.secondary} />
                  <Text style={styles.imageChangeButtonText}>変更</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePlaceholder} onPress={handlePickImage}>
                <Ionicons name="image-outline" size={48} color={theme.colors.textTertiary} />
                <Text style={styles.imagePlaceholderText}>画像を選択</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* エディターボタン */}
          {imageUri && (
            <View style={styles.editorSection}>
              <Text style={styles.sectionTitle}>エディターで編集</Text>
              <View style={styles.editorButtons}>
                <TouchableOpacity
                  style={styles.editorButton}
                  onPress={handleOpenStoryEditor}
                >
                  <Ionicons name="phone-portrait-outline" size={32} color={theme.colors.accent} />
                  <Text style={styles.editorButtonTitle}>ストーリーエディター</Text>
                  <Text style={styles.editorButtonDescription}>Instagram風の縦長フォーマット</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editorButton}
                  onPress={handleOpenCardEditor}
                >
                  <Ionicons name="square-outline" size={32} color={theme.colors.accent} />
                  <Text style={styles.editorButtonTitle}>カードエディター</Text>
                  <Text style={styles.editorButtonDescription}>Canva風の正方形フォーマット</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* タイトル */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>タイトル *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="タイトルを入力"
              placeholderTextColor={theme.colors.textTertiary}
              maxLength={100}
            />
          </View>

          {/* 説明 */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>説明</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="説明を入力（任意）"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          {/* 公開設定 */}
          <View style={styles.switchSection}>
            <View style={styles.switchLabel}>
              <Ionicons
                name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                size={20}
                color={theme.colors.textPrimary}
              />
              <Text style={styles.sectionTitle}>公開する</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.accent,
              }}
              thumbColor={theme.colors.secondary}
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.infoText}>
              {isPublic
                ? '公開設定にすると、他のユーザーにカードが表示されます'
                : '非公開設定にすると、自分だけがカードを閲覧できます'}
            </Text>
          </View>
        </ScrollView>
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
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerButton: {
      padding: theme.spacing.sm,
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    saveButton: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.accent,
    },
    saveButtonText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.secondary,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    imageSection: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    imagePreviewContainer: {
      position: 'relative',
      aspectRatio: 1,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.cardBackground,
    },
    imagePreview: {
      width: '100%',
      height: '100%',
    },
    imageChangeButton: {
      position: 'absolute',
      bottom: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.accent,
    },
    imageChangeButtonText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.secondary,
    },
    imagePlaceholder: {
      aspectRatio: 1,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    imagePlaceholderText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textTertiary,
    },
    editorSection: {
      marginBottom: theme.spacing.xl,
    },
    editorButtons: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    editorButton: {
      flex: 1,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    editorButtonTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    editorButtonDescription: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    inputSection: {
      marginBottom: theme.spacing.lg,
    },
    input: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    switchSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    switchLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.accent + '11',
      borderRadius: theme.borderRadius.md,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.accent,
      marginBottom: theme.spacing.xl,
    },
    infoText: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
  });
