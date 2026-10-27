import type { NextFunction, Request, Response } from 'express';
import { get } from 'lodash';
import mime from 'mime-types';
import type { FormatEnum } from 'sharp';
import sharp from 'sharp';

import { fetchCollectiveWithCache } from '../lib/graphql';
import { normalizeSize } from '../lib/image-size';
import { asyncRequest } from '../lib/request';
import { logger } from '../logger';

type BackgroundParams = Record<string, string> & {
  collectiveSlug: string;
  hash?: string;
  height?: string;
  width?: string;
  format?: string;
};

type BackgroundQuery = {
  height?: string;
  width?: string;
};

type BackgroundRequest = Request<BackgroundParams, unknown, unknown, BackgroundQuery>;

const getImageData = (url: string): Promise<Buffer> =>
  asyncRequest({ url, encoding: null }).then((result) => result[1]);

export default async function background(
  req: BackgroundRequest,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
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

  const params: { height?: number; width?: number } = {};

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
    logger.error(`background: error fetching ${imageUrl} (${err.message})`);
    return res.status(502).send('Unable to fetch background image');
  }

  try {
    // sharp accepts the `jpg` alias at runtime, but its types only declare `jpeg`
    const resizedImage = await sharp(image)
      .resize(params.width, params.height)
      .toFormat(format as keyof FormatEnum)
      .toBuffer();

    res.set('Content-Type', mime.lookup(format) as string).send(resizedImage);
  } catch (err) {
    logger.error(`background: error processing ${imageUrl} (${err.message})`);
    return res.status(500).send('Internal Server Error');
  }
}
