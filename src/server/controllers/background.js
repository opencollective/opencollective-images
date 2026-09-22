import { get } from 'lodash';
import mime from 'mime-types';
import sharp from 'sharp';

import { fetchCollectiveWithCache } from '../lib/graphql';
import { normalizeSize } from '../lib/image-size';
import { imageRequest } from '../lib/request';
import { RemoteImageUrlNotAllowedError } from '../lib/safe-remote-url';
import { logger } from '../logger';

const getImageData = async (url) => {
  const response = await imageRequest(url);
  if (response.statusCode !== 200) {
    throw new Error(`Failed to fetch image: ${response.statusCode}`);
  }
  return response.body;
};

export default async function background(req, res, next) {
  const collectiveSlug = req.params.collectiveSlug;
  const hash = req.params.hash;

  let collective, imageUrl;
  try {
    collective = await fetchCollectiveWithCache(collectiveSlug, { hash });
    imageUrl = collective.backgroundImage || get(collective, 'parentCollective.backgroundImage');
    if (!imageUrl) {
      return res.status(404).send('Not found (no collective/parentCollective backgroundImage)');
    }
  } catch (e) {
    if (e.message.match(/No collective found/)) {
      return res.status(404).send('Not found');
    }
    logger.debug('>>> collectives.background error', e);
    return next(e);
  }

  const format = req.params.format;

  const height = get(req.query, 'height', get(req.params, 'height'));
  const width = get(req.query, 'width', get(req.params, 'width'));

  const params = {};

  // Profile page hero uses ~1800x800
  if (Number(width)) {
    params['width'] = Number(width);
    params.width = normalizeSize(params.width, 1800);
  }
  if (Number(height)) {
    params['height'] = Number(height);
    params.height = normalizeSize(params.height, 800);
  }

  let image;
  try {
    image = await getImageData(imageUrl);
  } catch (err) {
    if (err instanceof RemoteImageUrlNotAllowedError) {
      logger.error(`background: blocked remote image URL ${imageUrl} (${err.message})`);
      return res.status(400).send('Invalid image URL');
    }
    logger.error(`background: error fetching ${imageUrl} (${err.message})`);
    return res.status(502).send('Bad Gateway');
  }

  try {
    const resizedImage = await sharp(image).resize(params.width, params.height).toFormat(format).toBuffer();

    res.set('Content-Type', mime.lookup(format)).send(resizedImage);
  } catch (err) {
    logger.error(`background: error processing ${imageUrl} (${err.message})`);
    return res.status(500).send('Internal Server Error');
  }
}
