import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

interface CropRegion {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

// 3:4のアスペクト比
export const THUMBNAIL_ASPECT_RATIO = 0.75;
export const THUMBNAIL_WIDTH = 600;

export const calculateCropRegion = (
  imageWidth: number,
  imageHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number
): CropRegion => {
  // クロップする領域のサイズ（元画像の座標系で）
  let cropWidth = Math.max(1, Math.min(imageWidth, imageWidth / scale));
  let cropHeight = cropWidth / THUMBNAIL_ASPECT_RATIO;

  if (cropHeight > imageHeight) {
    cropHeight = imageHeight;
    cropWidth = cropHeight * THUMBNAIL_ASPECT_RATIO;
  }

  if (cropWidth > imageWidth) {
    cropWidth = imageWidth;
    cropHeight = cropWidth / THUMBNAIL_ASPECT_RATIO;
  }

  cropWidth = Math.max(1, Math.min(imageWidth, cropWidth));
  cropHeight = Math.max(1, Math.min(imageHeight, cropHeight));

  // クロップ領域の左上座標（元画像の座標系で）
  let originX = imageWidth / 2 - cropWidth / 2 + offsetX;
  let originY = imageHeight / 2 - cropHeight / 2 + offsetY;

  // 範囲チェック
  originX = Math.max(0, Math.min(originX, imageWidth - cropWidth));
  originY = Math.max(0, Math.min(originY, imageHeight - cropHeight));

  return {
    originX: Math.round(originX),
    originY: Math.round(originY),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
};

export const createThumbnail = async (
  imageUri: string,
  cropRegion: CropRegion
): Promise<string> => {
  try {
    console.log('createThumbnail 開始:', { imageUri, cropRegion });

    // クロップ＆リサイズ
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          crop: {
            originX: cropRegion.originX,
            originY: cropRegion.originY,
            width: cropRegion.width,
            height: cropRegion.height,
          },
        },
        {
          resize: {
            width: THUMBNAIL_WIDTH,
            height: Math.round(THUMBNAIL_WIDTH / THUMBNAIL_ASPECT_RATIO),
          },
        },
      ],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('createThumbnail 完了:', manipulatedImage.uri);
    return manipulatedImage.uri;
  } catch (error) {
    console.error('createThumbnail エラー:', error);
    throw error;
  }
};

export const getImageDimensions = (uri: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'web') {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = uri;
    } else {
      const Image = require('react-native').Image;
      Image.getSize(
        uri,
        (width: number, height: number) => {
          resolve({ width, height });
        },
        reject
      );
    }
  });
};
