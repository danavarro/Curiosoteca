import { createSupabaseServerClient } from '../../lib/supabase-server.js';

export const prerender = false;

export async function POST(context) {
  const supabase = createSupabaseServerClient(context);
  await supabase.auth.signOut();
  return context.redirect('/admin/login');
}