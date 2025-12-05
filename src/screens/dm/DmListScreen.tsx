import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDm } from '../../contexts/DmContext';
import { useTheme, Theme } from '../../theme'; // ★ 修正
import DmListItem from '../../components/dm/DmListItem';
import { useMemo } from 'react';

const DmListScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme(); // ★ { theme } を削除
  const styles = useMemo(() => createStyles(theme), [theme]); // ★ 追加
  const { conversations, loading, error, fetchConversations } = useDm();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const handleConversationPress = (conversationId: string) => {
    navigation.navigate('DmThread' as never, { conversationId } as never);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyText}>
        まだメッセージがありません
      </Text>
      <Text style={styles.emptySubtext}>
        フィードから気になるユーザーに
      </Text>
      <Text style={styles.emptySubtext}>
        メッセージを送ってみましょう
      </Text>
    </View>
  );

  if (loading && conversations.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>メッセージ</Text>
        <View style={styles.headerRight} />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={conversations}
        renderItem={({ item }) => (
          <DmListItem
            conversation={item}
            onPress={() => handleConversationPress(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
      />
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
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.secondary,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    headerRight: {
      width: 32,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.error + '20',
    },
    errorText: {
      fontSize: theme.fontSize.sm,
      textAlign: 'center',
      color: theme.colors.error,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
    },
    emptyText: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      marginTop: theme.spacing.md,
      color: theme.colors.textSecondary,
    },
    emptySubtext: {
      fontSize: theme.fontSize.sm,
      marginTop: 4,
      color: theme.colors.textSecondary,
    },
    emptyList: {
      flexGrow: 1,
    },
  });

export default DmListScreen;