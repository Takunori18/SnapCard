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

  const isOwn = message.sender_id === user?.id;
  const avatarUrl = message.sender?.avatar_url;
  const timeText = format(new Date(message.created_at), 'HH:mm');

  const Avatar = (
    <View style={styles.avatarBox}>
      {avatarUrl ? (
        <CardyImage source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
        </View>
      )}
    </View>
  );

  const Bubble = (
    <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
      <Text style={[styles.text, isOwn && styles.ownText]}>
        {message.content}
      </Text>
    </View>
  );

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      {/* 相手側：アバター → バブル → 時刻 */}
      {!isOwn && Avatar}

      <View style={styles.bubbleTime}>
        {isOwn ? (
          // 自分側：時刻 → バブル
          <>
            <Text style={[styles.time, styles.timeOwn]}>{timeText}</Text>
            {Bubble}
          </>
        ) : (
          // 相手側：バブル → 時刻
          <>
            {Bubble}
            <Text style={[styles.time, styles.timeOther]}>{timeText}</Text>
          </>
        )}
      </View>

      {/* 自分側：バブル → 時刻 → アバター */}
      {isOwn && Avatar}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end', // ★ 下端揃え
      marginBottom: theme.spacing.sm,
      width: '100%',
      paddingHorizontal: theme.spacing.sm,
    },
    rowOwn: {
      justifyContent: 'flex-end', // ★ 右寄せ
    },
    rowOther: {
      justifyContent: 'flex-start', // ★ 左寄せ
    },

    avatarBox: {
      width: 34,
      height: 34,
      borderRadius: 17,
      overflow: 'hidden',
      marginHorizontal: 6,
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
      backgroundColor: theme.colors.cardBackground,
    },

    // ★ バブルと時刻を横並びに
    bubbleTime: {
      flexDirection: 'row',
      alignItems: 'flex-end', // ★ バブルと時刻の下端揃え
      maxWidth: '90%',
      gap: 6,
    },

    bubble: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      maxWidth: '92%', // ← 改行改善
    },
    ownBubble: {
      backgroundColor: theme.colors.accent,
      borderBottomRightRadius: 4,
    },
    otherBubble: {
      backgroundColor: theme.colors.cardBackground,
      borderBottomLeftRadius: 4,
    },

    text: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      lineHeight: 20,
    },
    ownText: {
      color: theme.colors.secondary,
    },

    time: {
      fontSize: theme.fontSize.xs,
      marginBottom: 2,
    },
    timeOwn: {
      color: `${theme.colors.secondary}CC`,
    },
    timeOther: {
      color: `${theme.colors.textSecondary}CC`,
    },
  });

export default DmMessageBubble;
