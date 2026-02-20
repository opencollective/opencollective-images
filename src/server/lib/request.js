import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import fetch from './fetch';

const CACHE_DIR = '/tmp/cached-requests';
const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

const ensureCacheDir = () => {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
};

const getCachePath = (url) => {
  const hash = crypto.createHash('sha256').update(url).digest('hex');
  return path.join(CACHE_DIR, hash);
};

const readCache = (url) => {
  try {
    const filePath = getCachePath(url);
    const stat = fs.statSync(filePath);
    if (Date.now() - stat.mtimeMs > oneDayInMilliseconds) {
      fs.unlinkSync(filePath);
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const cached = JSON.parse(raw);
    cached.body = Buffer.from(cached.body, 'base64');
    return cached;
  } catch {
    return null;
  }
};

const writeCache = (url, response, body) => {
  try {
    ensureCacheDir();
    const data = {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      headers: response.headers,
      body: body.toString('base64'),
    };
    fs.writeFileSync(getCachePath(url), JSON.stringify(data));
  } catch {
    // Silently ignore cache write failures
  }
};

export const asyncRequest = async (requestOptions) => {
  const { url, encoding } = typeof requestOptions === 'string' ? { url: requestOptions } : requestOptions;

  // Check file cache
  if (process.env.ENABLE_CACHED_REQUEST) {
    const cached = readCache(url);
    if (cached) {
      const body = encoding === null ? cached.body : cached.body.toString('utf8');
      return [{ ...cached, body }, body];
    }
  }

  const fetchResponse = await fetch(url);

  const body = encoding === null ? Buffer.from(await fetchResponse.arrayBuffer()) : await fetchResponse.text();

  // Return a response shape compatible with the old request module
  const response = {
    statusCode: fetchResponse.status,
    statusMessage: fetchResponse.statusText,
    headers: Object.fromEntries(fetchResponse.headers.entries()),
    body,
  };

  // Write to file cache
  if (process.env.ENABLE_CACHED_REQUEST) {
    const bufferBody = encoding === null ? body : Buffer.from(body);
    writeCache(url, response, bufferBody);
  }

  return [response, body];
};

export const imageRequest = (url) =>
  asyncRequest({ url, encoding: null }).then(([response]) => {
    return response;
  });
