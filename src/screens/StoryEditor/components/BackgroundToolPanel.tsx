import React, { useMemo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CardyImage from '../../../components/common/CardyImage';
import { BottomSheet } from './BottomSheet';
import { useStoryStore } from '../storyStore';
import { useTheme, Theme } from '../../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const BackgroundToolPanel: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { backgroundImage, setBackgroundImage, setSelected } = useStoryStore((state) => ({
    backgroundImage: state.backgroundImage,
    setBackgroundImage: state.setBackgroundImage,
    setSelected: state.setSelected,
  }));

  const handlePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) {
      Alert.alert('エラー', '画像を読み込めませんでした');
      return;
    }
    setBackgroundImage({
      uri: asset.uri,
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    });
    setSelected({ type: 'background', id: 'background' });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="背景" height={320} scrollable={false}>
      <Text style={styles.helperText}>新しい背景をフォトライブラリから読み込みます。</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={handlePick}>
        <Text style={styles.primaryLabel}>フォトライブラリから選択</Text>
      </TouchableOpacity>
      {backgroundImage?.uri && (
        <View style={styles.preview}>
          <Text style={styles.label}>現在の背景</Text>
          <CardyImage
          source={{ uri: backgroundImage.uri }}
          style={styles.previewImage}
          contentFit="cover"
          alt="背景プレビュー"
          priority
        />
        </View>
      )}
    </BottomSheet>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    helperText: {
      color: theme.colors.textSecondary,
    },
    primaryButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    primaryLabel: {
      color: '#fff',
      fontWeight: theme.fontWeight.bold,
    },
    preview: {
      gap: theme.spacing.xs,
    },
    label: {
      color: theme.colors.textSecondary,
    },
    previewImage: {
      width: '100%',
      height: 140,
      borderRadius: theme.borderRadius.md,
    },
  });
