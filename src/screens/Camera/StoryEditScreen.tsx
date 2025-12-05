import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CardyImage from '../../components/common/CardyImage';
import { useTheme, Theme } from '../../theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useStoryContext } from '../../contexts/StoryContext';
import { useAuth } from '../../contexts/AuthContext';
import { StoryKonvaEditor } from '../../components/editors/StoryKonvaEditor';

type StoryOverlay = {
  id: string;
  text: string;
  color: string;
  fontSize: number;
  fontFamily?: string;
  backgroundColor?: string;
  xRatio: number;
  yRatio: number;
};

type WebEditorValues = {
  text: string;
  textColor: string;
  textSize: 'small' | 'medium' | 'large';
  backgroundColor: string;
  tags: string[];
  textPosition: { x: number; y: number };
  overlays: StoryOverlay[];
};

type StoryEditScreenRouteProp = RouteProp<{ StoryEdit: { imageUri: string } }, 'StoryEdit'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_WIDTH * 1.5; // 3:2アスペクト比

const StoryEditWeb: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<StoryEditScreenRouteProp>();
  const { imageUri } = route.params;
  const { addStory } = useStoryContext();
  const { user, profile } = useAuth();
  const activeProfileId = profile?.id ?? user?.id ?? null;
  const [saving, setSaving] = useState(false);

  const handleSave = async (values: WebEditorValues) => {
    if (!user || !activeProfileId) {
      Alert.alert('エラー', 'アカウント情報を取得できませんでした');
      return;
    }
    try {
      setSaving(true);
      await addStory({
        imageUri,
        text: values.text,
        textColor: values.textColor,
        textSize: values.textSize,
        backgroundColor: values.backgroundColor,
        tags: values.tags,
        textPosition: values.textPosition,
        textFont: undefined,
        textOverlays: values.overlays,
        userId: activeProfileId,
      });
      Alert.alert('✅ 投稿完了', 'ストーリーを投稿しました\n24時間後に自動削除されます', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('MainTabs' as never, { screen: 'Home' } as never),
        },
      ]);
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', 'ストーリーの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StoryKonvaEditor
      imageUri={imageUri}
      saving={saving}
      onCancel={() => navigation.goBack()}
      onSave={handleSave}
    />
  );
};

const StoryEditNative: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<StoryEditScreenRouteProp>();
  const { imageUri } = route.params;
  const { addStory } = useStoryContext();
  const { user, profile } = useAuth();
  const activeProfileId = profile?.id ?? user?.id ?? null;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [text, setText] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0.5, y: 0.6 });
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [textColor, setTextColor] = useState(theme.colors.secondary);
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [textFont, setTextFont] = useState<string | undefined>(undefined);
  const textDragStart = useRef({ x: 0, y: 0 });
  const cardWidth = SCREEN_WIDTH * 0.9;
  const cardHeight = CARD_HEIGHT * 0.9;

  const textSizes = useMemo(
    () => ({
      small: theme.fontSize.lg,
      medium: theme.fontSize.xl,
      large: 32,
    }),
    [theme]
  );

  const fonts = useMemo(
    () => [
      { label: '標準', value: undefined },
      { label: 'Serif', value: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }) },
      { label: 'Mono', value: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) },
      { label: 'Script', value: 'GreatVibes-Regular' },
    ],
    []
  );

  const colors = useMemo(
    () => [
      theme.colors.secondary,
      theme.colors.primary,
      theme.colors.accent,
      '#FF0000',
      '#00FF00',
      '#0000FF',
      '#FFFF00',
      '#FF00FF',
      '#00FFFF',
    ],
    [theme]
  );

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!text,
        onPanResponderGrant: () => {
          textDragStart.current = {
            x: textPosition.x * cardWidth,
            y: textPosition.y * cardHeight,
          };
        },
        onPanResponderMove: (_evt, gesture) => {
          const nextX = clamp(textDragStart.current.x + gesture.dx, 0, cardWidth - theme.spacing.lg);
          const nextY = clamp(textDragStart.current.y + gesture.dy, 0, cardHeight - theme.spacing.lg);
          setTextPosition({
            x: nextX / cardWidth,
            y: nextY / cardHeight,
          });
        },
      }),
    [text, textPosition, cardWidth, cardHeight, theme.spacing.lg]
  );

  const backgroundColors = [
    'transparent',
    'rgba(0, 0, 0, 0.5)',
    'rgba(255, 255, 255, 0.5)',
    'rgba(255, 0, 0, 0.3)',
    'rgba(0, 255, 0, 0.3)',
    'rgba(0, 0, 255, 0.3)',
  ];

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

  const handleSave = async () => {
    if (!user || !activeProfileId) {
      Alert.alert('エラー', 'アカウント情報を取得できませんでした');
      return;
    }

    try {
      await addStory({
        imageUri,
        text,
        textColor,
        textSize,
        backgroundColor,
        tags,
        textFont,
        textPosition,
        userId: activeProfileId,
      });

      Alert.alert('✅ 投稿完了', 'ストーリーを投稿しました\n24時間後に自動削除されます', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('MainTabs' as never, { screen: 'Home' } as never);
          },
        },
      ]);
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', 'ストーリーの保存に失敗しました');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={theme.colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ストーリーを作成</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>完了</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cardPreview}>
          <View style={styles.card}>
            <CardyImage
            source={{ uri: imageUri }}
            style={styles.cardImage}
            contentFit="cover"
            alt="ストーリー編集中の画像"
            priority
          />
            {text && (
              <View
                style={[
                  styles.textOverlay,
                  {
                    backgroundColor,
                    top: textPosition.y * cardHeight,
                    left: textPosition.x * cardWidth,
                  },
                ]}
                {...panResponder.panHandlers}
              >
                <Text
                  style={[
                    styles.overlayText,
                    {
                      fontSize: textSizes[textSize],
                      color: textColor,
                      fontFamily: textFont,
                    },
                  ]}
                >
                  {text}
                </Text>
              </View>
            )}
          </View>
        </View>

        <NativeControls
          theme={theme}
          text={text}
          setText={setText}
          setTextPosition={() => setTextPosition({ x: 0.5, y: 0.6 })}
          textSize={textSize}
          setTextSize={setTextSize}
          textColor={textColor}
          setTextColor={setTextColor}
          colors={colors}
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
          backgroundColors={backgroundColors}
          fonts={fonts}
          textFont={textFont}
          setTextFont={setTextFont}
          tags={tags}
          tagInput={tagInput}
          setTagInput={setTagInput}
          addTag={addTag}
          removeTag={removeTag}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const NativeControls = ({
  theme,
  text,
  setText,
  setTextPosition,
  textSize,
  setTextSize,
  textColor,
  setTextColor,
  colors,
  backgroundColor,
  setBackgroundColor,
  backgroundColors,
  fonts,
  textFont,
  setTextFont,
  tags,
  tagInput,
  setTagInput,
  addTag,
  removeTag,
}: {
  theme: Theme;
  text: string;
  setText: (text: string) => void;
  setTextPosition: () => void;
  textSize: 'small' | 'medium' | 'large';
  setTextSize: (size: 'small' | 'medium' | 'large') => void;
  textColor: string;
  setTextColor: (color: string) => void;
  colors: string[];
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  backgroundColors: string[];
  fonts: { label: string; value?: string }[];
  textFont?: string;
  setTextFont: (font?: string) => void;
  tags: string[];
  tagInput: string;
  setTagInput: (value: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;
}) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>テキストを追加</Text>
        <TextInput
          style={styles.textInput}
          placeholder="テキストを入力..."
          placeholderTextColor={theme.colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
        />
        <Text style={styles.helperText}>プレビュー上のテキストをドラッグして位置を調整できます</Text>
        <TouchableOpacity style={styles.resetButton} onPress={setTextPosition}>
          <Ionicons name="locate-outline" size={16} color={theme.colors.accent} />
          <Text style={styles.resetButtonText}>位置をリセット</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>フォント</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.optionsRow}>
            {fonts.map(font => (
              <TouchableOpacity
                key={font.label}
                style={[styles.optionButton, textFont === font.value && styles.optionButtonActive]}
                onPress={() => setTextFont(font.value)}
              >
                <Text style={styles.optionButtonText}>{font.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>文字色</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.colorPicker}>
            {colors.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  textColor === color && styles.colorButtonActive,
                ]}
                onPress={() => setTextColor(color)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>背景</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.colorPicker}>
            {backgroundColors.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorButton,
                  {
                    backgroundColor: color === 'transparent' ? theme.colors.cardBackground : color,
                    borderWidth: color === 'transparent' ? 2 : 0,
                    borderColor: theme.colors.border,
                  },
                  backgroundColor === color && styles.colorButtonActive,
                ]}
                onPress={() => setBackgroundColor(color)}
              >
                {color === 'transparent' && (
                  <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>タグを追加</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="pricetag-outline" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.input}
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
                  <Ionicons name="close-circle" size={18} color={theme.colors.secondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </>
  );
};

const Component = Platform.OS === 'web' ? StoryEditWeb : StoryEditNative;
export { Component as StoryEditScreen };

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
      backgroundColor: theme.colors.primary,
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.secondary,
    },
    saveButton: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.accent,
    },
    content: {
      flex: 1,
    },
    cardPreview: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      backgroundColor: theme.colors.primary,
    },
    card: {
      width: SCREEN_WIDTH * 0.9,
      height: CARD_HEIGHT * 0.9,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    cardImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    textOverlay: {
      position: 'absolute',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      maxWidth: '80%',
    },
    overlayText: {
      fontWeight: theme.fontWeight.bold,
      textAlign: 'center',
    },
    section: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.secondary,
      marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    textInput: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.cardBackground,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    helperText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
    },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    resetButtonText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.semibold,
    },
    optionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    optionButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.cardBackground,
    },
    optionButtonActive: {
      backgroundColor: theme.colors.accent,
    },
    optionButtonText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textPrimary,
    },
    colorPicker: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    colorButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorButtonActive: {
      borderWidth: 3,
      borderColor: theme.colors.textPrimary,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.cardBackground,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    input: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      marginLeft: theme.spacing.sm,
    },
    tagsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: theme.spacing.md,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    tagText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.secondary,
      marginRight: theme.spacing.xs,
    },
    bottomSpacer: {
      height: 40,
    },
  });
