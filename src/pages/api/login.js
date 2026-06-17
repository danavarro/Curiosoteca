import { createSupabaseServerClient } from '../../lib/supabase-server.js';

export const prerender = false;

export async function POST(context) {
  const formData = await context.request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  const supabase = createSupabaseServerClient(context);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return context.redirect('/admin/login?error=1');
  }

  return context.redirect('/admin');
}