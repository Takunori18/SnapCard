// src/lib/music/tracks.ts
import { supabase } from '../supabaseClient';
import type { SpotifyTrack } from '../spotify/api';

// Spotifyトラックを music_tracks に保存（存在すれば更新）
export async function upsertSpotifyTrackForUser(
  userId: string,
  track: SpotifyTrack
) {
  const { data, error } = await supabase
    .from('music_tracks')
    .upsert(
      {
        user_id: userId,
        title: track.name,
        artist: track.artists,
        source: 'spotify',
        external_id: track.id,
        external_url: track.externalUrl,
      },
      {
        onConflict: 'external_id', // external_id を UNIQUE にしておくと良い
      }
    )
    .select()
    .single();

  if (error) {
    console.error('upsertSpotifyTrackForUser error', error);
    throw error;
  }

  return data; // data.id が bgm_track_id に使える
}

// カードに BGM を紐づける
export async function attachBgmToCard(cardId: string, bgmTrackId: string) {
  const { data, error } = await supabase
    .from('cards')
    .update({ bgm_track_id: bgmTrackId })
    .eq('id', cardId)
    .select()
    .single();

  if (error) {
    console.error('attachBgmToCard error', error);
    throw error;
  }

  return data;
}
