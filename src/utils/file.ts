import * as FileSystem from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';

const base64Encoding = (FileSystem.EncodingType?.Base64 ?? 'base64') as FileSystem.EncodingType;

export const readFileAsArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: base64Encoding,
  });

  return decodeBase64(base64);
};

export const readUriAsArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  if (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('http')) {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await blob.arrayBuffer();
  }
  return readFileAsArrayBuffer(uri);
};
