import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

let loadPromise: Promise<void> | null = null;

export const ensureSkiaWeb = () => {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (global.CanvasKit) {
    return Promise.resolve();
  }
  if (!loadPromise) {
    loadPromise = LoadSkiaWeb({
      locateFile: (file: string) => `/canvaskit/${file}`,
    }).catch((error) => {
      console.error('Failed to initialise Skia Web runtime', error);
      throw error;
    });
  }
  return loadPromise;
};

if (typeof window !== 'undefined') {
  // Kick off loading immediately so that the promise is warm for the editors.
  ensureSkiaWeb().catch(() => {
    // エラーは ensureSkiaWeb 内でログ済み。ここでは無視。
  });
}
