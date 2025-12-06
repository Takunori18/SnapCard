import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export const AccountSettingsScreen: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true);
  const [loading, setLoading] = useState(false);

  // プロフィール変更時に状態を更新
  useEffect(() => {
    if (profile) {
      setIsPublic(profile.isPublic ?? true);
    }
  }, [profile]);

  // 公開設定を切り替え
  const handleTogglePublic = async (value: boolean) => {
    setLoading(true);

    try {
      await updateProfile({ isPublic: value });
      setIsPublic(value);

      Alert.alert(
        '✅ 設定を更新',
        value
          ? 'アカウントを公開に設定しました。あなたのカードが地図に表示されます。'
          : 'アカウントを非公開に設定しました。あなたのカードは地図に表示されません。'
      );
    } catch (error) {
      console.error('設定更新エラー:', error);
      Alert.alert('エラー', '設定の更新に失敗しました');
      setIsPublic(!value); // ロールバック
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>アカウント設定</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* プライバシー設定セクション */}
        <View style={styles.sectionHeader}>
          <Ionicons name="lock-closed" size={20} color={theme.colors.accent} />
          <Text style={styles.sectionTitle}>プライバシー</Text>
        </View>

        {/* 公開アカウント設定 */}
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.settingIconContainer}>
                <Ionicons
                  name={isPublic ? 'globe' : 'lock-closed'}
                  size={24}
                  color={isPublic ? theme.colors.accentGreen : theme.colors.textSecondary}
                />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>
                  {isPublic ? '公開アカウント' : '非公開アカウント'}
                </Text>
                <Text style={styles.settingDescription}>
                  {isPublic
                    ? 'あなたのカードが地図に表示されます'
                    : 'あなたのカードは地図に表示されません'}
                </Text>
              </View>
            </View>
            <Switch
              value={isPublic}
              onValueChange={handleTogglePublic}
              disabled={loading}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.accentGreen,
              }}
              thumbColor={theme.colors.secondary}
            />
          </View>

          {/* 詳細説明 */}
          <View style={styles.settingDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.accentGreen} />
              <Text style={styles.detailText}>公開設定時：</Text>
            </View>
            <Text style={styles.detailSubtext}>
              • 位置情報付きカードが地図に表示されます{'\n'}
              • 他のユーザーがあなたのカードを発見できます{'\n'}
              • プロフィールが検索可能になります
            </Text>

            <View style={[styles.detailRow, { marginTop: theme.spacing.md }]}>
              <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>非公開設定時：</Text>
            </View>
            <Text style={styles.detailSubtext}>
              • あなたのカードは地図に表示されません{'\n'}
              • 自分だけがカードを閲覧できます{'\n'}
              • プロフィールは検索対象外になります
            </Text>
          </View>
        </View>

        {/* 注意事項 */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={theme.colors.accentBlue} />
            <Text style={styles.infoTitle}>注意事項</Text>
          </View>
          <Text style={styles.infoText}>
            • 自分のカードは常に「マイカード」から閲覧できます{'\n'}
            • 既に公開したカードは非公開設定後も履歴に残る場合があります{'\n'}
            • ショップアカウントの場合、公開設定を推奨します
          </Text>
        </View>

        {/* その他の設定セクション */}
        <View style={styles.sectionHeader}>
          <Ionicons name="settings" size={20} color={theme.colors.accent} />
          <Text style={styles.sectionTitle}>その他</Text>
        </View>

        {/* プロフィール編集 */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ProfileEdit' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="person" size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.menuItemText}>プロフィール編集</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* アカウント情報 */}
        <View style={styles.accountInfoCard}>
          <Text style={styles.accountInfoLabel}>アカウント情報</Text>
          <View style={styles.accountInfoRow}>
            <Text style={styles.accountInfoKey}>ユーザー名:</Text>
            <Text style={styles.accountInfoValue}>@{profile?.username}</Text>
          </View>
          <View style={styles.accountInfoRow}>
            <Text style={styles.accountInfoKey}>表示名:</Text>
            <Text style={styles.accountInfoValue}>
              {profile?.display_name || profile?.username}
            </Text>
          </View>
          <View style={styles.accountInfoRow}>
            <Text style={styles.accountInfoKey}>アカウント種別:</Text>
            <Text style={styles.accountInfoValue}>
              {profile?.isShopAccount ? 'ショップアカウント' : '通常アカウント'}
            </Text>
          </View>
          <View style={styles.accountInfoRow}>
            <Text style={styles.accountInfoKey}>公開設定:</Text>
            <Text style={[
              styles.accountInfoValue,
              { color: isPublic ? theme.colors.accentGreen : theme.colors.textSecondary }
            ]}>
              {isPublic ? '公開' : '非公開'}
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
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
    content: {
      flex: 1,
    },
    // セクションヘッダー
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // 設定カード
    settingCard: {
      backgroundColor: theme.colors.secondary,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.md,
    },
    settingIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingTextContainer: {
      flex: 1,
    },
    settingTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    // 詳細説明
    settingDetails: {
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    detailText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    detailSubtext: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginLeft: theme.spacing.lg,
    },
    // 情報カード
    infoCard: {
      backgroundColor: theme.colors.secondary,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.accentBlue,
      borderLeftWidth: 4,
    },
    infoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    infoTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.accentBlue,
    },
    infoText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    // メニューアイテム
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.secondary,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    menuIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItemText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
    // アカウント情報カード
    accountInfoCard: {
      backgroundColor: theme.colors.secondary,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    accountInfoLabel: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    accountInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    accountInfoKey: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    accountInfoValue: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    bottomSpacer: {
      height: 40,
    },
  });