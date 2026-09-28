import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { fetchExternal } from './fetch';
import { isRemoteImageUrl } from './static-image';

const CACHE_DIR = '/tmp/cached-requests';
const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

const getCachePath = (url) => {
  const hash = crypto.createHash('sha256').update(url).digest('hex');
  return path.join(CACHE_DIR, hash);
};

const readCache = async (url) => {
  try {
    const filePath = getCachePath(url);
    const stat = await fs.stat(filePath);
    if (Date.now() - stat.mtimeMs > oneDayInMilliseconds) {
      await fs.unlink(filePath);
      return null;
    }
    const cached = JSON.parse(await fs.readFile(filePath, 'utf8'));
    cached.body = Buffer.from(cached.body, 'base64');
    return cached;
  } catch {
    return null;
  }
};

const writeCache = async (url, response, body) => {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const data = {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      headers: response.headers,
      body: body.toString('base64'),
    };
    await fs.writeFile(getCachePath(url), JSON.stringify(data));
  } catch {
    // Silently ignore cache write failures
  }
};

export const asyncRequest = async (requestOptions) => {
  const { url, encoding } = typeof requestOptions === 'string' ? { url: requestOptions } : requestOptions;

  if (!isRemoteImageUrl(url)) {
    throw new TypeError('Image URL must be an absolute HTTP(S) URL');
  }

  // Check file cache
  if (process.env.ENABLE_CACHED_REQUEST) {
    const cached = await readCache(url);
    if (cached) {
      const body = encoding === null ? cached.body : cached.body.toString('utf8');
      return [{ ...cached, body }, body];
    }
  }

  // Image fetches are user-controlled. Never attach internal service headers.
  const fetchResponse = await fetchExternal(url);

  const body = encoding === null ? Buffer.from(await fetchResponse.arrayBuffer()) : await fetchResponse.text();

  // Return a response shape compatible with the old request module
  const response = {
    statusCode: fetchResponse.status,
    statusMessage: fetchResponse.statusText,
    headers: Object.fromEntries(fetchResponse.headers.entries()),
    body,
  };

  // Write successful responses to the file cache (like cached-request did, errors are never cached)
  if (process.env.ENABLE_CACHED_REQUEST && fetchResponse.ok) {
    const bufferBody = encoding === null ? body : Buffer.from(body);
    await writeCache(url, response, bufferBody);
  }

  return [response, body];
};

export const imageRequest = (url) =>
  asyncRequest({ url, encoding: null }).then(([response]) => {
    return response;
  });
