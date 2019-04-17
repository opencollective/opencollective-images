import fetch from 'node-fetch';
import sharp from 'sharp';
import { get } from 'lodash';

import { logger } from '../logger';
import { fetchCollectiveImage } from '../lib/graphql';
import { generateAsciiFromImage } from '../lib/image-generator';
import { getUiAvatarUrl } from '../lib/utils';

const defaultHeight = 128;

export default async function logo(req, res, next) {
  // Keeping the resulting image for 60 days in the CDN cache (we purge that cache on deploy)
  res.setHeader('Cache-Control', `public, max-age=${60 * 24 * 60 * 60}`);

  let collective;
  try {
    collective = await fetchCollectiveImage(req.params.collectiveSlug);
  } catch (e) {
    if (e.message.match(/No collective found/)) {
      return res.status(404).send('Not found');
    }
    logger.debug('>>> collectives.logo error', e);
    return next(e);
  }

  const params = {};

  const height = get(req.query, 'height', get(req.params, 'height'));
  const width = get(req.query, 'width', get(req.params, 'width'));

  if (Number(height)) {
    params['height'] = Number(height);
  }

  if (Number(width)) {
    params['width'] = Number(width);
  }

  let imageUrl = collective.image;
  if (!imageUrl && collective.type === 'USER') {
    imageUrl = getUiAvatarUrl(req.params.collectiveSlug, params.height || defaultHeight);
  }

  switch (req.params.format) {
    case 'txt':
      generateAsciiFromImage(imageUrl, {
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
          return next(new Error(`Unable to create an ASCII art for ${imageUrl}`));
        });
      break;

    default:
      try {
        const image = await fetch(imageUrl);
        if (!image.ok) {
          return res.status(image.status).send(image.statusText);
        }

        const transform = sharp()
          .resize(params.width, params.height || defaultHeight)
          .toFormat(req.params.format);

        image.body.pipe(transform).pipe(res);
      } catch (err) {
        console.log(err);
        return res.status(500).send('Internal Server Error');
      }

      break;
  }
}
