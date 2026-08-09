import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function hasValidConfig(): boolean {
  const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseUrl = rawSupabaseUrl?.trim() || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

  return !!(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    supabaseAnonKey.startsWith('eyJ') &&
    supabaseAnonKey.length > 40 &&
    supabaseAnonKey !== 'your_anon_public_key_here' && 
    supabaseUrl !== 'your_supabase_url_here' &&
    !supabaseAnonKey.includes(' ') &&
    !supabaseUrl.includes(' ')
  );
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  if (!hasValidConfig()) {
    console.warn('Supabase configuration missing. Returning null client.');
    return null;
  }

  const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  let supabaseUrl = rawSupabaseUrl?.trim() || '';
  supabaseUrl = supabaseUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient!;
}
