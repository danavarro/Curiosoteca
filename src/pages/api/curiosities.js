import { env } from 'cloudflare:workers';
import { createSupabaseServerClient } from '../../lib/supabase-server.js';

export const prerender = false;

export async function POST(context) {
  const supabase = createSupabaseServerClient(context);

  // Make sure only a logged-in user can reach this endpoint, even if they
  // somehow bypass the /admin page itself.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return context.redirect('/admin/login');
  }

  try {
    const formData = await context.request.formData();

    const text = formData.get('text')?.toString().trim();
    const category = formData.get('category')?.toString().trim();
    const slug = formData.get('slug')?.toString().trim();
    const details = formData.get('details')?.toString().trim() || null;

    if (!text || !category || !slug) {
      return context.redirect('/admin?error=' + encodeURIComponent('Faltan campos obligatorios'));
    }

    // Build the sources array from the (up to 2) source fields in the form
    const sources = [];
    const label1 = formData.get('sourceLabel1')?.toString().trim();
    const url1 = formData.get('sourceUrl1')?.toString().trim();
    if (label1 && url1) sources.push({ label: label1, url: url1 });

    const label2 = formData.get('sourceLabel2')?.toString().trim();
    const url2 = formData.get('sourceUrl2')?.toString().trim();
    if (label2 && url2) sources.push({ label: label2, url: url2 });

    // === Handle image upload to R2 via the native binding, if a file was provided ===
    let imageUrl = null;
    const imageFile = formData.get('image');

    if (imageFile && imageFile.size > 0) {
      const bucket = env.CURIOSITY_IMAGES;

      const fileExtension = imageFile.name.split('.').pop();
      const objectKey = `${slug}-${Date.now()}.${fileExtension}`;

      console.log('DEBUG: attempting R2 put for key:', objectKey, 'bucket binding present:', !!bucket);

      try {
        const putResult = await bucket.put(objectKey, await imageFile.arrayBuffer(), {
          httpMetadata: { contentType: imageFile.type },
        });
        console.log('DEBUG: R2 put result:', putResult);
        imageUrl = `${env.R2_PUBLIC_URL}/${objectKey}`;
      } catch (r2Error) {
        console.error('DEBUG: R2 put FAILED:', r2Error);
        // Continue without an image rather than failing the whole submission
      }
    }

    // === Insert the new curiosity into Supabase ===
    const { error: insertError } = await supabase.from('curiosities').insert({
      text,
      category,
      slug,
      details,
      sources: sources.length > 0 ? sources : null,
      image_url: imageUrl,
    });

    if (insertError) {
      console.error('Error inserting curiosity:', insertError);
      return context.redirect('/admin?error=' + encodeURIComponent(insertError.message));
    }

    return context.redirect('/admin?success=1');

  } catch (err) {
    console.error('Unexpected error in curiosities endpoint:', err);
    return context.redirect('/admin?error=' + encodeURIComponent('Error inesperado'));
  }
}