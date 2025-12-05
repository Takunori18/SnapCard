import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme'; // ★ 修正
import { DmConversation } from '../../types/dm';
import { format, isToday, isYesterday } from 'date-fns';
import { ja } from 'date-fns/locale';

interface DmListItemProps {
  conversation: DmConversation;
  onPress: () => void;
}

const DmListItem: React.FC<DmListItemProps> = ({ conversation, onPress }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return '昨日';
    } else {
      return format(date, 'M/d', { locale: ja });
    }
  };

  const hasUnread = conversation.unread_count && conversation.unread_count > 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        {conversation.other_user.avatar_url ? (
          <Image
            source={{ uri: conversation.other_user.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
          </View>
        )}
        {hasUnread && <View style={styles.unreadBadge} />}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.other_user.display_name}
          </Text>
          {conversation.last_message && (
            <Text style={styles.time}>
              {formatTime(conversation.last_message.created_at)}
            </Text>
          )}
        </View>

        {conversation.last_message && (
          <View style={styles.bottomRow}>
            <Text
              style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {conversation.last_message.content}
            </Text>
            {hasUnread && (
              <View style={styles.unreadCountBadge}>
                <Text style={styles.unreadCountText}>
                  {conversation.unread_count}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.cardBackground,
    },
    avatarPlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.cardBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    unreadBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.accent,
      borderWidth: 2,
      borderColor: theme.colors.secondary,
    },
    content: {
      flex: 1,
      marginLeft: theme.spacing.sm,
      justifyContent: 'center',
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    name: {
      flex: 1,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    time: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.xs,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    lastMessage: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    lastMessageUnread: {
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    unreadCountBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      marginLeft: theme.spacing.xs,
    },
    unreadCountText: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.secondary,
    },
  });

export default DmListItem;