import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pasxprjrhxvsjqvyccdz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhc3hwcmpyaHh2c2pxdnljY2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MTIyMTksImV4cCI6MjEwNDI4ODIxOX0.M4RfjTE2yMNvNIAUt5ii1Y1eJBr6BkAoKDJ1gWmnKMs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
