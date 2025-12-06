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
  const timeText = format(new Date(message.created_at), 'HH:mm');

  const renderAvatar = (extraStyle?: any) => (
    <View style={[styles.avatarBox, extraStyle]}>
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

  const bubble = (
    <View
      style={[
        styles.bubble,
        isOwnMessage ? styles.ownBubble : styles.otherBubble,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          isOwnMessage && styles.ownMessageText,
        ]}
      >
        {message.content}
      </Text>
    </View>
  );

  // 自分のメッセージ（右側）
  if (isOwnMessage) {
    return (
      <View style={[styles.row, styles.rowOwn]}>
        {/* 左側にスペーサーを入れて、全体を右に寄せやすくする */}
        <View style={styles.rowSpacer} />

        {/* バブル＋時刻ブロック（右寄せ） */}
        <View style={styles.messageBlockOwn}>
          <View style={styles.bubbleTimeRowOwn}>
            {/* 時刻 → バブル の順にして、バブルを一番右に */}
            <Text style={[styles.timestamp, styles.timestampOwn]}>
              {timeText}
            </Text>
            {bubble}
          </View>
        </View>

        {/* 一番右にアバター */}
        {renderAvatar(styles.avatarBoxOwn)}
      </View>
    );
  }

  // 相手のメッセージ（左側）
  return (
    <View style={[styles.row, styles.rowOther]}>
      {/* 左にアバター */}
      {renderAvatar(styles.avatarBoxOther)}

      {/* バブル＋時刻ブロック（左寄せ） */}
      <View style={styles.messageBlockOther}>
        <View style={styles.bubbleTimeRowOther}>
          {/* バブル → 時刻 の順で左側配置 */}
          {bubble}
          <Text style={[styles.timestamp, styles.timestampOther]}>
            {timeText}
          </Text>
        </View>
      </View>

      {/* 右側はスペーサーで埋める */}
      <View style={styles.rowSpacer} />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end', // ★ バブルと時刻の下端揃え
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      width: '100%',
    },
    rowOwn: {
      justifyContent: 'flex-end', // ★ 右側に寄せる
    },
    rowOther: {
      justifyContent: 'flex-start', // ★ 左側に寄せる
    },
    rowSpacer: {
      flex: 1,
    },

    // --- アバター周り ---
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

    // --- バブル本体 ---
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

    // --- バブル＋時刻 ブロック ---
    messageBlockOwn: {
      maxWidth: '80%',
      alignItems: 'flex-end',
      marginRight: theme.spacing.xs,
    },
    messageBlockOther: {
      maxWidth: '80%',
      alignItems: 'flex-start',
      marginLeft: theme.spacing.xs,
    },

    bubbleTimeRowOwn: {
      flexDirection: 'row', // 時刻 → バブル（右側）
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
    },
    bubbleTimeRowOther: {
      flexDirection: 'row', // バブル → 時刻（左側）
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
    },

    // --- 時刻 ---
    timestamp: {
      fontSize: theme.fontSize.xs,
    },
    timestampOwn: {
      color: `${theme.colors.secondary}CC`,
    },
    timestampOther: {
      color: `${theme.colors.textSecondary}CC`,
    },
  });

export default DmMessageBubble;
