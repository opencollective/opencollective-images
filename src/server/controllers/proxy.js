import debug from 'debug';
import mime from 'mime-types';
import fetch from 'node-fetch';
import { useAgent } from 'request-filtering-agent';
import sharp from 'sharp';

import { logger } from '../logger';

const debugProxy = debug('proxy');

export default async function proxy(req, res) {
  const { src: imageUrl, width, height } = req.query;

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch (err) {
    return res.status(400).send('Invalid parameter: "src"');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).send('Invalid parameter: "src"');
  }

  debugProxy(`fetching ${imageUrl}`);
  let response;
  try {
    response = await fetch(imageUrl, { agent: (url) => useAgent(url.href) });
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
  const image = await response.buffer();
  if (image.byteLength === 0) {
    logger.error(`proxy: error processing ${imageUrl} (Invalid Image)`);
    return res.status(400).send('Invalid Image');
  }

  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const resizeWidth = Number(width) || (Number(height) ? undefined : 320);
  const resizeHeight = Number(height) || undefined;
  const finalFormat = 'png';

  const sharpImage = sharp(image).resize(resizeWidth, resizeHeight, { fit: 'contain', background: transparent });
  const finalImageBuffer = await sharpImage.toFormat(finalFormat).toBuffer();

  res.set('Content-Type', mime.lookup(finalFormat)).send(finalImageBuffer);
}
