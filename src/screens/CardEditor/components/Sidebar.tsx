import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, Theme } from '../../../theme';
import { useCardStore } from '../cardStore';
import { prepareImageAsset } from '../utils/imageUtils';

const tabs = [
  { key: 'text', label: 'テキスト' },
  { key: 'shape', label: '図形' },
  { key: 'background', label: '背景' },
  { key: 'image', label: '画像' },
] as const;

const palette = ['#0F172A', '#FACC15', '#22D3EE', '#FB7185', '#34D399', '#F472B6', '#A78BFA', '#FFFFFF'];

type TabKey = (typeof tabs)[number]['key'];

export const Sidebar: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState<TabKey>('text');

  return (
    <View style={styles.sidebar}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === 'text' && <TextPanel />}
      {activeTab === 'shape' && <ShapePanel />}
      {activeTab === 'background' && <BackgroundPanel />}
      {activeTab === 'image' && <ImagePanel />}
    </View>
  );
};

const TextPanel = () => {
  const { addText, canvas } = useCardStore((state) => ({
    addText: state.addText,
    canvas: state.canvas,
  }));

  const addHeading = () => {
    addText({
      text: '新しい見出し',
      x: canvas.width / 2 - 180,
      y: 120,
      fontSize: 72,
      fontFamily: 'SpaceGrotesk-Regular',
      color: '#111827',
      fontWeight: 'bold',
      fontStyle: 'normal',
      lineHeight: 1.1,
      letterSpacing: 1,
      rotation: 0,
      opacity: 1,
    });
  };

  const addBody = () => {
    addText({
      text: '本文テキストをここに入力',
      x: canvas.width / 2 - 200,
      y: 220,
      fontSize: 32,
      fontFamily: 'GreatVibes-Regular',
      color: '#1F2937',
      fontWeight: 'normal',
      fontStyle: 'normal',
      lineHeight: 1.4,
      letterSpacing: 0,
      rotation: 0,
      opacity: 1,
    });
  };

  return (
    <View style={panelStyles.panel}>
      <Text style={panelStyles.heading}>テキストプリセット</Text>
      <TouchableOpacity style={panelStyles.panelButton} onPress={addHeading}>
        <Text style={panelStyles.panelButtonLabel}>見出しテキストを追加</Text>
      </TouchableOpacity>
      <TouchableOpacity style={panelStyles.panelButton} onPress={addBody}>
        <Text style={panelStyles.panelButtonLabel}>本文テキストを追加</Text>
      </TouchableOpacity>
    </View>
  );
};

const ShapePanel = () => {
  const { addShape, canvas } = useCardStore((state) => ({
    addShape: state.addShape,
    canvas: state.canvas,
  }));

  const baseX = canvas.width / 2 - 120;
  const baseY = canvas.height / 2 - 120;

  return (
    <View style={panelStyles.panel}>
      <Text style={panelStyles.heading}>図形プリセット</Text>
      <TouchableOpacity
        style={panelStyles.panelButton}
        onPress={() =>
          addShape({
            type: 'rect',
            x: baseX,
            y: baseY,
            width: 240,
            height: 120,
            strokeColor: '#0EA5E9',
            fillColor: 'rgba(14,165,233,0.25)',
            strokeWidth: 3,
            opacity: 1,
            rotation: 0,
          })
        }
      >
        <Text style={panelStyles.panelButtonLabel}>長方形</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={panelStyles.panelButton}
        onPress={() =>
          addShape({
            type: 'roundRect',
            x: baseX,
            y: baseY,
            width: 240,
            height: 120,
            radius: 32,
            strokeColor: '#F97316',
            fillColor: 'rgba(249,115,22,0.25)',
            strokeWidth: 3,
            opacity: 1,
            rotation: 0,
          })
        }
      >
        <Text style={panelStyles.panelButtonLabel}>角丸</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={panelStyles.panelButton}
        onPress={() =>
          addShape({
            type: 'circle',
            x: baseX,
            y: baseY,
            width: 160,
            height: 160,
            strokeColor: '#22D3EE',
            fillColor: 'rgba(34,211,238,0.3)',
            strokeWidth: 3,
            opacity: 1,
            rotation: 0,
          })
        }
      >
        <Text style={panelStyles.panelButtonLabel}>円</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={panelStyles.panelButton}
        onPress={() =>
          addShape({
            type: 'line',
            x: baseX,
            y: baseY,
            width: 240,
            height: 0,
            strokeColor: '#F472B6',
            fillColor: '#F472B6',
            strokeWidth: 4,
            opacity: 1,
            rotation: 0,
          })
        }
      >
        <Text style={panelStyles.panelButtonLabel}>ライン</Text>
      </TouchableOpacity>
    </View>
  );
};

const BackgroundPanel = () => {
  const theme = useTheme();
  const { background, setBackground, pushHistory } = useCardStore((state) => ({
    background: state.background,
    setBackground: state.setBackground,
    pushHistory: state.pushHistory,
  }));

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
      pushHistory();
      const normalized = await prepareImageAsset(result.assets[0].uri, { maxWidth: 1400 });
      setBackground({ imageUri: normalized }, { recordHistory: false });
    }
  };

  return (
    <View style={panelStyles.panel}>
      <Text style={panelStyles.heading}>背景色</Text>
      <View style={panelStyles.paletteRow}>
        {palette.map((color) => (
          <TouchableOpacity
            key={color}
            style={[panelStyles.colorDot, color === '#FFFFFF' && { borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={() => setBackground({ color })}
          >
            <View style={[panelStyles.colorDotInner, { backgroundColor: color }]} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={panelStyles.heading}>背景画像の不透明度</Text>
      <Slider
        minimumValue={0}
        maximumValue={1}
        value={background.imageOpacity}
        minimumTrackTintColor={theme.colors.accent}
        maximumTrackTintColor={theme.colors.border}
        onSlidingStart={() => pushHistory()}
        onValueChange={(value) => setBackground({ imageOpacity: value }, { recordHistory: false })}
      />

      <TouchableOpacity style={panelStyles.panelButton} onPress={handlePickImage}>
        <Text style={panelStyles.panelButtonLabel}>背景画像をアップロード</Text>
      </TouchableOpacity>
      <TouchableOpacity style={panelStyles.panelLink} onPress={() => setBackground({ imageUri: null })}>
        <Text style={panelStyles.panelLinkLabel}>画像をクリア</Text>
      </TouchableOpacity>
    </View>
  );
};

const ImagePanel = () => {
  const { addImage, canvas } = useCardStore((state) => ({
    addImage: state.addImage,
    canvas: state.canvas,
  }));

  const handleUpload = async () => {
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
      const normalized = await prepareImageAsset(result.assets[0].uri, { maxWidth: 1200 });
      addImage({
        uri: normalized,
        x: canvas.width / 2,
        y: canvas.height / 2,
        scale: 0.6,
        rotation: 0,
        opacity: 1,
      });
    }
  };

  return (
    <View style={panelStyles.panel}>
      <Text style={panelStyles.heading}>画像を追加</Text>
      <TouchableOpacity
        style={panelStyles.panelButton}
        onPress={() =>
          prepareImageAsset('https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600').then((uri) =>
            addImage({
              uri,
              x: canvas.width / 2,
              y: canvas.height / 2,
              scale: 0.5,
              rotation: 0,
              opacity: 1,
            })
          )
        }
      >
        <Text style={panelStyles.panelButtonLabel}>サンプル写真</Text>
      </TouchableOpacity>
      <TouchableOpacity style={panelStyles.panelButton} onPress={handleUpload}>
        <Text style={panelStyles.panelButtonLabel}>端末からアップロード</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sidebar: {
      width: 230,
      backgroundColor: theme.colors.secondary,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    tabRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    tabButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.cardBackground,
    },
    tabButtonActive: {
      backgroundColor: theme.colors.accent + '22',
    },
    tabLabel: {
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeight.medium,
    },
    tabLabelActive: {
      color: theme.colors.accent,
    },
  });

const panelStyles = StyleSheet.create({
  panel: {
    gap: 12,
  },
  heading: {
    fontWeight: 'bold',
    color: '#fff',
  },
  panelButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  panelButtonLabel: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  panelLink: {
    alignSelf: 'flex-start',
  },
  panelLinkLabel: {
    color: '#38BDF8',
  },
});
