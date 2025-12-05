import React, { createContext, useContext, useEffect, useState } from 'react';
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

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
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

  // セッション変更の監視
  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
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
        void fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // プロフィール取得
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const rows = data ?? [];
      const primary = rows.find(row => row.is_primary ?? row.isPrimary) ?? rows[0];
      if (primary) {
        setProfile(normalizeProfileRow(primary));
      }
    } catch (error) {
      console.error('プロフィール取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // プロフィール更新
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // サインアップ
  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // プライマリプロフィール作成
      const { error: profileError } = await supabase.from('user_profiles').insert({
        owner_id: data.user.id,
        username,
        display_name: username,
        is_primary: true,
        is_public: true,
        is_shop_account: false,
      });

      if (profileError) throw profileError;
    }
  };

  // サインイン
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  // サインアウト
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // プロフィール更新
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) throw new Error('プロフィールが見つかりません');

    // データベース用にキー名を変換
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.display_name !== undefined) dbUpdates.display_name = updates.display_name;
    if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    
    // ★ 新規フィールドの変換
    if (updates.isPublic !== undefined) dbUpdates.is_public = updates.isPublic;
    if (updates.isShopAccount !== undefined) dbUpdates.is_shop_account = updates.isShopAccount;
    if (updates.shopLatitude !== undefined) dbUpdates.shop_latitude = updates.shopLatitude;
    if (updates.shopLongitude !== undefined) dbUpdates.shop_longitude = updates.shopLongitude;
    if (updates.shopName !== undefined) dbUpdates.shop_name = updates.shopName;
    if (updates.shopAddress !== undefined) dbUpdates.shop_address = updates.shopAddress;

    const { error } = await supabase
      .from('user_profiles')
      .update(dbUpdates)
      .eq('id', profile.id);

    if (error) throw error;

    // ローカルステートを更新
    setProfile({ ...profile, ...updates });
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
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
