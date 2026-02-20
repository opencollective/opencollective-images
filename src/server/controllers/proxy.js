import debug from 'debug';
import mime from 'mime-types';
import fetch from 'node-fetch';
import { useAgent } from 'request-filtering-agent';
import sharp from 'sharp';

import { MAX_PROXY_IMAGE_BYTES, MAX_PROXY_IMAGE_DIMENSION, PROXY_FETCH_TIMEOUT } from '../lib/constants';
import { logger } from '../logger';

const debugProxy = debug('proxy');

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const white = { r: 255, g: 255, b: 255, alpha: 1 };

// Locally and on CI, the sources we proxy are served from localhost. The previous
// Cloudinary based implementation had the same carve-out for development.
const allowPrivateIPAddress = ['development', 'test', 'ci'].includes(process.env.OC_ENV);

// The source is user provided, so we only accept sane dimensions
function parseDimension(value) {
  const parsed = Number(value);
  if (!parsed || parsed < 1) {
    return undefined;
  }
  return Math.min(Math.round(parsed), MAX_PROXY_IMAGE_DIMENSION);
}

export default async function proxy(req, res) {
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

  debugProxy(`fetching ${imageUrl}`);
  let response;
  try {
    response = await fetch(imageUrl, {
      // "request-filtering-agent" rejects private and loopback addresses
      agent: (url) => useAgent(url.href, { allowPrivateIPAddress, allowMetaIPAddress: false }),
      timeout: PROXY_FETCH_TIMEOUT,
      size: MAX_PROXY_IMAGE_BYTES,
    });
  } catch (err) {
    logger.info(`proxy: blocked or invalid ${imageUrl} (${err.message})`);
    return res.status(400).send('Invalid parameter: "src"');
  }
  if (!response.ok) {
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
    // Thrown by node-fetch when the body goes over the "size" limit
    logger.info(`proxy: unable to download ${imageUrl} (${err.message})`);
    return res.status(400).send('Invalid parameter: "src"');
  }
  if (image.byteLength === 0) {
    logger.error(`proxy: error processing ${imageUrl} (Invalid Image)`);
    return res.status(400).send('Invalid Image');
  }

  const resizeWidth = parseDimension(width) || (parseDimension(height) ? undefined : 320);
  const resizeHeight = parseDimension(height);

  try {
    // Only keep the alpha channel when the source has one, otherwise we're
    // inflating photographic images by serving them as PNG
    const { hasAlpha } = await sharp(image).metadata();
    const format = hasAlpha ? 'png' : 'jpeg';
    const background = hasAlpha ? transparent : white;

    const finalImageBuffer = await sharp(image)
      .resize(resizeWidth, resizeHeight, { fit: 'contain', background })
      .toFormat(format)
      .toBuffer();

    res.set('Content-Type', mime.lookup(format)).send(finalImageBuffer);
  } catch (err) {
    logger.error(`proxy: error processing ${imageUrl} (${err.message})`);
    return res.status(400).send('Invalid Image');
  }
}
