import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface FollowContextType {
  following: string[];
  followUser: (profileId: string) => Promise<void>;
  unfollowUser: (profileId: string) => Promise<void>;
  isFollowing: (profileId: string) => boolean;
  toggleFollow: (profileId: string) => Promise<void>;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);
const FOLLOW_TABLE = 'follows';

export const FollowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, user } = useAuth();
  const followerId = profile?.owner_id ?? user?.id ?? null;
  const [following, setFollowing] = useState<string[]>([]);

  const loadFollowing = useCallback(async () => {
    if (!followerId) {
      setFollowing([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from(FOLLOW_TABLE)
        .select('following_id')
        .eq('follower_id', followerId);

      if (error) {
        throw error;
      }

      setFollowing((data ?? []).map(row => row.following_id));
    } catch (error) {
      console.error('フォロー読み込みエラー:', error);
      setFollowing([]);
    }
  }, [followerId]);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  const followUser = async (targetProfileId: string) => {
    if (!targetProfileId || !followerId || targetProfileId === followerId) return;

    setFollowing(prev => {
      if (prev.includes(targetProfileId)) {
        return prev;
      }
      return [targetProfileId, ...prev];
    });

    const { error } = await supabase.from(FOLLOW_TABLE).insert({
      follower_id: followerId,
      following_id: targetProfileId,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('フォロー登録エラー:', error);
      setFollowing(prev => prev.filter(id => id !== targetProfileId));
      return;
    }

    await loadFollowing();
  };

  const unfollowUser = async (targetProfileId: string) => {
    if (!targetProfileId || !followerId) return;

    setFollowing(prev => prev.filter(id => id !== targetProfileId));

    const { error } = await supabase
      .from(FOLLOW_TABLE)
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', targetProfileId);

    if (error) {
      console.error('フォロー解除エラー:', error);
      setFollowing(prev => {
        if (prev.includes(targetProfileId)) {
          return prev;
        }
        return [targetProfileId, ...prev];
      });
      return;
    }

    await loadFollowing();
  };

  const toggleFollow = async (profileId: string) => {
    if (isFollowing(profileId)) {
      await unfollowUser(profileId);
    } else {
      await followUser(profileId);
    }
  };

  const isFollowing = (profileId: string) => following.includes(profileId);

  return (
    <FollowContext.Provider value={{ following, followUser, unfollowUser, isFollowing, toggleFollow }}>
      {children}
    </FollowContext.Provider>
  );
};

export const useFollowContext = () => {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error('useFollowContext must be used within FollowProvider');
  }
  return context;
};
