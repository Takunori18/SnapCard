import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, Theme } from '../../theme'; // ★ 修正
import { DmMessage } from '../../types/dm';
import { format } from 'date-fns';

interface DmMessageBubbleProps {
  message: DmMessage;
}

const DmMessageBubble: React.FC<DmMessageBubbleProps> = ({ message }) => {
  const { user } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isOwnMessage = message.sender_id === user?.id;

  return (
    <View style={[styles.container, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
      <View
        style={[
          styles.bubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
          {message.content}
        </Text>
        <Text style={[styles.timestamp, isOwnMessage && styles.ownTimestamp]}>
          {format(new Date(message.created_at), 'HH:mm')}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    ownMessage: {
      alignItems: 'flex-end',
    },
    otherMessage: {
      alignItems: 'flex-start',
    },
    bubble: {
      maxWidth: '75%',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
    },
    ownBubble: {
      backgroundColor: theme.colors.accent,
      borderBottomRightRadius: 4,
    },
    otherBubble: {
      backgroundColor: theme.colors.cardBackground,
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      lineHeight: 20,
    },
    ownMessageText: {
      color: theme.colors.secondary,
    },
    timestamp: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    ownTimestamp: {
      color: theme.colors.secondary + 'CC',
    },
  });

export default DmMessageBubble;