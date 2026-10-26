
import { createClient } from '@supabase/supabase-js';
import { env } from './env.ts';

// Supabase client used strictly for email OTP verification.
// Frontend session management is governed solely by the backend JWT.
export const supabase = createClient(
  env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_placeholder',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
