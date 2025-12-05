import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTheme, Theme } from '../../theme';
import CardyImage from '../common/CardyImage';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { readUriAsArrayBuffer } from '../../utils/file';
import { supabase } from '../../lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AccountSwitcherModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profiles, profile: activeProfile, switchProfile, deleteProfile } = useAuth();

  // ✅ profiles が undefined でも必ず [] にする
  const profileList = profiles ?? [];

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  const handleSwitch = async (targetId: string) => {
    if (targetId === activeProfile?.id) {
      onClose();
      return;
    }
    await switchProfile(targetId);
    onClose();
  };

  const handleRemove = (targetId: string) => {
    Alert.alert(
      'サブアカウントの削除',
      'このアカウントを削除するとそのカードや設定がすべて消去されます。削除してよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteProfile(targetId);
            if (error) {
              Alert.alert('エラー', error.message ?? 'アカウントの削除に失敗しました');
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>アカウント</Text>

          {profileList.length === 0 ? (
            <Text style={styles.emptyText}>追加されたアカウントはありません</Text>
          ) : (
            profileList.map((account) => (
              <View key={account.id} style={styles.accountRow}>
                {account.avatar_url ? (
                  <CardyImage
                    source={{ uri: account.avatar_url }}
                    style={styles.avatar}
                    resizeMode="cover"
                    alt={`${account.display_name || account.username || 'ユーザー'}のアバター`}
                    priority
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                  </View>
                )}

                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>
                    {account.display_name || account.username || 'ユーザー'}
                  </Text>
                  <Text style={styles.accountHandle}>@{account.username}</Text>
                </View>

                <View style={styles.accountActions}>
                  <TouchableOpacity
                    style={styles.switchButton}
                    onPress={() => handleSwitch(account.id)}
                  >
                    <Text style={styles.switchButtonText}>
                      {account.id === activeProfile?.id ? '現在' : '切り替え'}
                    </Text>
                  </TouchableOpacity>

                  {profileList.length > 1 && account.id !== activeProfile?.id && (
                    <TouchableOpacity onPress={() => handleRemove(account.id)}>
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={theme.colors.textTertiary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setLoginModalVisible(true)}
          >
            <Ionicons name="log-in-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.loginButtonText}>既存アカウントにログイン</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="add" size={20} color={theme.colors.secondary} />
            <Text style={styles.addButtonText}>アカウントを追加</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>

      <AddAccountModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} />
      <LoginAccountModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        onSuccess={onClose}
      />
    </Modal>
  );
};

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = useMemo(() => createAddStyles(theme), [theme]);
  const { createProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setUsername('');
        setDisplayName('');
        setAvatarUri('');
        setLoading(false);
      }, 200);
    }
  }, [visible]);

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
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const filePath = `avatars/${fileName}`;
      const buffer = await readUriAsArrayBuffer(uri);
      const { error } = await supabase.storage
        .from('card-images')
        .upload(filePath, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (error) {
        console.error('アバターアップロードエラー:', error);
        return null;
      }
      const { data } = supabase.storage.from('card-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('アバター処理エラー:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    const trimmedUsername = username.trim();
    const trimmedDisplay = displayName.trim();
    if (!trimmedUsername || !trimmedDisplay) {
      Alert.alert('情報不足', 'ユーザー名と表示名を入力してください');
      return;
    }
    setLoading(true);
    try {
      let uploadedUrl: string | undefined;
      if (avatarUri) {
        const remote = await uploadAvatar(avatarUri);
        uploadedUrl = remote ?? undefined;
      }
      const { error } = await createProfile({
        username: trimmedUsername,
        displayName: trimmedDisplay,
        avatarUrl: uploadedUrl,
      });
      if (error) {
        Alert.alert('エラー', error.message ?? 'アカウントの追加に失敗しました');
      } else {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>アカウントを追加</Text>
          <ScrollView contentContainerStyle={styles.form}>
            <TouchableOpacity style={styles.avatarButton} onPress={pickImage}>
              {avatarUri ? (
                <CardyImage
                  source={{ uri: avatarUri }}
                  style={styles.previewAvatar}
                  contentFit="cover"
                  alt="新規アバター"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera" size={28} color={theme.colors.textSecondary} />
                  <Text style={styles.avatarPlaceholderText}>アイコンを選択</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ユーザー名</Text>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                placeholder="snap_user"
                placeholderTextColor={theme.colors.textTertiary}
                value={username}
                onChangeText={setUsername}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>表示名</Text>
              <TextInput
                style={styles.input}
                placeholder="Cardy User"
                placeholderTextColor={theme.colors.textTertiary}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.secondary} />
            ) : (
              <Text style={styles.submitButtonText}>作成する</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    modal: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: theme.spacing.sm,
    },
    avatarPlaceholder: {
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountInfo: {
      flex: 1,
    },
    accountName: {
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
    accountHandle: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.sm,
    },
    accountActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    switchButton: {
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    switchButtonText: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.semibold,
    },
    loginButton: {
      marginTop: theme.spacing.lg,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    loginButtonText: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.semibold,
    },
    addButton: {
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.full,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    addButtonText: {
      color: theme.colors.secondary,
      fontWeight: theme.fontWeight.bold,
    },
    closeButton: {
      marginTop: theme.spacing.md,
      alignItems: 'center',
    },
    closeButtonText: {
      color: theme.colors.textSecondary,
    },
  });

const createAddStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    modal: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    form: {
      gap: theme.spacing.md,
    },
    inputGroup: {
      gap: theme.spacing.xs,
    },
    inputLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      color: theme.colors.textPrimary,
    },
    submitButton: {
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    submitButtonText: {
      color: theme.colors.secondary,
      fontWeight: theme.fontWeight.bold,
    },
    closeButton: {
      marginTop: theme.spacing.sm,
      alignItems: 'center',
    },
    closeButtonText: {
      color: theme.colors.textSecondary,
    },
    avatarButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
    },
    avatarPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    avatarPlaceholderText: {
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.xs,
    },
    previewAvatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
  });

const createLoginStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    modal: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    inputGroup: {
      gap: theme.spacing.xs,
    },
    inputLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      color: theme.colors.textPrimary,
    },
    submitButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    submitButtonText: {
      color: theme.colors.secondary,
      fontWeight: theme.fontWeight.bold,
    },
    closeButton: {
      alignItems: 'center',
    },
    closeButtonText: {
      color: theme.colors.textSecondary,
    },
  });

interface LoginAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LoginAccountModal: React.FC<LoginAccountModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);
  const { signIn, focusProfileByUsername, user } = useAuth();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setPassword('');
        setPasswordConfirm('');
        setUsername('');
        setLoading(false);
      }, 200);
    }
  }, [visible]);

  const handleLogin = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password || !passwordConfirm) {
      Alert.alert('情報不足', 'ユーザー名とパスワードを入力してください');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('パスワード不一致', '確認用のパスワードが一致していません');
      return;
    }
    const baseEmail = user?.email?.trim();
    if (!baseEmail) {
      Alert.alert('エラー', 'メールアドレス情報が見つからないためログインできません');
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(baseEmail, password);
      if (error) {
        Alert.alert('エラー', error.message ?? 'ログインに失敗しました');
      } else {
        const focused = await focusProfileByUsername(trimmedUsername);
        if (!focused) {
          Alert.alert('ユーザー名が見つかりません', '入力したユーザー名のプロフィールは存在しません');
          return;
        }
        onClose();
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>既存アカウントにログイン</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>パスワード</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textTertiary}
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>パスワード（確認）</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="確認のため再入力"
              placeholderTextColor={theme.colors.textTertiary}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>切り替えるユーザー名</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              placeholder="my_cardy_name"
              placeholderTextColor={theme.colors.textTertiary}
              value={username}
              onChangeText={setUsername}
            />
          </View>
          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.secondary} />
            ) : (
              <Text style={styles.submitButtonText}>ログイン</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
