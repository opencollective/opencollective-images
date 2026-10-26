import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { fetchExternal } from './fetch';
import { isRemoteImageUrl } from './static-image';

const CACHE_DIR = '/tmp/cached-requests';
const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

interface RequestResponse<TBody = Buffer | string> {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body: TBody;
}

interface RequestOptions {
  url: string;
  encoding?: BufferEncoding | null;
}

const getCachePath = (url: string): string => {
  const hash = crypto.createHash('sha256').update(url).digest('hex');
  return path.join(CACHE_DIR, hash);
};

const readCache = async (url: string): Promise<RequestResponse<Buffer> | null> => {
  try {
    const filePath = getCachePath(url);
    const stat = await fs.stat(filePath);
    if (Date.now() - stat.mtimeMs > oneDayInMilliseconds) {
      await fs.unlink(filePath);
      return null;
    }
    const cached: RequestResponse<string> = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return { ...cached, body: Buffer.from(cached.body, 'base64') };
  } catch {
    return null;
  }
};

const writeCache = async (url: string, response: RequestResponse<Buffer | string>, body: Buffer): Promise<void> => {
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

export function asyncRequest(
  requestOptions: string | { url: string; encoding: null },
): Promise<[RequestResponse<Buffer>, Buffer]>;
export function asyncRequest(requestOptions: {
  url: string;
  encoding?: BufferEncoding;
}): Promise<[RequestResponse<string>, string]>;
export async function asyncRequest(
  requestOptions: string | RequestOptions,
): Promise<[RequestResponse<Buffer | string>, Buffer | string]> {
  const { url, encoding }: RequestOptions =
    typeof requestOptions === 'string' ? { url: requestOptions } : requestOptions;

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
    const bufferBody = Buffer.isBuffer(body) ? body : Buffer.from(body);
    await writeCache(url, response, bufferBody);
  }

  return [response, body];
}

export const imageRequest = (url: string): Promise<RequestResponse<Buffer>> =>
  asyncRequest({ url, encoding: null }).then(([response]) => {
    return response;
  });
