import request from 'request';
import graphicsMagick from 'gm';

import { logger } from '../logger';
import { fetchCollectiveWithCache } from '../lib/graphql';

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

  const params = {};
  const { width, height } = req.query;
  if (Number(width)) {
    params['width'] = Number(width);
  }
  if (Number(height)) {
    params['height'] = Number(height);
  }

  graphicsMagick(request(collective.backgroundImage))
    .resize(params.width, params.height)
    .stream(req.params.format)
    .pipe(res);
}
