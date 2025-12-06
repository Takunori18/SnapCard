// src/web-shims/ensureSkiaWeb.ts
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

let skiaPromise: Promise<void> | null = null;
let isLoaded = false;

export function ensureSkiaWeb(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (isLoaded || (globalThis as any).CanvasKit) {
    isLoaded = true;
    return Promise.resolve();
  }

  if (!skiaPromise) {
    skiaPromise = LoadSkiaWeb({
      locateFile: (file) => {
        // 複数のCDNフォールバック
        const paths = [
          `/canvaskit/${file}`,
          `https://unpkg.com/canvaskit-wasm@latest/bin/${file}`,
          `https://cdn.jsdelivr.net/npm/canvaskit-wasm@latest/bin/${file}`,
        ];
        return paths[0];
      },
    })
      .then(() => {
        isLoaded = true;
        console.log('[Skia] ✅ CanvasKit loaded successfully');
      })
      .catch((err) => {
        console.error('[Skia] ❌ Failed to load CanvasKit:', err);
        isLoaded = false;
        return Promise.resolve();
      });
  }

  return skiaPromise;
}

// 自動プレロード
if (typeof window !== "undefined") {
  ensureSkiaWeb().catch(() => {
    console.warn('[Skia] Preload failed, will use fallback');
  });
}

export function isWebAssemblySupported(): boolean {
  try {
    if (typeof WebAssembly === 'object' && 
        typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      );
      return module instanceof WebAssembly.Module;
    }
  } catch (e) {
    console.warn('[Skia] WebAssembly not supported:', e);
  }
  return false;
}