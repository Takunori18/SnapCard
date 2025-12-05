import React, { useMemo } from 'react';
import { Platform, StyleProp, ViewStyle, View } from 'react-native';

type ResizeModeOption = 'contain' | 'cover';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      video: any;
    }
  }
}

interface VideoSource {
  uri: string;
}

export interface CardyVideoProps {
  source: VideoSource;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ResizeModeOption;
  shouldPlay?: boolean;
  isLooping?: boolean;
  useNativeControls?: boolean;
  muted?: boolean;
  onLoad?: (payload: { durationMillis?: number }) => void;
  onPlaybackStatusUpdate?: (status: any) => void;
}

const isWeb = Platform.OS === 'web';
let ExpoVideo: any = null;
let ExpoResizeMode: any = null;

if (!isWeb) {
  try {
    const expoAv = require('expo-av');
    ExpoVideo = expoAv.Video;
    ExpoResizeMode = expoAv.ResizeMode;
  } catch (error) {
    console.warn('[CardyVideo] expo-av の読み込みに失敗しました。', error);
    ExpoVideo = null;
  }
}

const mapExpoResizeMode = (mode?: ResizeModeOption) => {
  if (!ExpoResizeMode) {
    return mode === 'contain' ? 'contain' : 'cover';
  }
  return mode === 'contain' ? ExpoResizeMode.CONTAIN : ExpoResizeMode.COVER;
};

const CardyVideo: React.FC<CardyVideoProps> = ({
  source,
  style,
  resizeMode = 'cover',
  shouldPlay,
  isLooping,
  useNativeControls = true,
  muted,
  onLoad,
  onPlaybackStatusUpdate,
}) => {
  const videoUri = source?.uri;
  const webObjectFit = useMemo(
    () => (resizeMode === 'contain' ? 'contain' : 'cover'),
    [resizeMode]
  );

  if (!videoUri) {
    return null;
  }

  // Web: React Native の style は View に渡し、<video> には純粋な CSS を渡す
  if (isWeb) {
    return (
      <View style={style}>
        <video
          src={videoUri}
          style={{
            width: '100%',
            height: '100%',
            objectFit: webObjectFit,
            display: 'block',
          }}
          controls={useNativeControls}
          muted={muted}
          autoPlay={shouldPlay}
          loop={isLooping}
          playsInline
          onLoadedData={(event) => {
            const duration = event.currentTarget.duration;
            onLoad?.({
              durationMillis: Number.isFinite(duration)
                ? duration * 1000
                : undefined,
            });
          }}
        />
      </View>
    );
  }

  // ネイティブ: expo-av の Video をそのまま使用
  if (!ExpoVideo) {
    return null;
  }

  return (
    <ExpoVideo
      source={{ uri: videoUri }}
      style={style}
      resizeMode={mapExpoResizeMode(resizeMode)}
      shouldPlay={shouldPlay}
      isLooping={isLooping}
      useNativeControls={useNativeControls}
      isMuted={muted}
      onLoad={(status: any) =>
        onLoad?.({ durationMillis: status?.durationMillis })
      }
      onPlaybackStatusUpdate={onPlaybackStatusUpdate}
    />
  );
};

export default CardyVideo;
