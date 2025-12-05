const SUPABASE_RENDER_PREFIX = '/storage/v1/object/public/';
const SUPABASE_RENDER_REPLACEMENT = '/storage/v1/render/image/public/';

export const optimizeRemoteImageUri = (uri?: string, width = 800) => {
  if (!uri) return undefined;
  try {
    const url = new URL(uri);
    if (url.hostname.includes('supabase.co') && url.pathname.includes(SUPABASE_RENDER_PREFIX)) {
      url.pathname = url.pathname.replace(SUPABASE_RENDER_PREFIX, SUPABASE_RENDER_REPLACEMENT);
      url.searchParams.set('width', String(width));
      url.searchParams.set('quality', '75');
      return url.toString();
    }

    if (url.hostname.includes('unsplash.com')) {
      url.searchParams.set('auto', 'compress');
      url.searchParams.set('q', '75');
      url.searchParams.set('w', String(width));
      return url.toString();
    }

    if (url.hostname.includes('images.unsplash.com')) {
      url.searchParams.set('auto', 'compress');
      url.searchParams.set('q', '75');
      url.searchParams.set('w', String(width));
      return url.toString();
    }

    return uri;
  } catch (error) {
    console.warn('optimizeRemoteImageUri error', error);
    return uri;
  }
};
