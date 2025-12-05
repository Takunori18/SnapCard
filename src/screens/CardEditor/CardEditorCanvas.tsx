import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../theme';
import CardyImage from '../../components/common/CardyImage';
import { useSnapCardContext } from '../../contexts/SnapCardContext';

const CardEditorCanvas: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { cards } = useSnapCardContext();

  // サンプルカード（実際には選択されたカードを使用）
  const sampleCard = cards[0] || {
    id: '1',
    imageUri: 'https://picsum.photos/400/600',
    title: 'サンプルカード',
    caption: 'これはサンプルのキャプションです。',
    location: '東京都',
    tags: ['旅行', '写真'],
    createdAt: new Date(),
    likesCount: 0,
    userId: 'user1',
    isPublic: true,
  };

  const [title, setTitle] = useState(sampleCard.title);
  const [caption, setCaption] = useState(sampleCard.caption || '');
  const [location, setLocation] = useState(sampleCard.location || '');
  const [tags, setTags] = useState<string[]>(sampleCard.tags || []);
  const [tagInput, setTagInput] = useState('');

  const handleSave = () => {
    Alert.alert('保存完了', 'カードが更新されました', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>カード編集</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Text style={styles.saveButton}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* プレビュー画像 */}
        <CardyImage
          source={{ uri: sampleCard.imageUri }}
          style={styles.previewImage}
          contentFit="cover"
          alt="カードプレビュー"
        />

        {/* タイトル */}
        <View style={styles.section}>
          <Text style={styles.label}>タイトル</Text>
          <TextInput
            style={styles.input}
            placeholder="カードのタイトル"
            placeholderTextColor={theme.colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
          />
        </View>

        {/* キャプション */}
        <View style={styles.section}>
          <Text style={styles.label}>キャプション</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="この写真について..."
            placeholderTextColor={theme.colors.textTertiary}
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* 場所 */}
        <View style={styles.section}>
          <Text style={styles.label}>場所</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="場所を追加"
              placeholderTextColor={theme.colors.textTertiary}
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </View>

        {/* タグ */}
        <View style={styles.section}>
          <Text style={styles.label}>タグ</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="pricetag-outline" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="タグを追加"
              placeholderTextColor={theme.colors.textTertiary}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            {tagInput.length > 0 && (
              <TouchableOpacity onPress={addTag}>
                <Ionicons name="add-circle" size={24} color={theme.colors.accent} />
              </TouchableOpacity>
            )}
          </View>

          {tags.length > 0 && (
            <View style={styles.tagsList}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 編集ツール説明 */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={theme.colors.accent} />
          <Text style={styles.infoText}>
            新しいエディターでは、画像の編集、テキストの追加、フィルター適用などが可能になります。
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.secondary,
    },
    headerButton: {
      minWidth: 60,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    saveButton: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.accent,
    },
    content: {
      flex: 1,
    },
    previewImage: {
      width: '100%',
      height: 300,
      backgroundColor: theme.colors.cardBackground,
    },
    section: {
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    label: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    input: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.cardBackground,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      minHeight: 44,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.cardBackground,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
    },
    inputWithIcon: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      minHeight: 44,
    },
    tagsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      gap: theme.spacing.xs,
    },
    tagText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.secondary,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.lg,
      backgroundColor: theme.colors.accent + '20',
      borderRadius: theme.borderRadius.md,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.accent,
    },
    infoText: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    bottomSpacer: {
      height: 40,
    },
  });

export default CardEditorCanvas;