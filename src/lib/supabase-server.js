import { createServerClient, parseCookieHeader } from '@supabase/ssr';

// Creates a Supabase client scoped to a single request, wiring up
// cookie reading/writing so the session persists across page loads.
export function createSupabaseServerClient(context) {
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_KEY;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, options);
        });
      },
    },
  });
}