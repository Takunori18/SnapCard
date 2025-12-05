import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CardyImage from '../../components/common/CardyImage';
import { useTheme, Theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';

const LIGHT_LOGO = require('../../../assets/images/black.png');
const DARK_LOGO = require('../../../assets/images/white.png');

export const LoginScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signUp, signIn, signInWithGoogle, signInWithApple } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8 && /^[a-zA-Z0-9]+$/.test(password);
  };

  const validateUsername = (username: string) => {
    return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
  };

  const handleEmailAuth = async () => {
    if (!validateEmail(email)) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('エラー', 'パスワードは英数字8文字以上で入力してください');
      return;
    }

    if (isSignUp) {
      if (!validateUsername(username)) {
        Alert.alert('エラー', 'ユーザー名は英数字とアンダースコアで3文字以上入力してください');
        return;
      }

      if (!displayName.trim()) {
        Alert.alert('エラー', '表示名を入力してください');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, username, displayName);
        if (error) {
          const message =
            error.message?.includes('already registered') || error.message?.includes('User already registered')
              ? 'このメールアドレスは既に登録済みです。同じメールでプロフィールを追加する場合はアカウント画面の「アカウントを追加」から実行してください。'
              : error.message;
          Alert.alert('登録エラー', message);
        } else {
          Alert.alert(
            '確認メール送信',
            'メールアドレスに確認リンクを送信しました。メールを確認してアカウントを有効化してください。'
          );
          setIsSignUp(false);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          Alert.alert('ログインエラー', error.message);
        }
      }
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert('Googleログインエラー', error.message);
      }
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithApple();
      if (error) {
        Alert.alert('Appleログインエラー', error.message);
      }
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ロゴ */}
          <View style={styles.logoContainer}>
            <CardyImage
              source={theme.isDark ? DARK_LOGO : LIGHT_LOGO}
              style={styles.logoImage}
              contentFit="contain"
              accessibilityRole="image"
              accessibilityLabel="SnapCardロゴ"
              alt="SnapCardロゴ"
              priority
            />
            <Text style={styles.tagline}>思い出をカードに</Text>
          </View>

          {/* フォーム */}
          <View style={styles.formContainer}>
            {isSignUp && (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="ユーザー名（英数字_）"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="text-outline" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="表示名"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={displayName}
                    onChangeText={setDisplayName}
                  />
                </View>
              </>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                placeholderTextColor={theme.colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="パスワード（英数字8文字以上）"
                placeholderTextColor={theme.colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.switchText}>
                {isSignUp ? 'アカウントをお持ちの方はこちら' : '新規登録はこちら'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ソーシャルログイン */}
          {!isSignUp && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>または</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.googleButton]}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Ionicons name="logo-google" size={20} color={theme.colors.secondary} />
                  <Text style={styles.socialButtonText}>Googleでログイン</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.appleButton]}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                >
                  <Ionicons name="logo-apple" size={20} color={theme.colors.secondary} />
                  <Text style={styles.socialButtonText}>Appleでログイン</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl * 2,
    },
    logoImage: {
      width: 1440,
      height: 320,
    },
    tagline: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    formContainer: {
      marginBottom: theme.spacing.xl,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    input: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      marginLeft: theme.spacing.sm,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.md,
    },
    primaryButton: {
      backgroundColor: theme.colors.accent,
      marginTop: theme.spacing.md,
    },
    primaryButtonText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.secondary,
    },
    switchText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accent,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.xl,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginHorizontal: theme.spacing.md,
    },
    socialContainer: {
      gap: theme.spacing.md,
    },
    googleButton: {
      backgroundColor: '#4285F4',
    },
    appleButton: {
      backgroundColor: theme.colors.primary,
    },
    socialButtonText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.secondary,
      marginLeft: theme.spacing.sm,
    },
  });
