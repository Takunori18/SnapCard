/**
 * CardyImage はアプリ全体の画像読み込みを統一する共通コンポーネントです。
 * すべての画像表示でこのラッパーを利用し、Instagram 風の遅延読み込み / プレースホルダを実現します。
 */
import React, { useMemo } from 'react';
import { StyleProp, ImageStyle, Image as RNImage, Platform } from 'react-native';
import type { ImageProps as ExpoImageProps, ImageSource } from 'expo-image';

const hasWebAssemblySupport =
  typeof globalThis !== 'undefined' && typeof (globalThis as any).WebAssembly !== 'undefined';
const canAttemptExpoImage = Platform.OS !== 'web' || hasWebAssemblySupport;

type ExpoImageComponent = typeof import('expo-image').Image;
let ExpoImageComponentRef: ExpoImageComponent | null = null;

if (canAttemptExpoImage) {
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    ExpoImageComponentRef = require('expo-image').Image;
  } catch (error) {
    console.warn('[CardyImage] expo-image の読み込みに失敗したため、RN Image にフォールバックします。', error);
    ExpoImageComponentRef = null;
  }
}

type AllowedSource = ImageSource | ImageSource[] | string | number | null | undefined;

export interface CardyImageProps
  extends Omit<ExpoImageProps, 'source' | 'style' | 'placeholder' | 'priority'> {
  source?: AllowedSource;
  style?: StyleProp<ImageStyle>;
  width?: number;
  height?: number;
  blurhash?: string;
  borderRadius?: number;
  priority?: boolean;
  resizeMode?: 'cover' | 'contain' | 'center';
}

const mapResizeModeToContentFit = (
  resizeMode: CardyImageProps['resizeMode'],
  fallbackFit: ExpoImageProps['contentFit'],
) => {
  if (fallbackFit) return fallbackFit;
  switch (resizeMode) {
    case 'contain':
      return 'contain';
    case 'center':
      return 'contain';
    default:
      return 'cover';
  }
};

const normalizeSource = (input: AllowedSource): ImageSource | ImageSource[] | null => {
  if (input == null) return null;

  if (typeof input === 'string') {
    return { uri: input };
  }

  if (typeof input === 'number') {
    return input;
  }

  if (Array.isArray(input)) {
    const normalized = input
      .map((item) => normalizeSource(item))
      .filter(Boolean) as ImageSource[];
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof input === 'object' && 'uri' in input) {
    return input;
  }

  return input as ImageSource;
};

export const CardyImage: React.FC<CardyImageProps> = ({
  source,
  style,
  width,
  height,
  blurhash,
  borderRadius,
  resizeMode = 'cover',
  priority = false,
  alt,
  accessibilityLabel,
  accessible,
  cachePolicy = 'disk',
  contentFit,
  placeholderContentFit,
  transition,
  ...restProps
}) => {
  const resolvedSource = useMemo(() => normalizeSource(source), [source]);
  const finalStyle = useMemo(
    () => [
      {
        width,
        height,
        borderRadius,
      },
      style,
    ],
    [borderRadius, height, style, width],
  );

  const computedContentFit = useMemo(
    () => mapResizeModeToContentFit(resizeMode, contentFit),
    [contentFit, resizeMode],
  );

  const placeholderValue = blurhash ?? undefined;
  const effectiveAccessibilityLabel = accessibilityLabel ?? alt;
  const isAccessible = accessible ?? Boolean(effectiveAccessibilityLabel);
  const shouldUseExpoImage = Boolean(ExpoImageComponentRef);

  if (!resolvedSource) {
    return null;
  }

  if (!shouldUseExpoImage) {
    return (
      <RNImage
        source={resolvedSource as any}
        style={finalStyle}
        resizeMode={resizeMode}
        accessible={isAccessible}
        accessibilityLabel={effectiveAccessibilityLabel}
      />
    );
  }

  const ExpoImage = ExpoImageComponentRef!;

  return (
    <ExpoImage
      source={resolvedSource}
      style={finalStyle}
      contentFit={computedContentFit}
      placeholder={placeholderValue}
      placeholderContentFit={placeholderContentFit ?? computedContentFit}
      cachePolicy={cachePolicy}
      transition={transition ?? (priority ? 150 : 320)}
      priority={priority ? 'high' : 'normal'}
      accessible={isAccessible}
      accessibilityLabel={effectiveAccessibilityLabel}
      alt={alt}
      {...restProps}
    />
  );
};

export default CardyImage;
