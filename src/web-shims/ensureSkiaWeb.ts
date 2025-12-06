// src/web-shims/ensureSkiaWeb.ts

// Skia の内部APIを直接 import しない！！
// Web では CanvasKit が window.CanvasKit として読み込まれるのを待つだけ。

let loadPromise: Promise<void> | null = null;
let loaded = false;

const CDN_PATHS = [
  "/canvaskit/",
  "https://unpkg.com/canvaskit-wasm@latest/bin/",
  "https://cdn.jsdelivr.net/npm/canvaskit-wasm@latest/bin/"
];

/** CanvasKit のURLをカスタム設定（Skia が使用するグローバル変数） */
function configureCanvasKitLocateFile() {
  (globalThis as any).CanvasKitLocateFile = (file: string) => {
    // あなたが最初に書いた Fallonback の動作に合わせる
    return `${CDN_PATHS[0]}${file}`;
  };
}

/** CanvasKit が window に載るまで待つ */
async function waitForCanvasKit() {
  if ((globalThis as any).CanvasKit) return;

  // Skia が内部的に CanvasKit を読み込むので、その完了を待つ
  for (let i = 0; i < 50; i++) {
    if ((globalThis as any).CanvasKit) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** Webでだけ CanvasKit を確実に読み込む */
export async function ensureSkiaWeb(): Promise<void> {
  if (typeof window === "undefined") {
    // ネイティブ（iOS/Android）はなにもしない
    return;
  }

  if (loaded) return;
  if (loadPromise) return loadPromise;

  configureCanvasKitLocateFile();

  loadPromise = (async () => {
    try {
      await waitForCanvasKit();
      loaded = true;
      console.log("[Skia] ✅ CanvasKit ready");
    } catch (err) {
      console.error("[Skia] ❌ CanvasKit failed:", err);
      loaded = false;
    }
  })();

  return loadPromise;
}

// 自動プリロード
if (typeof window !== "undefined") {
  ensureSkiaWeb().catch(() => {
    console.warn("[Skia] Preload failed (fallback mode)");
  });
}

/** WebAssembly 判定 */
export function isWebAssemblySupported(): boolean {
  try {
    if (
      typeof WebAssembly === "object" &&
      typeof WebAssembly.instantiate === "function"
    ) {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      );
      return module instanceof WebAssembly.Module;
    }
  } catch (e) {
    console.warn("[Skia] WebAssembly not supported:", e);
  }
  return false;
}
