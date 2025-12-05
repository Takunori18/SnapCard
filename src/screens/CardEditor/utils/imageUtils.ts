import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

type ResizeOptions = {
  maxWidth?: number;
};

const DEFAULT_WIDTH = 1200;

const toDataUri = (base64: string) => `data:image/png;base64,${base64}`;

export const prepareImageAsset = async (uri: string, options: ResizeOptions = {}) => {
  const maxWidth = options.maxWidth ?? DEFAULT_WIDTH;
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: Platform.OS === 'web' ? 0.7 : 0.8, format: ImageManipulator.SaveFormat.PNG, base64: true }
    );
    if (result.base64) {
      return toDataUri(result.base64);
    }
    return result.uri;
  } catch (error) {
    console.warn('Failed to manipulate image, fallback to original URI', error);
    return uri;
  }
};
