// src/screens/StoryEditor/components/StickerToolPanel.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../../../components/editors/BottomSheet';
import { useTheme, Theme } from '../../../theme';
import { useEditorStore } from '../../../store/editorStore';

type StickerToolPanelProps = {
  visible: boolean;
  onClose: () => void;
};

// 絵文字カテゴリ
const EMOJI_CATEGORIES = [
  {
    name: 'スマイリー',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎'],
  },
  {
    name: 'ジェスチャー',
    emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐'],
  },
  {
    name: 'ハート',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  },
  {
    name: '動物',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝'],
  },
  {
    name: '食べ物',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🫑', '🌽', '🥕', '🫒'],
  },
  {
    name: 'アクティビティ',
    emojis: ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳️', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹'],
  },
  {
    name: '旅行',
    emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '✈️'],
  },
  {
    name: 'オブジェクト',
    emojis: ['⌚️', '📱', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚'],
  },
];

export const StickerToolPanel: React.FC<StickerToolPanelProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { canvas, addElement } = useEditorStore();
  const [activeCategory, setActiveCategory] = useState(0);

  const handleEmojiSelect = (emoji: string) => {
    // 絵文字をスタンプとして追加
    addElement({
      type: 'text', // 絵文字はテキスト要素として扱う
      text: emoji,
      fontSize: 120,
      fontFamily: 'System',
      color: '#000000',
      transform: {
        x: canvas.width / 2 - 60,
        y: canvas.height / 2 - 60,
        scale: 1,
        rotation: 0,
      },
      opacity: 1,
      name: `絵文字 ${emoji}`,
    });

    onClose();
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', 'フォトライブラリへのアクセスを許可してください。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      addElement({
        type: 'sticker',
        uri: result.assets[0].uri,
        width: 200,
        height: 200,
        transform: {
          x: canvas.width / 2 - 100,
          y: canvas.height / 2 - 100,
          scale: 1,
          rotation: 0,
        },
        opacity: 1,
        name: 'カスタムスタンプ',
      });

      onClose();
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="スタンプ" height={600}>
      <View style={styles.content}>
        {/* カテゴリータブ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabs}
          contentContainerStyle={styles.categoryTabsContent}
        >
          {EMOJI_CATEGORIES.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.categoryTab,
                activeCategory === index && styles.categoryTabActive,
              ]}
              onPress={() => setActiveCategory(index)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  activeCategory === index && styles.categoryTabTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* カスタム画像追加 */}
        <TouchableOpacity style={styles.customImageButton} onPress={handlePickImage}>
          <Ionicons name="image-outline" size={24} color={theme.colors.accent} />
          <Text style={styles.customImageText}>カスタム画像を追加</Text>
        </TouchableOpacity>

        {/* 絵文字グリッド */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.emojiScroll}>
          <View style={styles.emojiGrid}>
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={styles.emojiButton}
                onPress={() => handleEmojiSelect(emoji)}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ヒント */}
        <View style={styles.hintBox}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
          <Text style={styles.hintText}>
            スタンプをタップしてキャンバスに追加
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      flex: 1,
      gap: theme.spacing.md,
    },
    categoryTabs: {
      maxHeight: 50,
    },
    categoryTabsContent: {
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
    },
    categoryTab: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.cardBackground,
    },
    categoryTabActive: {
      backgroundColor: theme.colors.accent,
    },
    categoryTabText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeight.medium,
    },
    categoryTabTextActive: {
      color: theme.colors.secondary,
      fontWeight: theme.fontWeight.bold,
    },
    customImageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 2,
      borderColor: theme.colors.accent,
      borderStyle: 'dashed',
    },
    customImageText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.semibold,
    },
    emojiScroll: {
      flex: 1,
    },
    emojiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    emojiButton: {
      width: '18%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
    },
    emoji: {
      fontSize: 32,
    },
    hintBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.accent + '11',
      borderRadius: theme.borderRadius.md,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.accent,
    },
    hintText: {
      flex: 1,
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
  });
