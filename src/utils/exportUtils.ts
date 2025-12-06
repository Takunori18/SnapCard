// src/utils/exportUtils.ts
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { EditorSnapshot } from '../store/editorStore';
import { Skia, Canvas as SkCanvas } from '@shopify/react-native-skia';
import { supabase } from '../lib/supabase';

export type ExportFormat = 'png' | 'jpg' | 'webp';

export type ExportOptions = {
  quality?: number;
  scale?: number;
  backgroundColor?: string;
};

/**
 * Skiaキャンバスから画像を生成（実機対応）
 */
export const exportToImage = async (
  snapshot: EditorSnapshot,
  format: ExportFormat = 'png',
  options: ExportOptions = {}
): Promise<string> => {
  const {
    quality = 1,
    scale = 1,
    backgroundColor = '#FFFFFF',
  } = options;

  try {
    const { canvas, elements } = snapshot;
    const width = Math.floor(canvas.width * scale);
    const height = Math.floor(canvas.height * scale);

    // Surface作成
    const surface = Skia.Surface.Make(width, height);
    if (!surface) {
      throw new Error('Failed to create Skia surface');
    }

    const skCanvas = surface.getCanvas();

    // 背景描画
    const bgPaint = Skia.Paint();
    bgPaint.setColor(Skia.Color(backgroundColor));
    skCanvas.drawRect(Skia.XYWHRect(0, 0, width, height), bgPaint);

    // スケール適用
    skCanvas.scale(scale, scale);

    // 背景画像
    if (canvas.backgroundImage) {
      try {
        const bgImage = await loadImageFromUri(canvas.backgroundImage);
        if (bgImage) {
          const srcRect = Skia.XYWHRect(0, 0, bgImage.width(), bgImage.height());
          const dstRect = Skia.XYWHRect(0, 0, canvas.width, canvas.height);
          skCanvas.drawImageRect(bgImage, srcRect, dstRect, Skia.Paint());
        }
      } catch (error) {
        console.error('背景画像ロードエラー:', error);
      }
    }

    // 各要素を描画
    for (const element of elements) {
      if (element.visible === false) continue;

      skCanvas.save();

      const { x, y, scale: elScale, rotation } = element.transform;
      skCanvas.translate(x, y);
      skCanvas.rotate((rotation * Math.PI) / 180, 0, 0);
      skCanvas.scale(elScale, elScale);

      try {
        switch (element.type) {
          case 'text':
            await drawTextElement(skCanvas, element);
            break;
          case 'image':
            await drawImageElement(skCanvas, element);
            break;
          case 'shape':
            drawShapeElement(skCanvas, element);
            break;
          case 'drawing':
            drawDrawingElement(skCanvas, element);
            break;
        }
      } catch (error) {
        console.error(`要素描画エラー (${element.type}):`, error);
      }

      skCanvas.restore();
    }

    // 画像生成
    const image = surface.makeImageSnapshot();
    if (!image) {
      throw new Error('Failed to create image snapshot');
    }

    // エンコード
    let base64Data: string;
    if (format === 'png') {
      base64Data = image.encodeToBase64();
    } else if (format === 'jpg') {
      base64Data = image.encodeToBase64(Skia.ImageFormat.JPEG, Math.round(quality * 100));
    } else {
      base64Data = image.encodeToBase64(Skia.ImageFormat.WEBP, Math.round(quality * 100));
    }

    // ファイル保存
    const fileName = `card_${Date.now()}.${format}`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return filePath;
  } catch (error) {
    console.error('エクスポートエラー:', error);
    throw error;
  }
};

/**
 * URIから画像をロード
 */
const loadImageFromUri = async (uri: string): Promise<any> => {
  try {
    // ローカルファイルの場合
    if (uri.startsWith('file://') || uri.startsWith('/')) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const data = Skia.Data.fromBase64(base64);
      return Skia.Image.MakeImageFromEncoded(data);
    }

    // HTTPの場合
    const response = await fetch(uri);
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    const data = Skia.Data.fromBase64(base64);
    return Skia.Image.MakeImageFromEncoded(data);
  } catch (error) {
    console.error('画像ロードエラー:', error);
    return null;
  }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * テキスト要素を描画
 */
const drawTextElement = async (canvas: any, element: any) => {
  const { text, fontSize, color, fontFamily, backgroundColor } = element;
  const opacity = element.opacity ?? 1;

  // 背景
  if (backgroundColor && backgroundColor !== 'transparent') {
    const bgPaint = Skia.Paint();
    bgPaint.setColor(Skia.Color(backgroundColor));
    bgPaint.setAlphaf(opacity);
    
    const textWidth = text.length * fontSize * 0.6;
    const textHeight = fontSize * 1.2;
    canvas.drawRect(Skia.XYWHRect(0, 0, textWidth, textHeight), bgPaint);
  }

  // テキスト
  const font = Skia.Font(null, fontSize);
  const textPaint = Skia.Paint();
  textPaint.setColor(Skia.Color(color));
  textPaint.setAlphaf(opacity);

  const textBlob = Skia.TextBlob.MakeFromText(text, font);
  if (textBlob) {
    canvas.drawTextBlob(textBlob, 0, fontSize, textPaint);
  }
};

/**
 * 画像要素を描画
 */
const drawImageElement = async (canvas: any, element: any) => {
  const { uri, width, height, flipX, flipY } = element;
  const opacity = element.opacity ?? 1;

  const image = await loadImageFromUri(uri);
  if (!image) return;

  canvas.save();
  
  if (flipX) {
    canvas.scale(-1, 1);
    canvas.translate(-width, 0);
  }
  
  if (flipY) {
    canvas.scale(1, -1);
    canvas.translate(0, -height);
  }

  const paint = Skia.Paint();
  paint.setAlphaf(opacity);

  const srcRect = Skia.XYWHRect(0, 0, image.width(), image.height());
  const dstRect = Skia.XYWHRect(0, 0, width, height);
  canvas.drawImageRect(image, srcRect, dstRect, paint);

  canvas.restore();
};

/**
 * 図形要素を描画
 */
const drawShapeElement = (canvas: any, element: any) => {
  const { shapeType, width, height, fillColor, strokeColor, strokeWidth, cornerRadius } = element;
  const opacity = element.opacity ?? 1;

  // 塗りつぶし
  const fillPaint = Skia.Paint();
  fillPaint.setColor(Skia.Color(fillColor));
  fillPaint.setAlphaf(opacity);

  // 枠線
  const strokePaint = strokeWidth ? Skia.Paint() : null;
  if (strokePaint && strokeColor) {
    strokePaint.setColor(Skia.Color(strokeColor));
    strokePaint.setStyle(1); // Stroke
    strokePaint.setStrokeWidth(strokeWidth);
  }

  switch (shapeType) {
    case 'rect':
      const rect = Skia.XYWHRect(0, 0, width, height);
      canvas.drawRect(rect, fillPaint);
      if (strokePaint) canvas.drawRect(rect, strokePaint);
      break;

    case 'roundRect':
      const rRect = Skia.RRectXY(
        Skia.XYWHRect(0, 0, width, height),
        cornerRadius || 10,
        cornerRadius || 10
      );
      canvas.drawRRect(rRect, fillPaint);
      if (strokePaint) canvas.drawRRect(rRect, strokePaint);
      break;

    case 'circle':
      const radius = Math.min(width, height) / 2;
      canvas.drawCircle(width / 2, height / 2, radius, fillPaint);
      if (strokePaint) canvas.drawCircle(width / 2, height / 2, radius, strokePaint);
      break;

    case 'ellipse':
      const ellipseRect = Skia.XYWHRect(0, 0, width, height);
      canvas.drawOval(ellipseRect, fillPaint);
      if (strokePaint) canvas.drawOval(ellipseRect, strokePaint);
      break;
  }
};

/**
 * 描画要素を描画
 */
const drawDrawingElement = (canvas: any, element: any) => {
  const { points, color, strokeWidth, brushType } = element;
  const opacity = element.opacity ?? 1;

  if (!points || points.length < 2) return;

  const path = Skia.Path.Make();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y);
  }

  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setStyle(1); // Stroke
  paint.setStrokeWidth(strokeWidth || 5);
  paint.setStrokeCap(1); // Round
  paint.setStrokeJoin(1); // Round

  let alpha = opacity;
  if (brushType === 'marker') alpha *= 0.7;
  if (brushType === 'highlighter') alpha *= 0.4;
  paint.setAlphaf(alpha);

  canvas.drawPath(path, paint);
};

/**
 * フォトライブラリに保存
 */
export const saveToPhotoLibrary = async (uri: string): Promise<void> => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', 'フォトライブラリへの保存権限を許可してください。');
      return;
    }

    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert('✅ 保存完了', '画像をフォトライブラリに保存しました');
  } catch (error) {
    console.error('保存エラー:', error);
    Alert.alert('エラー', '画像の保存に失敗しました');
  }
};

/**
 * 共有
 */
export const shareImage = async (uri: string): Promise<void> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('エラー', 'この端末では共有機能が利用できません');
      return;
    }

    await Sharing.shareAsync(uri);
  } catch (error) {
    console.error('共有エラー:', error);
    Alert.alert('エラー', '画像の共有に失敗しました');
  }
};

/**
 * サムネイル生成
 */
export const generateThumbnail = async (
  snapshot: EditorSnapshot,
  size: number = 400
): Promise<string> => {
  const scale = size / Math.max(snapshot.canvas.width, snapshot.canvas.height);
  return exportToImage(snapshot, 'jpg', {
    quality: 0.8,
    scale,
  });
};

/**
 * Supabase Storageにアップロード（card-imagesバケット）
 */
export const uploadToSupabase = async (
  uri: string,
  userId: string,
  fileName?: string
): Promise<string> => {
  try {
    const timestamp = Date.now();
    const finalFileName = fileName || `card_${userId}_${timestamp}.jpg`;
    const filePath = `${userId}/${finalFileName}`;

    // Base64変換
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // アップロード
    const { data, error } = await supabase.storage
      .from('card-images')
      .upload(filePath, decode(base64), {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    // 公開URL取得
    const { data: { publicUrl } } = supabase.storage
      .from('card-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Supabaseアップロードエラー:', error);
    throw error;
  }
};

/**
 * Base64デコード（Uint8Arrayへ）
 */
const decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};
