import sharp from 'sharp';
import mime from 'mime-types';
import { get } from 'lodash';

import { logger } from '../logger';
import { asyncRequest } from '../lib/request';
import { fetchCollectiveWithCache } from '../lib/graphql';

const getImageData = url => asyncRequest({ url, encoding: null }).then(result => result[1]);

export default async function background(req, res, next) {
  let collective;
  try {
    collective = await fetchCollectiveWithCache(req.params.collectiveSlug);
    if (!collective.backgroundImage) {
      return res.status(404).send('Not found (No collective backgroundImage)');
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

  if (Number(width)) {
    params['width'] = Number(width);
  }
  if (Number(height)) {
    params['height'] = Number(height);
  }

  const image = await getImageData(collective.backgroundImage);

  const resizedImage = await sharp(image)
    .resize(params.width, params.height)
    .toFormat(format)
    .toBuffer();

  res.set('Content-Type', mime.lookup(format)).send(resizedImage);
}
