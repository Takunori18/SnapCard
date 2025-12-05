import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

const ACTIVE_PROFILE_KEY = '@snapcard:active_profile';

const isMissingUserProfilesTable = (error: any) => error?.code === 'PGRST205';

const resolveAvatarUrl = (value?: string | null) => {
  if (!value) {
    return undefined;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const cleaned = value.replace(/^\/+/, '');
  try {
    const { data } = supabase.storage.from('card-images').getPublicUrl(cleaned);
    return data?.publicUrl ?? value;
  } catch {
    return value;
  }
};

const normalizeProfileRow = (row: any): Profile => ({
  ...row,
  avatar_url: resolveAvatarUrl(row?.avatar_url),
});

export interface Profile {
  id: string;
  owner_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  isPrimary?: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profiles: Profile[];
  loading: boolean;
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  createProfile: (payload: { username: string; displayName: string; avatarUrl?: string }) => Promise<{ error: any }>;
  switchProfile: (profileId: string) => Promise<void>;
  focusProfileByUsername: (username: string) => Promise<boolean>;
  deleteProfile: (profileId: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingUsernameRef = useRef<string | null>(null);

  const normalizeUsername = (value: string) => value.trim().toLowerCase();

  const persistActiveProfile = useCallback(async (ownerId: string, selectedId?: string | null) => {
    if (!ownerId) {
      return;
    }
    const storageKey = `${ACTIVE_PROFILE_KEY}:${ownerId}`;
    if (selectedId) {
      await AsyncStorage.setItem(storageKey, selectedId);
    } else {
      await AsyncStorage.removeItem(storageKey);
    }
  }, []);

  const applyPendingUsername = useCallback(
    async (list: Profile[], ownerId: string) => {
      const target = pendingUsernameRef.current;
      if (!target) {
        return;
      }
      const matched = list.find(item => item.username?.toLowerCase() === target);
      if (matched) {
        setProfile(matched);
        await persistActiveProfile(ownerId, matched.id);
        pendingUsernameRef.current = null;
      }
    },
    [persistActiveProfile],
  );

  const mapLegacyProfile = (ownerId: string, legacy: any, isPrimary = false): Profile => ({
    id: legacy?.id ?? ownerId,
    owner_id: ownerId,
    username: legacy?.username || legacy?.display_name || `cardy-${ownerId.slice(0, 6)}` ,
    display_name: legacy?.display_name || legacy?.username || undefined,
    avatar_url: resolveAvatarUrl(legacy?.avatar_url),
    bio: legacy?.bio || undefined,
    isPrimary,
  });

  const fetchPrimaryProfile = useCallback(
    async (ownerId: string): Promise<Profile | null> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio')
          .eq('id', ownerId)
          .maybeSingle();

        if (error) {
          console.error('メインプロフィール取得エラー:', error);
        }

        return mapLegacyProfile(ownerId, data ?? { id: ownerId }, true);
      } catch (error) {
        console.error('メインプロフィール取得エラー:', error);
        return mapLegacyProfile(ownerId, { id: ownerId }, true);
      }
    },
    [],
  );

  const mergeProfiles = (primary: Profile | null, extras: Profile[]): Profile[] => {
    const normalizedPrimary = primary?.username?.toLowerCase();
    const normalizedExtras = extras.map(item => ({
      ...item,
      isPrimary: normalizedPrimary ? item.username?.toLowerCase() === normalizedPrimary : false,
    }));

    if (normalizedPrimary) {
      const primaryIndex = normalizedExtras.findIndex(
        item => item.username?.toLowerCase() === normalizedPrimary,
      );
      if (primaryIndex >= 0) {
        const primaryEntry = { ...normalizedExtras[primaryIndex], isPrimary: true };
        const others = normalizedExtras
          .filter((_item, index) => index !== primaryIndex)
          .map(item => ({ ...item, isPrimary: false }));
        return [primaryEntry, ...others];
      }
    }

    if (primary) {
      return [{ ...primary, isPrimary: true }, ...normalizedExtras.map(item => ({ ...item, isPrimary: false }))];
    }

    return normalizedExtras;
  };

  const fetchLegacyProfiles = useCallback(
    async (ownerId: string): Promise<Profile[]> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio')
          .eq('id', ownerId);
        if (error) {
          console.error('レガシープロフィール取得エラー:', error);
          return [];
        }
        const rows = data && data.length > 0 ? data : [null];
        return rows.map((row, index) => mapLegacyProfile(ownerId, row ?? { id: ownerId }, index === 0));
      } catch (error) {
        console.error('レガシープロフィール取得エラー:', error);
        return [];
      }
    },
    [],
  );

  const ensureDefaultProfile = useCallback(async (ownerId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('owner_id', ownerId)
        .limit(1)
        .maybeSingle();
      if (error) {
        if (isMissingUserProfilesTable(error)) {
          return;
        }
        throw error;
      }
      if (data) {
        return;
      }
      const { data: legacy } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, bio')
        .eq('id', ownerId)
        .maybeSingle();
      const fallbackName = legacy?.username || legacy?.display_name || `cardy-${ownerId.slice(0, 6)}`;
      const { error: insertError } = await supabase.from('user_profiles').insert({
        owner_id: ownerId,
        username: fallbackName,
        display_name: legacy?.display_name || fallbackName,
        avatar_url: legacy?.avatar_url || null,
        bio: legacy?.bio || null,
      });
      if (insertError) {
        if (isMissingUserProfilesTable(insertError)) {
          return;
        }
        console.error('デフォルトプロフィール作成エラー:', insertError);
      }
    } catch (error) {
      console.error('デフォルトプロフィール生成エラー:', error);
    }
  }, []);

  const loadProfiles = useCallback(
    async (ownerId: string) => {
      setLoading(true);
      try {
        const primaryProfile = await fetchPrimaryProfile(ownerId);
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: true });

        if (error) {
          if (isMissingUserProfilesTable(error)) {
            const legacy = await fetchLegacyProfiles(ownerId);
            setProfiles(legacy);
            const preferredLegacyId = await AsyncStorage.getItem(`${ACTIVE_PROFILE_KEY}:${ownerId}`);
            const nextLegacy = preferredLegacyId ? legacy.find(item => item.id === preferredLegacyId) : legacy[0];
            setProfile(nextLegacy ?? null);
            await persistActiveProfile(ownerId, nextLegacy?.id ?? null);
            await applyPendingUsername(legacy, ownerId);
            return;
          }
          throw error;
        }

        if (!data || data.length === 0) {
          await ensureDefaultProfile(ownerId);
          const retry = await supabase
            .from('user_profiles')
            .select('*')
            .eq('owner_id', ownerId)
            .order('created_at', { ascending: true });
          if (retry.error) {
            if (isMissingUserProfilesTable(retry.error)) {
              const legacy = await fetchLegacyProfiles(ownerId);
              setProfiles(legacy);
              const preferredLegacyId = await AsyncStorage.getItem(`${ACTIVE_PROFILE_KEY}:${ownerId}`);
              const nextLegacy = preferredLegacyId ? legacy.find(item => item.id === preferredLegacyId) : legacy[0];
              setProfile(nextLegacy ?? null);
              await persistActiveProfile(ownerId, nextLegacy?.id ?? null);
              await applyPendingUsername(legacy, ownerId);
              return;
            }
            throw retry.error;
          }
          const profilesData = retry.data ?? [];
          const normalizedProfiles = (profilesData as Profile[]).map(normalizeProfileRow);
          const combined = mergeProfiles(primaryProfile, normalizedProfiles);
          setProfiles(combined);
          const preferredId = await AsyncStorage.getItem(`${ACTIVE_PROFILE_KEY}:${ownerId}`);
          const nextProfile = preferredId
            ? combined.find(item => item.id === preferredId)
            : combined[0];
          setProfile(nextProfile ?? null);
          await persistActiveProfile(ownerId, nextProfile?.id ?? null);
          await applyPendingUsername(combined, ownerId);
          return;
        }

        const rawProfiles = data ?? [];
        const normalizedProfiles = rawProfiles.map(normalizeProfileRow);
        const combinedProfiles = mergeProfiles(primaryProfile, normalizedProfiles);
        setProfiles(combinedProfiles);
        const preferredId = await AsyncStorage.getItem(`${ACTIVE_PROFILE_KEY}:${ownerId}`);
        const nextProfile = preferredId
          ? combinedProfiles.find(item => item.id === preferredId)
          : combinedProfiles[0];
        setProfile(nextProfile ?? null);
        await persistActiveProfile(ownerId, nextProfile?.id ?? null);
        await applyPendingUsername(combinedProfiles, ownerId);
      } catch (error) {
        console.error('プロフィール読み込みエラー:', error);
        setProfiles([]);
        setProfile(null);
        pendingUsernameRef.current = null;
        await persistActiveProfile(ownerId, null);
      } finally {
        setLoading(false);
      }
    },
    [ensureDefaultProfile, fetchLegacyProfiles, persistActiveProfile, applyPendingUsername, fetchPrimaryProfile],
  );

  useEffect(() => {
    let isMounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        await loadProfiles(nextUser.id);
      } else {
        setProfiles([]);
        setProfile(null);
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfiles]);

  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName,
          },
          emailRedirectTo: undefined,
        },
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'snapcard://auth/callback',
        },
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signInWithApple = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'snapcard://auth/callback',
        },
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      setProfiles([]);
      setProfile(null);
      pendingUsernameRef.current = null;
      setSession(null);
      setUser(null);
      setLoading(false);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const switchProfile = async (profileId: string) => {
    if (!profileId) {
      return;
    }
    const nextProfile = profiles.find(item => item.id === profileId);
    if (nextProfile) {
      setProfile(nextProfile);
      if (user?.id) {
        await persistActiveProfile(user.id, profileId);
      }
      return;
    }

    if (user?.id) {
      await persistActiveProfile(user.id, profileId);
      await loadProfiles(user.id);
    }
  };

  const focusProfileByUsername = async (username: string) => {
    const normalized = normalizeUsername(username);
    if (!normalized || !user?.id) {
      return false;
    }

    pendingUsernameRef.current = normalized;

    const localMatch = profiles.find(item => item.username?.toLowerCase() === normalized);
    if (localMatch) {
      pendingUsernameRef.current = null;
      setProfile(localMatch);
      await persistActiveProfile(user.id, localMatch.id);
      return true;
    }

    let targetProfile: Profile | null = null;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('owner_id', user.id)
        .ilike('username', normalized)
        .maybeSingle();

      if (error) {
        if (!isMissingUserProfilesTable(error)) {
          throw error;
        }
      } else if (data) {
        targetProfile = {
          id: data.id,
          owner_id: data.owner_id,
          username: data.username,
          display_name: data.display_name,
          avatar_url: resolveAvatarUrl(data.avatar_url),
          bio: data.bio,
          isPrimary: false,
        };
      }
    } catch (lookupError) {
      console.error('サブアカウント検索エラー:', lookupError);
    }

    if (!targetProfile) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio')
          .ilike('username', normalized)
          .maybeSingle();

        if (error) {
          console.error('メインアカウント検索エラー:', error);
        } else if (data && data.id === user.id) {
          targetProfile = mapLegacyProfile(user.id, data, true);
        }
      } catch (legacyError) {
        console.error('メインアカウント検索エラー:', legacyError);
      }
    }

    if (!targetProfile) {
      pendingUsernameRef.current = null;
      return false;
    }

    setProfiles(prev => {
      const exists = prev.some(item => item.id === targetProfile!.id);
      if (exists) {
        return prev.map(item => (item.id === targetProfile!.id ? targetProfile! : item));
      }
      return [...prev, targetProfile!];
    });
    setProfile(targetProfile);
    pendingUsernameRef.current = null;
    await persistActiveProfile(user.id, targetProfile.id);
    return true;
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
        display_name: displayName || username,
        avatar_url: avatarUrl ?? null,
      };
      const { data, error } = await supabase
        .from('user_profiles')
        .insert(payload)
        .select()
        .single();
      if (error) {
        if (isMissingUserProfilesTable(error)) {
          return { error: new Error('複数プロフィール機能を利用するには Supabase に user_profiles テーブルを作成してください。') };
        }
        return { error };
      }
      const normalizedProfile = { ...data, avatar_url: resolveAvatarUrl(data.avatar_url), isPrimary: false };
      setProfiles(prev => [...prev, normalizedProfile]);
      if (!profile) {
        setProfile(normalizedProfile);
        await persistActiveProfile(user.id, normalizedProfile.id);
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!user) {
      return { error: new Error('ログインしていません') };
    }
    if (profiles.length <= 1) {
      return { error: new Error('最後のアカウントは削除できません') };
    }
    const targetProfile = profiles.find(item => item.id === profileId);
    if (targetProfile?.isPrimary || profileId === user.id) {
      return { error: new Error('メインアカウントは削除できません') };
    }
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', profileId)
        .eq('owner_id', user.id);
      if (error) {
        if (isMissingUserProfilesTable(error)) {
          return { error: new Error('複数プロフィール機能を利用するには Supabase に user_profiles テーブルを作成してください。') };
        }
        return { error };
      }
      setProfiles(prev => prev.filter(item => item.id !== profileId));
      if (profile?.id === profileId) {
        const next = profiles.find(item => item.id !== profileId) ?? null;
        setProfile(next);
        await persistActiveProfile(user.id, next?.id ?? null);
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) {
      return { error: new Error('プロフィールがありません') };
    }

    try {
      const payload: Partial<Profile> = {
        display_name: updates.display_name,
        bio: updates.bio,
        avatar_url: updates.avatar_url,
        username: updates.username ?? profile.username,
      };
      const sanitizedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined),
      ) as Partial<Profile>;

      const isOwnerRecord = profile.id === profile.owner_id;

      if (isOwnerRecord) {
        const { data, error } = await supabase
          .from('profiles')
        .update({
          ...sanitizedPayload,
        })
          .eq('id', profile.owner_id)
          .select('id, username, display_name, avatar_url, bio')
          .maybeSingle();

        if (error) {
          return { error };
        }

        const mapped = mapLegacyProfile(profile.owner_id, data ?? { id: profile.owner_id }, true);
        setProfile(mapped);
        setProfiles(prev => {
          const extras = prev.filter(
            item => item.username?.toLowerCase() !== mapped.username?.toLowerCase(),
          );
          return mergeProfiles(mapped, extras);
        });
        return { error: null };
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...sanitizedPayload,
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) {
        if (isMissingUserProfilesTable(error)) {
        const { data: legacyData, error: legacyError } = await supabase
            .from('profiles')
            .update({
              ...sanitizedPayload,
            })
            .eq('id', profile.owner_id)
            .select()
            .single();
          if (legacyError) {
            return { error: legacyError };
          }
          const mapped = mapLegacyProfile(profile.owner_id, legacyData, profile.isPrimary ?? false);
          setProfile(mapped);
          setProfiles(prev => {
            const extras = prev.filter(
              item => item.username?.toLowerCase() !== mapped.username?.toLowerCase(),
            );
            return mergeProfiles(mapped, extras);
          });
          return { error: null };
        }
        return { error };
      }

      const normalized = { ...profile, ...data, isPrimary: profile.isPrimary };
      setProfile(normalized);
      setProfiles(prev => prev.map(item => (item.id === normalized.id ? normalized : item)));
      return { error: null };
    } catch (error) {
      return { error };
    }
  };


  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        profiles,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signOut,
        updateProfile,
        createProfile,
        switchProfile,
        deleteProfile,
        focusProfileByUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
