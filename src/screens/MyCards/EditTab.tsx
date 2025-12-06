import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme, Theme } from '../../theme';
import { useSnapCardContext } from '../../contexts/SnapCardContext';
import { RootStackParamList } from '../../navigation/types';
import CardyImage from '../../components/common/CardyImage';

export const EditTab: React.FC = () => {
  const { cards } = useSnapCardContext();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const renderCardItem = ({ item }: { item: typeof cards[0] }) => (
    <TouchableOpacity
      style={styles.cardItem}
        onPress={() =>
          navigation.navigate('EditScreen', {
            cardId: item.id,
            mode: 'edit',
          })
        }
      >
      <CardyImage source={{ uri: item.imageUri ?? '' }} style={styles.thumbnail} contentFit="cover" />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title || 'タイトル未設定'}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {item.caption || '説明なし'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {cards.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>カードがありません。新規作成して編集を始めましょう。</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          renderItem={renderCardItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
    },
    list: {
      paddingBottom: theme.spacing.lg,
    },
    cardItem: {
      flexDirection: 'row',
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    thumbnail: {
      width: 72,
      height: 72,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
    },
    cardInfo: {
      flex: 1,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
    cardMeta: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.sm,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
