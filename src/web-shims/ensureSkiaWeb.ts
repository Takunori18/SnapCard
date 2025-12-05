// src/web-shims/ensureSkiaWeb.ts
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

let skiaPromise: Promise<void> | null = null;

export function ensureSkiaWeb(): Promise<void> {
  // SSR や node では実行しない
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  // すでにロード済みなら Promise を返す
  if ((globalThis as any).CanvasKit) {
    return Promise.resolve();
  }

  // 一度だけ実行する
  if (!skiaPromise) {
    skiaPromise = LoadSkiaWeb({
      locateFile: (file) => `/canvaskit/${file}`, // public/canvaskit に置いた WASM を使う
    }).catch((err) => {
      console.error("[Skia] Failed to load:", err);
      throw err;
    });
  }

  return skiaPromise;
}

// 自動プレロード（重要）
if (typeof window !== "undefined") {
  ensureSkiaWeb().catch(() => {});
}
