// ============================================================
// VitaVoice — Browser-side Supabase Client (Singleton)
// ============================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let client: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Returns a singleton Supabase client for browser-side use.
 * Uses NEXT_PUBLIC_ environment variables (safe for client bundles).
 */
export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  client = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return client;
}
