import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// 開発用：環境変数を直接記載
const supabaseUrl = 'https://blitoliunkhjzgevbpae.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaXRvbGl1bmtoanpnZXZicGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzk0NDYsImV4cCI6MjA4MDE1NTQ0Nn0.a3UraZHD3R83QydDXl9f9zv1Wa53hK0iIFvInjiCvu0';

const isWeb = Platform.OS === 'web';

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const createBrowserStorage = (): StorageLike => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    };
  }
  return {
    getItem: async (key: string) => window.localStorage.getItem(key),
    setItem: async (key: string, value: string) => {
      window.localStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
      window.localStorage.removeItem(key);
    },
  };
};

const storage = isWeb ? createBrowserStorage() : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});
