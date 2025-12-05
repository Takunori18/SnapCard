import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme, Theme } from '../../theme';
import {
  createThumbnail,
  calculateCropRegion,
  THUMBNAIL_ASPECT_RATIO,
} from '../../utils/thumbnailUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH;
const PREVIEW_HEIGHT = SCREEN_HEIGHT * 0.8;

// クロップ枠のサイズ（3:4のアスペクト比）
const CROP_WIDTH = SCREEN_WIDTH * 0.8;
const CROP_HEIGHT = CROP_WIDTH / THUMBNAIL_ASPECT_RATIO;
const PINCH_SENSITIVITY = 0.6;
const MAX_SCALE = 4;
const MIN_ZOOM_OUT_SCALE = 0.25;

const getScaleConfig = (width: number, height: number) => {
  if (!width || !height) {
    return {
      initial: 1,
      min: Math.min(1, MIN_ZOOM_OUT_SCALE),
    };
  }

  const widthScale = CROP_WIDTH / width;
  const heightScale = CROP_HEIGHT / height;
  const initial = Math.max(widthScale, heightScale, 1);
  const naturalMin = Math.min(widthScale, heightScale);
  const min = Math.min(initial, Math.max(naturalMin, MIN_ZOOM_OUT_SCALE));

  return {
    initial,
    min,
  };
};

interface ThumbnailEditorProps {
  visible: boolean;
  imageUri: string;
  onCancel: () => void;
  onConfirm: (thumbnailUri: string) => void;
}

export const ThumbnailEditor: React.FC<ThumbnailEditorProps> = ({
  visible,
  imageUri,
  onCancel,
  onConfirm,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Animated values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const minScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // 画像サイズ取得
  useEffect(() => {
    if (!visible || !imageUri) return;

    setLoading(true);

    Image.getSize(
      imageUri,
      (width, height) => {
        console.log('画像サイズ取得成功:', { width, height });
        setImageDimensions({ width, height });

        const { initial: initialScale, min: minScaleValue } = getScaleConfig(width, height);

        scale.value = initialScale;
        savedScale.value = initialScale;
        minScale.value = minScaleValue;
        translateX.value = 0;
        translateY.value = 0;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;

        setLoading(false);
      },
      (error) => {
        console.error('画像サイズ取得エラー:', error);
        setImageDimensions({ width: 1000, height: 1000 });
        const { initial: fallbackInitial, min: fallbackMin } = getScaleConfig(1000, 1000);
        scale.value = fallbackInitial;
        savedScale.value = fallbackInitial;
        minScale.value = fallbackMin;
        setLoading(false);
      }
    );
  }, [visible, imageUri]);

  // ピンチジェスチャー
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const pinchDelta = 1 + (e.scale - 1) * PINCH_SENSITIVITY;
      const targetScale = savedScale.value * pinchDelta;
      scale.value = Math.min(MAX_SCALE, Math.max(minScale.value, targetScale));
    })
    .onEnd(() => {
      // 最小スケール制限
      const clamped = Math.min(MAX_SCALE, Math.max(minScale.value, scale.value));
      scale.value = withSpring(clamped);
      savedScale.value = clamped;
    });

  // パンジェスチャー
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // ジェスチャーを同時実行可能にする
  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // リセット
  const handleReset = () => {
    if (imageDimensions.width === 0) return;

    const { initial: initialScale, min: resetMin } = getScaleConfig(
      imageDimensions.width,
      imageDimensions.height
    );

    scale.value = withSpring(initialScale);
    savedScale.value = initialScale;
    minScale.value = resetMin;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  // 確定
  const handleConfirm = async () => {
    if (processing || imageDimensions.width === 0) return;

    try {
      setProcessing(true);

      // 現在の変換値を取得
      const currentScale = Math.min(MAX_SCALE, Math.max(minScale.value, scale.value));
      const currentTranslateX = translateX.value;
      const currentTranslateY = translateY.value;
      scale.value = currentScale;
      savedScale.value = currentScale;

      // プレビュー領域の中心座標
      const previewCenterX = PREVIEW_WIDTH / 2;
      const previewCenterY = PREVIEW_HEIGHT / 2;

      // クロップ枠の中心座標（プレビュー領域内）
      const cropCenterX = previewCenterX;
      const cropCenterY = previewCenterY;

      // 画像の中心からクロップ枠の中心へのオフセット（スケール適用前）
      const offsetX = (cropCenterX - previewCenterX - currentTranslateX) / currentScale;
      const offsetY = (cropCenterY - previewCenterY - currentTranslateY) / currentScale;

      // クロップ領域を計算（元画像の座標系で）
      const cropRegion = calculateCropRegion(
        imageDimensions.width,
        imageDimensions.height,
        currentScale,
        offsetX,
        offsetY
      );

      console.log('サムネイル生成パラメータ:', {
        imageUri,
        imageDimensions,
        currentScale,
        currentTranslateX,
        currentTranslateY,
        offsetX,
        offsetY,
        cropRegion,
      });

      // サムネイル生成
      const thumbnailUri = await createThumbnail(imageUri, cropRegion);

      console.log('サムネイル生成完了:', thumbnailUri);

      onConfirm(thumbnailUri);
    } catch (error) {
      console.error('サムネイル生成エラー:', error);
      alert('サムネイルの生成に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={styles.loadingText}>画像を読み込んでいます...</Text>
            </View>
          ) : (
            <>
              <View style={styles.previewContainer}>
                {/* ジェスチャー対応の画像 */}
                <GestureDetector gesture={composed}>
                  <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                    <Image
                      source={{ uri: imageUri }}
                      style={{
                        width: imageDimensions.width,
                        height: imageDimensions.height,
                      }}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </GestureDetector>

                {/* クロップ枠（3:4） */}
                <View style={styles.cropFrame} pointerEvents="none" />

                {/* オーバーレイ（外側を暗く） */}
                <View style={styles.overlay} pointerEvents="none">
                  <View style={styles.overlayTop} />
                  <View style={styles.overlayMiddle}>
                    <View style={styles.overlaySide} />
                    <View style={styles.cropArea} />
                    <View style={styles.overlaySide} />
                  </View>
                  <View style={styles.overlayBottom} />
                </View>

                {/* ボタンを画像の上に配置 */}
                <View style={styles.topButtons}>
                  <TouchableOpacity
                    onPress={onCancel}
                    disabled={processing}
                    style={styles.topButton}
                  >
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirm}
                    disabled={processing}
                    style={styles.topButton}
                  >
                    <Ionicons name="checkmark" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.controls}>
                <Text style={styles.instruction}>
                  ピンチで拡大・縮小、ドラッグで移動できます
                </Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                    <Ionicons name="refresh" size={18} color={theme.colors.accent} />
                    <Text style={styles.resetButtonText}>リセット</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.md,
    },
    previewContainer: {
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cropFrame: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: CROP_WIDTH,
      height: CROP_HEIGHT,
      marginLeft: -CROP_WIDTH / 2,
      marginTop: -CROP_HEIGHT / 2,
      borderWidth: 2,
      borderColor: theme.colors.accent,
      borderRadius: theme.borderRadius.md,
      zIndex: 10,
    },
    imageWrapper: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 5,
    },
    overlayTop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayMiddle: {
      flexDirection: 'row',
      height: CROP_HEIGHT,
    },
    overlaySide: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    cropArea: {
      width: CROP_WIDTH,
    },
    overlayBottom: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    topButtons: {
      position: 'absolute',
      top: theme.spacing.lg,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      zIndex: 20,
    },
    topButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    controls: {
      marginTop: theme.spacing.lg,
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    instruction: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.full,
      minHeight: 44,
    },
    resetButtonText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.semibold,
    },
  });
