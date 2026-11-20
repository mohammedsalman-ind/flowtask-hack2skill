import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env'
  );
}

/**
 * Supabase Admin client — uses the service role key.
 * This bypasses RLS and should only be used for admin/cross-user operations
 * (e.g. looking up other users for assignment notifications).
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Creates a Supabase client scoped to a specific user's JWT.
 * Uses the ANON key + user's access token so that RLS policies
 * are properly enforced. `auth.uid()` in RLS will return the
 * authenticated user's ID.
 *
 * IMPORTANT: Always use this for user-specific CRUD operations
 * (task create/read/update/delete, meeting CRUD, etc.).
 * Only use supabaseAdmin for cross-user/admin operations.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  const key = supabaseAnonKey || supabaseServiceKey || '';
  if (!supabaseAnonKey) {
    console.warn(
      '[Supabase] SUPABASE_ANON_KEY not set. Falling back to service key for user client. '
      + 'RLS may not be properly enforced. Add SUPABASE_ANON_KEY to backend/node-api/.env'
    );
  }
  return createClient(supabaseUrl!, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
