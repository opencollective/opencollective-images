import path from 'path';

/**
 * True when imageUrl is an absolute http(s) URL (parsed with the URL API, not substring checks).
 */
export function isRemoteImageUrl(imageUrl) {
  try {
    const { protocol } = new URL(imageUrl);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Resolve a bundled static image path (/images/...) under staticFolder, or null if invalid.
 */
export function resolveBundledImagePath(imageUrl, staticFolder) {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/images/') || imageUrl.includes('\0')) {
    return null;
  }

  const resolved = path.resolve(staticFolder, `.${imageUrl}`);
  const relative = path.relative(staticFolder, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  if (relative !== 'images' && !relative.startsWith(`images${path.sep}`)) {
    return null;
  }

  return resolved;
}
