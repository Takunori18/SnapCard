// Web環境用のSkia代替実装（エラー時のフォールバック）
export const Skia = {
  Point: (x: number, y: number) => ({ x, y }),
  Matrix: () => ({}),
  // 必要最小限のモック
};

export const Canvas = () => null;
export const Group = () => null;
export const Path = () => null;
export const Rect = () => null;

export default {
  Skia,
  Canvas,
  Group,
  Path,
  Rect,
};