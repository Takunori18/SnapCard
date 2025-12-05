import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme, Theme } from '../../theme';
import { CardKonvaEditor } from '../../components/editors/CardKonvaEditor';
import { useSnapCardContext } from '../../contexts/SnapCardContext';
import { RootStackParamList } from '../../navigation/types';
import CardyImage from '../../components/common/CardyImage';
import { optimizeRemoteImageUri } from '../../utils/image';

export const EditTab: React.FC = () => {
  const { cards, updateCard } = useSnapCardContext();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const selectedCard = cards.find(card => card.id === selectedCardId) || null;

  const handleEdit = (cardId: string) => {
    setSelectedCardId(cardId);
  };

  const handleSave = async (caption: string) => {
    if (!selectedCardId) return;
    await updateCard(selectedCardId, { caption });
    setSelectedCardId(null);
  };

  if (selectedCard) {
    return (
      <CardKonvaEditor
        card={selectedCard}
        onClose={() => setSelectedCardId(null)}
        onSave={handleSave}
      />
    );
  }

  const renderThumbnail = (uri: string) => {
    const optimized = optimizeRemoteImageUri(uri, 600);
    if (!optimized) {
      return null;
    }
    return (
      <CardyImage
        source={{ uri: optimized, cacheKey: `edit-${optimized}` }}
        style={styles.thumbnail}
        contentFit="cover"
        recyclingKey={optimized}
        blurhash={DEFAULT_BLURHASH}
        transition={200}
        alt="カードサムネイル"
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.shortcutsContainer}>
        <Text style={styles.shortcutsTitle}>新エディター試験導線</Text>
        <View style={styles.shortcutsRow}>
          <TouchableOpacity
            style={styles.shortcutButton}
            onPress={() => navigation.navigate('StoryEditor')}
            activeOpacity={0.8}
          >
            <Ionicons name="film-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.shortcutLabel}>ストーリー編集へ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutButton}
            onPress={() => navigation.navigate('CardEditor')}
            activeOpacity={0.8}
          >
            <Ionicons name="easel-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.shortcutLabel}>カード編集へ</Text>
          </TouchableOpacity>
        </View>
      </View>
      {cards.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={64} color={theme.colors.textTertiary} />
          <Text style={styles.emptyText}>まだカードがありません。カードを作成すると編集できます。</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.cardItem} 
            onPress={() => handleEdit(item.id)}
            activeOpacity={0.8}
          >
            {renderThumbnail(item.imageUri || '')}
            
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>{item.caption || 'タイトル未設定'}</Text>
              {item.location && (
                <Text style={styles.caption} numberOfLines={1}>{item.location}</Text>
              )}
              
              <View style={styles.metadata}>
                <View style={styles.badge}>
                  <Ionicons 
                    name={item.isPublic ? 'globe-outline' : 'lock-closed-outline'} 
                    size={12} 
                    color={item.isPublic ? theme.colors.accentGreen : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.badgeText, { color: item.isPublic ? theme.colors.accentGreen : theme.colors.textSecondary }]}>
                    {item.isPublic ? '公開' : '非公開'}
                  </Text>
                </View>

                <Text style={styles.date}>
                  {item.createdAt.toLocaleDateString('ja-JP')}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit(item.id)}
            >
              <Ionicons name="create-outline" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
          )}
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
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    shortcutsContainer: {
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    shortcutsTitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeight.semibold,
    },
    shortcutsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    shortcutButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.cardBackground,
    },
    shortcutLabel: {
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.medium,
    },
    list: {
      paddingHorizontal: 0,
      paddingBottom: theme.spacing.lg,
    },
    cardItem: {
      flexDirection: 'row',
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      alignItems: 'center',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    thumbnail: {
      width: 80,
      height: 80,
      borderRadius: theme.borderRadius.md,
      marginRight: theme.spacing.sm,
    },
    info: {
      flex: 1,
    },
    title: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    caption: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    metadata: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.full,
    },
    badgeText: {
      fontSize: theme.fontSize.xs,
      marginLeft: 4,
      fontWeight: theme.fontWeight.medium,
    },
    date: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    editButton: {
      padding: theme.spacing.sm,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

const DEFAULT_BLURHASH = 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH';
