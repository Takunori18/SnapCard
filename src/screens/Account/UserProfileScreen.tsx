import React, { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { UserProfileContent } from '../../components/profile/UserProfileContent';
import { useTheme, Theme } from '../../theme';

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

export const UserProfileScreen: React.FC = () => {
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, profile } = useAuth();
  const activeProfileId = profile?.id ?? user?.id ?? null;
  const viewingOwn = route.params.profileId === activeProfileId;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topButton} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={styles.topTitleWrapper}>
          <Text style={styles.topTitle}>{viewingOwn ? 'マイプロフィール' : 'プロフィール'}</Text>
        </View>
        <TouchableOpacity
          style={styles.topButton}
          onPress={() => navigation.navigate('MainTabs')}
          accessibilityRole="button"
        >
          <Ionicons name="home-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.modeBar}>
        <Ionicons name="eye-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.modeText}>
          {viewingOwn ? '自分のプロフィールを表示中' : '閲覧専用モード'}
        </Text>
      </View>

      <View style={styles.content}>
        <UserProfileContent profileId={route.params.profileId} showActions={!viewingOwn} />
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>
          {viewingOwn ? '編集はアカウントタブから行えます' : '戻るには左上の矢印をタップしてください'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topBar: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.secondary,
    },
    topButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitleWrapper: {
      flex: 1,
      alignItems: 'center',
    },
    topTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    modeBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modeText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    content: {
      flex: 1,
    },
    bottomBar: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.secondary,
    },
    bottomText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
