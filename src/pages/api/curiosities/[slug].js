import { env } from 'cloudflare:workers';
import { createSupabaseServerClient } from '../../../lib/supabase-server.js';

export const prerender = false;

export async function POST(context) {
  const supabase = createSupabaseServerClient(context);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return context.redirect('/admin/login');
  }

  const originalSlug = context.params.slug;

  try {
    const formData = await context.request.formData();

    const text = formData.get('text')?.toString().trim();
    const category = formData.get('category')?.toString().trim();
    const newSlug = formData.get('slug')?.toString().trim();
    const details = formData.get('details')?.toString().trim() || null;

    if (!text || !category || !newSlug) {
      return context.redirect(`/admin/editar/${originalSlug}?error=` + encodeURIComponent('Faltan campos obligatorios'));
    }

    const sources = [];
    const label1 = formData.get('sourceLabel1')?.toString().trim();
    const url1 = formData.get('sourceUrl1')?.toString().trim();
    if (label1 && url1) sources.push({ label: label1, url: url1 });

    const label2 = formData.get('sourceLabel2')?.toString().trim();
    const url2 = formData.get('sourceUrl2')?.toString().trim();
    if (label2 && url2) sources.push({ label: label2, url: url2 });

    // Start with the existing record's update payload (no image change by default)
    const updatePayload = {
      text,
      category,
      slug: newSlug,
      details,
      sources: sources.length > 0 ? sources : null,
    };

    // === If a new image was uploaded, replace it ===
    const imageFile = formData.get('image');

    if (imageFile && imageFile.size > 0) {
      const bucket = env.CURIOSITY_IMAGES;
      const fileExtension = imageFile.name.split('.').pop();
      const objectKey = `${newSlug}-${Date.now()}.${fileExtension}`;

      await bucket.put(objectKey, await imageFile.arrayBuffer(), {
        httpMetadata: { contentType: imageFile.type },
      });

      updatePayload.image_url = `${env.R2_PUBLIC_URL}/${objectKey}`;
    }

    const { error: updateError } = await supabase
      .from('curiosities')
      .update(updatePayload)
      .eq('slug', originalSlug);

    if (updateError) {
      console.error('Error updating curiosity:', updateError);
      return context.redirect(`/admin/editar/${originalSlug}?error=` + encodeURIComponent(updateError.message));
    }

    // === Trigger an automatic rebuild so the edit goes live ===
    try {
      await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
    } catch (hookError) {
      console.error('Failed to trigger deploy hook:', hookError);
    }

    return context.redirect('/admin?success=1');

  } catch (err) {
    console.error('Unexpected error updating curiosity:', err);
    return context.redirect(`/admin/editar/${originalSlug}?error=` + encodeURIComponent('Error inesperado'));
  }
}