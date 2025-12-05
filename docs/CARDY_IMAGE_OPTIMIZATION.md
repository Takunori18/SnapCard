# Cardy Image Optimization

## 主な変更ファイル
- `src/components/common/CardyImage.tsx`: プレースホルダ・遅延読み込み・キャッシュ・フェードインを司る共通画像コンポーネントを追加。
- `src/components/*`, `src/screens/*`: 既存の `Image` / `expo-image` 利用箇所をすべて `CardyImage` に置き換え、プロフィールやヘッダーなど即表示が必要な箇所には `priority` を付与。
- `src/screens/Discover/FeedTab.tsx`, `src/screens/Discover/FriendsTab.tsx`, `src/screens/Discover/ReelsTab.tsx`: `FlatList` の `windowSize` / `initialNumToRender` / `maxToRenderPerBatch` / `removeClippedSubviews` などを調整し、スクロール時の無駄なレンダリングを抑制。

## CardyImage の使い方
```tsx
import CardyImage from '../components/common/CardyImage';

<CardyImage
  source={{ uri: remoteUri }}
  style={styles.photo}
  contentFit="cover"
  blurhash={blurHashString}
  alt="カード画像"
  priority={isAboveTheFold}
/>
```

- `priority` を `true` にするとビューに入る前でも即座に読み込みます。初期表示で必須なアイコンやヘッダーに指定してください。
- `blurhash` や既定のフェードインが自動で効きます。カスタム `placeholder` は不要です。
- 追加の `expo-image` props（`cachePolicy` や `recyclingKey` など）はそのまま渡せます。

## 今後のベストプラクティス
1. 画像を描画する場合は必ず `CardyImage` を import して利用し、直接 `Image` / `expo-image` を使用しない。
2. フィードやリストでは `FlatList` のパフォーマンス関連 props（`windowSize` など）を意識してチューニングする。
3. 重要な画像は `priority`、低頻度の画像はデフォルト挙動（遅延読み込み＋キャッシュ）を使い、UX とパフォーマンスのバランスを取る。
