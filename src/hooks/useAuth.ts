import { useState, useEffect } from 'react';
import { User } from '../types';
import { mockUser } from '../mock/data';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Supabase Auth からユーザー情報取得
    // const fetchUser = async () => {
    //   const { data: { user: authUser } } = await supabase.auth.getUser();
    //   
    //   if (authUser) {
    //     const { data: userData } = await supabase
    //       .from('users')
    //       .select('*')
    //       .eq('id', authUser.id)
    //       .single();
    //     
    //     if (userData) setUser(userData);
    //   }
    //   setLoading(false);
    // };
    // fetchUser();
    
    setTimeout(() => {
      setUser(mockUser);
      setLoading(false);
    }, 300);
  }, []);

  const signOut = async () => {
    // TODO: Supabase Auth サインアウト
    // await supabase.auth.signOut();
    setUser(null);
  };

  const signIn = async (email: string, password: string) => {
    // TODO: Supabase Auth サインイン
    // const { data, error } = await supabase.auth.signInWithPassword({
    //   email,
    //   password,
    // });
    
    // モック実装
    setTimeout(() => {
      setUser(mockUser);
    }, 500);
  };

  return { user, loading, signOut, signIn };
};
