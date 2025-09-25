import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://dhvydvffbtbyulmyzpeq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodnlkdmZmYnRieXVsbXl6cGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjEyMTksImV4cCI6MjA3NDMzNzIxOX0.AlGeNw0h0D2trvpJanZfVDQ55KSoCQIoMb6ySMRXxXE';

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase client is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  return browserClient;
}

export function __setSupabaseClientForTests(client: SupabaseClient | null) {
  browserClient = client;
}
