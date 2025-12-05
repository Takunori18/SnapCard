import { supabase } from '../lib/supabase';

const FOLLOW_TABLE = 'follows';
const isMissingFollowsTable = (error: any) => error?.code === 'PGRST205';

export interface FollowStats {
  followers: number;
  following: number;
}

export const fetchFollowStats = async (profileId?: string | null): Promise<FollowStats> => {
  if (!profileId) {
    return { followers: 0, following: 0 };
  }

  try {
    const [followersRes, followingRes] = await Promise.all([
      supabase
        .from(FOLLOW_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('following_id', profileId),
      supabase
        .from(FOLLOW_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', profileId),
    ]);

    if (followersRes.error && !isMissingFollowsTable(followersRes.error)) {
      throw followersRes.error;
    }
    if (followingRes.error && !isMissingFollowsTable(followingRes.error)) {
      throw followingRes.error;
    }

    return {
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    };
  } catch (error) {
    console.error('フォローステータス取得エラー:', error);
    return { followers: 0, following: 0 };
  }
};
