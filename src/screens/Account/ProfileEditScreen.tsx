import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CardyImage from '../../components/common/CardyImage';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, Theme } from '../../theme';
import { useAuth, Profile } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { readUriAsArrayBuffer } from '../../utils/file';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_BUCKET = 'card-images';
const AVATAR_FOLDER = 'avatars';

export const ProfileEditScreen: React.FC = () => {
  const { profile, user, updateProfile } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url || '');
  const [loading, setLoading] = useState(false);

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

  const handleSave = async () => {
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
      };
      if (avatarUrl) {
        updates.avatar_url = avatarUrl;
      }

      const { error } = await updateProfile(updates);

      if (error) {
        Alert.alert('エラー', 'プロフィールの更新に失敗しました');
      } else {
        Alert.alert('✅ 保存完了', 'プロフィールを更新しました', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
        setAvatarUri(avatarUrl || profile?.avatar_url || '');
      }
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
      </ScrollView>
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
  });
