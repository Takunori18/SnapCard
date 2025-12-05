import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { useStoryStore } from '../storyStore';
import { useTheme, Theme } from '../../../theme';
import CardyImage from '../../../components/common/CardyImage';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const STICKER_SET = [
  {
    id: 'sparkle',
    uri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2728.png',
  },
  {
    id: 'flame',
    uri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png',
  },
  {
    id: 'heart',
    uri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764.png',
  },
  {
    id: 'camera',
    uri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4f7.png',
  },
  {
    id: 'star',
    uri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2b50.png',
  },
];

export const StickerToolPanel: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { canvasSize, addSticker, setSelected } = useStoryStore((state) => ({
    canvasSize: state.canvasSize,
    addSticker: state.addSticker,
    setSelected: state.setSelected,
  }));

  const handleSelect = (uri: string) => {
    const id = `sticker-${Date.now()}`;
    addSticker({
      id,
      uri,
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      width: 240,
      height: 240,
      scale: 1,
      rotation: 0,
    });
    setSelected({ type: 'sticker', id });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="ステッカー" height={300} scrollable={false}>
      <Text style={styles.helperText}>お気に入りのスタンプをタップするとキャンバスへ追加されます。</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {STICKER_SET.map((sticker, index) => (
          <TouchableOpacity
            key={sticker.id}
            onPress={() => handleSelect(sticker.uri)}
            style={styles.stickerButton}
            activeOpacity={0.8}
          >
            <CardyImage
              source={{ uri: sticker.uri }}
              style={styles.stickerImage}
              contentFit="cover"
              alt={`ステッカー ${index + 1}`}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    helperText: {
      color: theme.colors.textSecondary,
    },
    row: {
      gap: theme.spacing.sm,
    },
    stickerButton: {
      width: 84,
      height: 84,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stickerImage: {
      width: 60,
      height: 60,
      resizeMode: 'contain',
    },
  });
