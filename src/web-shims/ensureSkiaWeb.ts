// src/web-shims/ensureSkiaWeb.ts
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

let skiaPromise: Promise<void> | null = null;
let isLoaded = false;

export function ensureSkiaWeb(): Promise<void> {
  // SSR や node では実行しない
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  // すでにロード済みなら Promise を返す
  if (isLoaded || (globalThis as any).CanvasKit) {
    isLoaded = true;
    return Promise.resolve();
  }

  // 一度だけ実行する
  if (!skiaPromise) {
    skiaPromise = LoadSkiaWeb({
      locateFile: (file) => {
        // CanvasKitのパスを複数試行
        const paths = [
          `/canvaskit/${file}`,
          `https://unpkg.com/canvaskit-wasm@latest/bin/${file}`,
        ];
        return paths[0];
      },
    })
      .then(() => {
        isLoaded = true;
        console.log('[Skia] Loaded successfully');
      })
      .catch((err) => {
        console.warn('[Skia] Failed to load, using fallback:', err);
        // エラーでもPromiseをresolveする（アプリが動き続けるように）
        isLoaded = false;
        return Promise.resolve();
      });
  }

  return skiaPromise;
}

// 自動プレロード（重要）
if (typeof window !== "undefined") {
  ensureSkiaWeb().catch(() => {
    console.warn('[Skia] Preload failed, will use fallback');
  });
}

// WebAssemblyのサポートチェック
export function isWebAssemblySupported(): boolean {
  try {
    if (typeof WebAssembly === 'object' && 
        typeof WebAssembly.instantiate === 'function') {
      return true;
    }
  } catch (e) {
    console.warn('[Skia] WebAssembly not supported:', e);
  }
  return false;
}