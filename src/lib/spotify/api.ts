// src/lib/spotify/api.ts

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: string;
  externalUrl: string;
  previewUrl?: string; // ★ これがポイント
};

export async function searchSpotifyTracks(
  accessToken: string,
  query: string
): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];

  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
    query
  )}&type=track&limit=20`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Spotify search error:', text);
    throw new Error('Spotify 検索に失敗しました');
  }

  const json = await res.json();
  const items = (json.tracks?.items ?? []) as any[];

  return items.map((t) => {
    const preview = t.preview_url || null;
    console.log('preview:', t.name, preview); // ★ デバッグ用（要らなければ消してOK）

    return {
      id: t.id,
      name: t.name,
      artists: (t.artists || []).map((a: any) => a.name).join(', '),
      externalUrl: t.external_urls?.spotify,
      // ★ ここで preview_url をちゃんと拾う
      previewUrl: preview || undefined,
    } as SpotifyTrack;
  });
}
