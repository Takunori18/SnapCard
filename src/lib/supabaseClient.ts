// src/lib/supabaseClient.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// ★ ここに直書き（.env の値をそのままコピペ）
const SUPABASE_URL = 'https://blitoliunkhjzgevbpae.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaXRvbGl1bmtoanpnZXZicGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzk0NDYsImV4cCI6MjA4MDE1NTQ0Nn0.a3UraZHD3R83QydDXl9f9zv1Wa53hK0iIFvInjiCvu0';

// ★ ガードは消しておく（もう undefined にはならないので）
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
