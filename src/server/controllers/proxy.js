import debug from 'debug';
import mime from 'mime-types';
import fetch from 'node-fetch';
import { useAgent } from 'request-filtering-agent';
import sharp from 'sharp';

import { MAX_PROXY_IMAGE_BYTES, MAX_PROXY_IMAGE_DIMENSION, PROXY_FETCH_TIMEOUT } from '../lib/constants';
import { parseToBooleanDefaultFalse } from '../lib/utils';
import { logger } from '../logger';

const debugProxy = debug('proxy');

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const white = { r: 255, g: 255, b: 255, alpha: 1 };

// Private and loopback addresses are rejected, except where the sources we proxy
// are served from localhost: local development, and the test harness, which opts
// in explicitly because it starts this server with NODE_ENV=production.
const allowPrivateIPAddress =
  process.env.OC_ENV === 'development' || parseToBooleanDefaultFalse(process.env.PROXY_ALLOW_PRIVATE_IP);

// Express turns a repeated or bracketed query parameter into an array or an object,
// and coercing those can throw, so we only ever look at scalars
function parseDimension(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }
  return Math.min(Math.round(parsed), MAX_PROXY_IMAGE_DIMENSION);
}

async function handleProxy(req, res) {
  const { src: imageUrl, width, height } = req.query;

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return res.status(400).send('Invalid parameter: "src"');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).send('Invalid parameter: "src"');
  }

  const requestedWidth = parseDimension(width);
  const requestedHeight = parseDimension(height);

  debugProxy(`fetching ${imageUrl}`);
  // node-fetch hands over a stream piped from the socket, so destroying the body
  // leaves the download running. Only aborting the request closes the connection.
  const controller = new AbortController();
  let response;
  try {
    response = await fetch(imageUrl, {
      // "request-filtering-agent" rejects private and loopback addresses
      agent: (url) => useAgent(url.href, { allowPrivateIPAddress, allowMetaIPAddress: false }),
      timeout: PROXY_FETCH_TIMEOUT,
      size: MAX_PROXY_IMAGE_BYTES,
      signal: controller.signal,
    });
  } catch (err) {
    controller.abort();
    logger.info(`proxy: blocked or invalid ${imageUrl} (${err.message})`);
    return res.status(400).send('Invalid parameter: "src"');
  }
  if (!response.ok) {
    controller.abort();
    if (response.status === 404) {
      logger.info(`proxy: not found ${imageUrl} (status=${response.status} ${response.statusText})`);
    } else {
      logger.error(`proxy: error processing ${imageUrl} (status=${response.status} ${response.statusText})`);
    }
    return res.status(response.status).send(response.statusText);
  }

  let image;
  try {
    image = await response.buffer();
  } catch (err) {
    controller.abort();
    logger.info(`proxy: unable to download ${imageUrl} (${err.message})`);
    return res.status(400).send('Invalid parameter: "src"');
  }
  if (image.byteLength === 0) {
    logger.error(`proxy: error processing ${imageUrl} (Invalid Image)`);
    return res.status(400).send('Invalid Image');
  }

  const resizeWidth = requestedWidth || (requestedHeight ? undefined : 320);
  const resizeHeight = requestedHeight;

  try {
    // Only keep the alpha channel when the source has one, otherwise we're
    // inflating photographic images by serving them as PNG
    const { hasAlpha } = await sharp(image).metadata();
    const format = hasAlpha ? 'png' : 'jpeg';
    const background = hasAlpha ? transparent : white;

    // With a single dimension Sharp derives the other one from the aspect ratio,
    // so we pass the limit for the free axis to bound the output either way
    const fit = resizeWidth && resizeHeight ? 'contain' : 'inside';

    const finalImageBuffer = await sharp(image)
      // Applies the EXIF orientation, which is otherwise dropped from the output
      .rotate()
      .resize(resizeWidth || MAX_PROXY_IMAGE_DIMENSION, resizeHeight || MAX_PROXY_IMAGE_DIMENSION, { fit, background })
      .toFormat(format)
      .toBuffer();

    res.set('Content-Type', mime.lookup(format)).send(finalImageBuffer);
  } catch (err) {
    logger.error(`proxy: error processing ${imageUrl} (${err.message})`);
    return res.status(400).send('Invalid Image');
  }
}

export default async function proxy(req, res) {
  // Express 4 does not route a rejected async handler to the error middleware,
  // so anything unexpected here would take the process down
  try {
    await handleProxy(req, res);
  } catch (err) {
    logger.error(`proxy: unexpected error (${err.message})`);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
}
