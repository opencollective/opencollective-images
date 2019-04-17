import request from 'request';
import graphicsMagick from 'gm';

import { logger } from '../logger';
import { fetchCollectiveImage } from '../lib/graphql';
import { generateAsciiFromImage } from '../lib/image-generator';

export default async function logo(req, res, next) {
  // Keeping the resulting image for 60 days in the CDN cache (we purge that cache on deploy)
  res.setHeader('Cache-Control', `public, max-age=${60 * 24 * 60 * 60}`);

  let collective;
  try {
    collective = await fetchCollectiveImage(req.params.collectiveSlug);
    if (!collective.image) {
      return res.status(404).send('Not found (No collective image)');
    }
  } catch (e) {
    if (e.message.match(/No collective found/)) {
      return res.status(404).send('Not found');
    }
    logger.debug('>>> collectives.logo error', e);
    return next(e);
  }
  const imagesrc = collective.image;

  const params = {};
  const { width, height } = req.query;
  if (Number(width)) {
    params['width'] = Number(width);
  }
  if (Number(height)) {
    params['height'] = Number(height);
  }

  switch (req.params.format) {
    case 'txt':
      generateAsciiFromImage(imagesrc, {
        bg: req.query.bg === 'true' ? true : false,
        fg: req.query.fg === 'true' ? true : false,
        white_bg: req.query.white_bg === 'false' ? false : true,
        colored: req.query.colored === 'false' ? false : true,
        size: {
          height: params.height || 20,
          width: params.width,
        },
        variant: req.query.variant || 'wide',
        trim: req.query.trim !== 'false',
        reverse: req.query.reverse === 'true' ? true : false,
      })
        .then(ascii => {
          res.setHeader('content-type', 'text/plain; charset=us-ascii');
          res.send(`${ascii}\n`);
        })
        .catch(() => {
          return next(new Error(`Unable to create an ASCII art for ${imagesrc}`));
        });
      break;

    default:
      graphicsMagick(request(imagesrc))
        .resize(params.width, params.height)
        .stream(req.params.format)
        .pipe(res);
      break;
  }
}
