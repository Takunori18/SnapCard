import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDm } from '../../contexts/DmContext';
import { useTheme, Theme } from '../../theme'; // ★ 修正
import DmMessageBubble from '../../components/dm/DmMessageBubble';

type DmThreadScreenRouteProp = RouteProp<{ params: { conversationId: string } }, 'params'>;

const DmThreadScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<DmThreadScreenRouteProp>();
  const { conversationId } = route.params;
  const theme = useTheme(); // ★ { theme } を削除
  const styles = useMemo(() => createStyles(theme), [theme]); // ★ 追加
  const {
    messages,
    conversations,
    currentConversation,
    loading,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    subscribeToConversation,
    unsubscribeFromConversation,
  } = useDm();

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages(conversationId);
    markMessagesAsRead(conversationId);
    subscribeToConversation(conversationId);

    return () => {
      unsubscribeFromConversation();
    };
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(conversationId, inputText);
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const activeConversation = currentConversation ?? conversations.find(c => c.id === conversationId);
  const fallbackDisplayName =
    messages.find(msg => msg.sender?.id && msg.sender.id !== activeConversation?.other_user?.id)?.sender?.display_name;

  if (loading && messages.length === 0) {
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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {activeConversation?.other_user.display_name ||
              activeConversation?.other_user.username ||
              fallbackDisplayName ||
              '読み込み中...'}
          </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <DmMessageBubble message={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="メッセージを入力..."
            placeholderTextColor={theme.colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={theme.colors.secondary} />
            ) : (
              <Ionicons name="send" size={20} color={theme.colors.secondary} />
            )}
          </TouchableOpacity>
        </View>
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
    headerInfo: {
      flex: 1,
      marginLeft: theme.spacing.sm,
    },
    headerTitle: {
      fontSize: theme.fontSize.md,
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
    messageList: {
      padding: theme.spacing.md,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.secondary,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      maxHeight: 100,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: theme.spacing.sm,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
  });

export default DmThreadScreen;
