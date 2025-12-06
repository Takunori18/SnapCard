import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CardyImage from '../common/CardyImage';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, Theme } from '../../theme';
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
  const avatarUrl = message.sender?.avatar_url;

  const renderAvatar = (styleOverride: any) => (
    <View style={[styles.avatarBox, styleOverride]}>
      {avatarUrl ? (
        <CardyImage
          source={{ uri: avatarUrl }}
          style={styles.avatar}
          contentFit="cover"
          alt="ユーザーアバター"
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
        </View>
      )}
    </View>
  );

  const bubbleContent = (
    <View
      style={[
        styles.bubble,
        isOwnMessage ? styles.ownBubble : styles.otherBubble,
      ]}
    >
      <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
        {message.content}
      </Text>
    </View>
  );

  return (
    <View style={[styles.row, isOwnMessage ? styles.rowOwn : styles.rowOther]}>
      {!isOwnMessage && renderAvatar(styles.avatarBoxOther)}
      {bubbleContent}
      <Text
        style={[
          styles.timestamp,
          isOwnMessage ? styles.timestampOwn : styles.timestampOther,
        ]}
      >
        {format(new Date(message.created_at), 'HH:mm')}
      </Text>
      {isOwnMessage && renderAvatar(styles.avatarBoxOwn)}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      alignItems: 'center',
      width: '100%',
      gap: theme.spacing.xs,
    },
    rowOwn: {
      justifyContent: 'flex-end',
    },
    rowOther: {
      justifyContent: 'flex-start',
    },
    avatarBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarBoxOwn: {
      marginLeft: theme.spacing.xs,
    },
    avatarBoxOther: {
      marginRight: theme.spacing.xs,
    },
    avatar: {
      width: '100%',
      height: '100%',
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
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
    },
    timestampOwn: {
      color: `${theme.colors.secondary}CC`,
    },
    timestampOther: {
      color: `${theme.colors.textSecondary}CC`,
    },
  });

export default DmMessageBubble;
