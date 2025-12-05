import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import CardyImage from '../../components/common/CardyImage';
import CardyVideo from '../../components/common/CardyVideo';
import { useTheme, Theme } from '../../theme';
import { useNavigation, useIsFocused } from '@react-navigation/native';

type MediaMode = 'photo' | 'video' | 'story';

export const CameraScreen: React.FC = () => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [mediaMode, setMediaMode] = useState<MediaMode>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState<{ uri: string; type: MediaMode } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const isWeb = Platform.OS === 'web';
  const getCameraPermissionHook = isWeb
    ? (() => [{ granted: true }, async () => true] as const)
    : useCameraPermissions;
  const [cameraPermission, requestCameraPermission] = getCameraPermissionHook();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const webVideoObjectUrlRef = useRef<string | null>(null);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const effectiveMediaLibraryPermission = isWeb
    ? { granted: true }
    : mediaLibraryPermission;
  const requestMediaLibrary = isWeb
    ? async () => true
    : requestMediaLibraryPermission;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // 撮影フィードバック用のアニメーション
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const shutterScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!isWeb && !effectiveMediaLibraryPermission?.granted) {
        await requestMediaLibrary();
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  const releaseWebVideoObject = useCallback(() => {
    if (Platform.OS === 'web' && webVideoObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(webVideoObjectUrlRef.current);
      } catch (error) {
        console.warn('Web video revoke error', error);
      } finally {
        webVideoObjectUrlRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      releaseWebVideoObject();
    };
  }, [releaseWebVideoObject]);

  const toggleCameraFacing = () => {
    console.log('カメラ切り替え');
    setCameraReady(false);
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    console.log('フラッシュ切り替え');
    setFlash(current => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };

  const getFlashIcon = () => {
    if (flash === 'on') return 'flash';
    if (flash === 'auto') return 'flash-outline';
    return 'flash-off';
  };

  // 撮影フィードバックアニメーション
  const triggerCaptureAnimation = () => {
    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.timing(shutterScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shutterScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const resolveLocalUri = async (
    asset: ImagePicker.ImagePickerAsset
  ): Promise<string | null> => {
    if (!isWeb && asset.uri.startsWith('ph://') && asset.assetId) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset.assetId, {
          shouldDownloadFromNetwork: true,
        });
        if (info?.localUri) {
          return info.localUri;
        }
        if (info?.uri?.startsWith('file://')) {
          return info.uri;
        }
      } catch (error) {
        console.warn('Failed to resolve local URI:', error);
      }
      Alert.alert(
        '読み込みエラー',
        '選択した写真を読み込めませんでした。端末の写真へのアクセス権限を確認してください。'
      );
      return null;
    }
    return asset.uri;
  };

  const pickFromGallery = async () => {
    console.log('ギャラリー選択');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaMode === 'video' 
          ? ImagePicker.MediaTypeOptions.Videos 
          : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = await resolveLocalUri(result.assets[0]);
        if (!localUri) {
          return;
        }
        setCapturedMedia({ 
          uri: localUri, 
          type: mediaMode,
        });
      }
    } catch (error) {
      console.error('ギャラリー選択エラー:', error);
      Alert.alert('エラー', 'メディアの選択に失敗しました');
    }
  };

  const takePicture = async () => {
    console.log('写真撮影');
    if (cameraRef.current) {
      try {
        triggerCaptureAnimation();
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1.0, // 最高品質
          skipProcessing: false, // 画像処理を有効化
          exif: true, // EXIF情報を含める
          imageType: 'jpg',
        });
        
        if (photo?.uri) {
          console.log('撮影成功:', photo.uri);
          setCapturedMedia({ uri: photo.uri, type: mediaMode });
        }
      } catch (error) {
        console.error('撮影エラー:', error);
        Alert.alert('エラー', '写真の撮影に失敗しました');
      }
    }
  };

  const pickWebVideo = useCallback(() => {
    if (Platform.OS !== 'web') {
      return false;
    }
    const doc: any = typeof document !== 'undefined' ? document : null;
    if (!doc) {
      Alert.alert('エラー', 'Web で動画を選択できませんでした');
      return false;
    }
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    ;(input as any).capture = 'environment';
    input.onchange = () => {
      const file = (input as any).files?.[0];
      if (file) {
        try {
          releaseWebVideoObject();
        } catch (error) {
          // ignore
        }
        const objectUrl = URL.createObjectURL(file);
        webVideoObjectUrlRef.current = objectUrl;
        setCapturedMedia({ uri: objectUrl, type: 'video' });
      }
    };
    input.click();
    return true;
  }, [releaseWebVideoObject]);

  const startRecording = async () => {
    console.log('録画開始');
    if (Platform.OS === 'web') {
      pickWebVideo();
      return;
    }
    if (!cameraRef.current || isRecording) {
      return;
    }
    try {
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
        mute: false,
      });
      
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      
      if (video?.uri) {
        console.log('録画完了:', video.uri);
        setCapturedMedia({ uri: video.uri, type: 'video' });
      }
    } catch (error) {
      console.error('録画エラー:', error);
      Alert.alert('エラー', '動画の録画に失敗しました');
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    }
  };

  const stopRecording = useCallback(() => {
    console.log('録画停止');
    if (cameraRef.current && isRecording) {
      try {
        cameraRef.current.stopRecording();
      } catch (error) {
        console.error('録画停止エラー:', error);
      } finally {
        setIsRecording(false);
        if (recordingInterval.current) {
          clearInterval(recordingInterval.current);
        }
      }
    }
  }, [isRecording]);

  useEffect(() => {
    if (!isFocused) {
      setCameraReady(false);
      if (isRecording) {
        stopRecording();
      }
    }
  }, [isFocused, isRecording, stopRecording]);

  const handleCapturePress = () => {
    console.log('撮影ボタン押下, モード:', mediaMode);
    if (mediaMode === 'video') {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    } else {
      takePicture();
    }
  };

  const handleModeChange = (mode: MediaMode) => {
    console.log('モード変更:', mode);
    setMediaMode(mode);
  };

  const saveMedia = async () => {
    if (!capturedMedia) return;

    try {
      const assetUri = capturedMedia.uri;

      if (capturedMedia.type === 'story') {
        navigation.navigate('StoryEdit' as never, { 
          imageUri: assetUri,
        } as never);
      } else {
        navigation.navigate('CardEdit' as never, { 
          mediaUri: assetUri,
          mediaType: capturedMedia.type
        } as never);
      }
      
      if (Platform.OS === 'web' && capturedMedia.type === 'video') {
        releaseWebVideoObject();
      }
      setCapturedMedia(null);
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', 'メディアの保存に失敗しました');
    }
  };

  const retake = () => {
    if (Platform.OS === 'web' && capturedMedia?.type === 'video') {
      releaseWebVideoObject();
    }
    setCapturedMedia(null);
    setCameraReady(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!cameraPermission || (!isWeb && !effectiveMediaLibraryPermission)) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>カメラの権限を確認中...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>カメラへのアクセスが必要です</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>許可する</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 撮影後のプレビュー画面
  if (capturedMedia) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.previewContainer}>
          {capturedMedia.type === 'photo' || capturedMedia.type === 'story' ? (
            <CardyImage
              source={{ uri: capturedMedia.uri }}
              style={[styles.previewImage, facing === 'front' && styles.mirroredPreview]}
              contentFit="contain"
              alt="キャプチャプレビュー"
              priority
            />
          ) : (
            <CardyVideo
              source={{ uri: capturedMedia.uri }}
              style={[styles.videoPreview, facing === 'front' && styles.mirroredPreview]}
              resizeMode="contain"
              shouldPlay
              isLooping
              useNativeControls
            />
          )}
          
          <View style={styles.previewControls}>
            <TouchableOpacity style={styles.previewButton} onPress={retake}>
              <Ionicons name="close-circle" size={60} color={theme.colors.secondary} />
              <Text style={styles.previewButtonText}>撮り直す</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.previewButton} onPress={saveMedia}>
              <Ionicons name="checkmark-circle" size={60} color={theme.colors.accent} />
              <Text style={styles.previewButtonText}>次へ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // カメラ撮影画面
  return (
    <View style={styles.container}>
      <View style={styles.cameraWrapper}>
        {isFocused ? (
          <CameraView
            style={styles.camera}
            facing={facing}
            flash={mediaMode === 'photo' || mediaMode === 'story' ? flash : 'off'}
            ref={cameraRef}
            mode={mediaMode === 'video' ? 'video' : 'picture'}
            videoStabilizationMode="auto"
            enableTorch={false}
            onCameraReady={() => setCameraReady(true)}
            onMountError={error => {
              console.error('カメラ初期化エラー:', error);
              Alert.alert('カメラエラー', 'カメラの初期化に失敗しました');
            }}
          />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraPlaceholderText}>カメラを待機中...</Text>
          </View>
        )}
        {isFocused && !cameraReady && (
          <View style={styles.cameraLoadingOverlay}>
            <ActivityIndicator color={theme.colors.secondary} size="large" />
            <Text style={styles.cameraPlaceholderText}>カメラを初期化しています...</Text>
          </View>
        )}
      </View>
      
      {/* 撮影フィードバック用の白いフラッシュ */}
      <Animated.View 
        style={[
          styles.flashOverlay,
          { opacity: flashOpacity }
        ]} 
        pointerEvents="none"
      />

      {/* UIオーバーレイ - カメラの上に配置 */}
      <SafeAreaView style={styles.uiOverlay} edges={['top']}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => {
              console.log('閉じるボタン');
              navigation.goBack();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={32} color={theme.colors.secondary} />
          </TouchableOpacity>
          
          <View style={styles.modeSelector}>
            <TouchableOpacity 
              style={[styles.modeButton, mediaMode === 'photo' && styles.modeButtonActive]}
              onPress={() => {
                console.log('写真モードに変更');
                handleModeChange('photo');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeText, mediaMode === 'photo' && styles.modeTextActive]}>
                写真
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modeButton, mediaMode === 'video' && styles.modeButtonActive]}
              onPress={() => {
                console.log('動画モードに変更');
                handleModeChange('video');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeText, mediaMode === 'video' && styles.modeTextActive]}>
                動画
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modeButton, mediaMode === 'story' && styles.modeButtonActive]}
              onPress={() => {
                console.log('ストーリーモードに変更');
                handleModeChange('story');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeText, mediaMode === 'story' && styles.modeTextActive]}>
                ストーリー
              </Text>
            </TouchableOpacity>
          </View>

          {mediaMode !== 'video' ? (
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => {
                console.log('フラッシュ切り替え');
                toggleFlash();
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={getFlashIcon()} 
                size={28} 
                color={theme.colors.secondary} 
              />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {/* 録画中インジケーター */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>{formatTime(recordingTime)}</Text>
          </View>
        )}

        {/* コントロールエリア */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => {
              console.log('ギャラリー選択');
              pickFromGallery();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.galleryButton}>
              <Ionicons name="images-outline" size={28} color={theme.colors.secondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.shutterButtonContainer}
            onPress={() => {
              console.log('シャッターボタン押下');
              handleCapturePress();
            }}
            activeOpacity={0.8}
          >
            <Animated.View 
              style={[
                styles.shutterButton,
                mediaMode === 'video' && styles.shutterButtonVideo,
                isRecording && styles.shutterButtonRecording,
                { transform: [{ scale: shutterScale }] }
              ]}
            >
              {mediaMode === 'video' && isRecording ? (
                <View style={styles.stopIcon} />
              ) : mediaMode === 'video' ? (
                <View style={styles.recordIcon} />
              ) : null}
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => {
              console.log('カメラ切り替え: 現在', facing);
              toggleCameraFacing();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.flipButton}>
              <Ionicons name="camera-reverse-outline" size={28} color={theme.colors.secondary} />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.primary,
    },
  cameraWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  cameraPlaceholderText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  cameraLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  uiOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.secondary,
    zIndex: 10,
  },
  message: {
    textAlign: 'center',
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  permissionButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: theme.borderRadius.full,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: theme.borderRadius.full,
    padding: 4,
  },
  modeButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  modeButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  modeText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.sm,
    opacity: 0.7,
  },
  modeTextActive: {
    opacity: 1,
    fontWeight: theme.fontWeight.semibold,
  },
  recordingIndicator: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.md,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.secondary,
    marginRight: theme.spacing.sm,
  },
  recordingText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: theme.spacing.md,
  },
  controlButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButtonContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondary,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButtonVideo: {
    backgroundColor: theme.colors.error,
  },
  shutterButtonRecording: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.secondary,
  },
  stopIcon: {
    width: 20,
    height: 20,
    backgroundColor: theme.colors.error,
    borderRadius: 2,
  },
  recordIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.error,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  previewImage: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.primary,
  },
  videoPreview: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  previewControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.xl,
  },
  previewButton: {
    alignItems: 'center',
  },
  previewButtonText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  mirroredPreview: {
    transform: [{ scaleX: -1 }],
  },
  });
