import { registerRootComponent } from "expo";
import App from "./App";
import { ensureSkiaWeb } from "./src/web-shims/ensureSkiaWeb";

// 二重実行を防ぐフラグ
let hasRegistered = false;

const safeRegister = () => {
  if (!hasRegistered) {
    hasRegistered = true;
    registerRootComponent(App);
  }
};

// Skia 初期化
ensureSkiaWeb()
  .catch((e) => {
    console.error("Skia Web init failed:", e);
  })
  .finally(() => {
    // 成功/失敗関係なく一度だけアプリを起動
    safeRegister();
  });
