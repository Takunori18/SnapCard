import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ★ Profile型定義（位置情報とショップアカウント情報を追加）
export interface Profile {
  id: string;
  owner_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  isPrimary?: boolean;
  isPublic?: boolean;
  isShopAccount?: boolean;
  shopLatitude?: number;
  shopLongitude?: number;
  shopName?: string;
  shopAddress?: string;
}

const ACTIVE_PROFILE_KEY = '@snapcard:active_profile';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  profiles: Profile[];
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, displayName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  createProfile: (payload: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  }) => Promise<{ error: any }>;
  switchProfile: (profileId: string) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<{ error: any }>;
  focusProfileByUsername: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeProfileRow = (row: any): Profile => ({
    id: row.id,
    owner_id: row.owner_id,
    username: row.username,
    display_name: row.display_name ?? row.displayName,
    avatar_url: row.avatar_url ?? row.avatarUrl,
    bio: row.bio,
    isPrimary: row.is_primary ?? row.isPrimary ?? false,
    isPublic: row.is_public ?? row.isPublic ?? true,
    isShopAccount: row.is_shop_account ?? row.isShopAccount ?? false,
    shopLatitude: row.shop_latitude ?? row.shopLatitude,
    shopLongitude: row.shop_longitude ?? row.shopLongitude,
    shopName: row.shop_name ?? row.shopName,
    shopAddress: row.shop_address ?? row.shopAddress,
  });

  const persistActiveProfile = useCallback(async (ownerId: string, profileId?: string | null) => {
    if (!ownerId) return;
    const key = `${ACTIVE_PROFILE_KEY}:${ownerId}`;
    try {
      if (profileId) {
        await AsyncStorage.setItem(key, profileId);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('アクティブプロフィール保存エラー:', error);
    }
  }, []);

  const getPersistedActiveProfileId = useCallback(async (ownerId: string) => {
    if (!ownerId) return null;
    const key = `${ACTIVE_PROFILE_KEY}:${ownerId}`;
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('アクティブプロフィール取得エラー:', error);
      return null;
    }
  }, []);

  const setActiveProfile = useCallback(
    async (target: Profile | null) => {
      setProfile(target);
      if (target && user?.id) {
        await persistActiveProfile(user.id, target.id);
      } else if (user?.id) {
        await persistActiveProfile(user.id, null);
      }
    },
    [persistActiveProfile, user?.id],
  );

  // セッション変更の監視
  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void loadProfiles(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // セッション変更リスナー
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void loadProfiles(session.user.id);
      } else {
        setProfile(null);
        setProfiles([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfiles]);

  const loadProfiles = useCallback(
    async (ownerId: string) => {
      if (!ownerId) {
        setProfiles([]);
        await setActiveProfile(null);
        return [];
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        const normalized = (data ?? []).map(normalizeProfileRow);
        setProfiles(normalized);
        const storedId = await getPersistedActiveProfileId(ownerId);
        const fallback =
          normalized.find(item => item.id === storedId) ??
          normalized.find(item => item.isPrimary) ??
          normalized[0] ??
          null;
        await setActiveProfile(fallback);
        return normalized;
      } catch (error) {
        console.error('プロフィール読み込みエラー:', error);
        setProfiles([]);
        await setActiveProfile(null);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [getPersistedActiveProfileId, setActiveProfile],
  );

  // プロフィール更新
  const refreshProfile = async () => {
    if (user) {
      await loadProfiles(user.id);
    }
  };

  // サインアップ
  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName?: string,
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName ?? username,
          },
        },
      });

      if (error) {
        return { error };
      }

      if (data?.user) {
        const { error: profileError } = await supabase.from('user_profiles').insert({
          owner_id: data.user.id,
          username,
          display_name: displayName ?? username,
          is_primary: true,
          is_public: true,
          is_shop_account: false,
        });

        if (profileError) {
          return { error: profileError };
        }
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // サインイン
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // サインアウト
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      setProfiles([]);
      setProfile(null);
      setSession(null);
      setUser(null);
      setLoading(false);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // プロフィール更新
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) {
      return { error: new Error('プロフィールが見つかりません') };
    }

    const dbUpdates: Record<string, unknown> = {};
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.display_name !== undefined) dbUpdates.display_name = updates.display_name;
    if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.isPublic !== undefined) dbUpdates.is_public = updates.isPublic;
    if (updates.isShopAccount !== undefined) dbUpdates.is_shop_account = updates.isShopAccount;
    if (updates.shopLatitude !== undefined) dbUpdates.shop_latitude = updates.shopLatitude;
    if (updates.shopLongitude !== undefined) dbUpdates.shop_longitude = updates.shopLongitude;
    if (updates.shopName !== undefined) dbUpdates.shop_name = updates.shopName;
    if (updates.shopAddress !== undefined) dbUpdates.shop_address = updates.shopAddress;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(dbUpdates)
        .eq('id', profile.id);

      if (error) {
        return { error };
      }

      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      setProfiles(prev =>
        prev.map(item => (item.id === updatedProfile.id ? updatedProfile : item)),
      );
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const createProfile = async ({
    username,
    displayName,
    avatarUrl,
  }: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  }) => {
    if (!user) {
      return { error: new Error('ログインしていません') };
    }
    try {
      const payload = {
        owner_id: user.id,
        username,
        display_name: displayName,
        avatar_url: avatarUrl ?? null,
        is_primary: false,
        is_public: true,
        is_shop_account: false,
      };
      const { data, error } = await supabase
        .from('user_profiles')
        .insert(payload)
        .select()
        .single();
      if (error) {
        return { error };
      }
      await loadProfiles(user.id);
      if (data) {
        const normalized = normalizeProfileRow(data);
        await setActiveProfile(normalized);
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const switchProfile = useCallback(
    async (profileId: string) => {
      const nextProfile = profiles.find(item => item.id === profileId);
      if (!nextProfile) return;
      await setActiveProfile(nextProfile);
    },
    [profiles, setActiveProfile],
  );

  const deleteProfile = async (profileId: string) => {
    if (!user) {
      return { error: new Error('ログインしていません') };
    }
    const target = profiles.find(item => item.id === profileId);
    if (!target) {
      return { error: new Error('アカウントが見つかりません') };
    }
    if (target.isPrimary) {
      return { error: new Error('メインアカウントは削除できません') };
    }
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', profileId)
        .eq('owner_id', user.id);
      if (error) {
        return { error };
      }
      await loadProfiles(user.id);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const focusProfileByUsername = async (username: string) => {
    if (!user || !username.trim()) {
      return false;
    }
    const normalized = username.trim().toLowerCase();
    const localMatch = profiles.find(
      item => item.username?.toLowerCase() === normalized,
    );
    if (localMatch) {
      await setActiveProfile(localMatch);
      return true;
    }
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('owner_id', user.id)
        .ilike('username', normalized)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return false;
      }
      const normalizedProfile = normalizeProfileRow(data);
      setProfiles(prev => {
        const exists = prev.some(item => item.id === normalizedProfile.id);
        if (exists) {
          return prev.map(item =>
            item.id === normalizedProfile.id ? normalizedProfile : item,
          );
        }
        return [...prev, normalizedProfile];
      });
      await setActiveProfile(normalizedProfile);
      return true;
    } catch (error) {
      console.error('サブアカウント切り替えエラー:', error);
      return false;
    }
  };

  const value = {
    user,
    profile,
    profiles,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    createProfile,
    switchProfile,
    deleteProfile,
    focusProfileByUsername,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
