import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import fetch from 'node-fetch';
import sharp from 'sharp';
import mime from 'mime-types';
import { get } from 'lodash';

import { logger } from '../logger';
import { fetchCollectiveWithCache } from '../lib/graphql';
import { generateAsciiFromImage } from '../lib/image-generator';
import { getUiAvatarUrl } from '../lib/utils';

const defaultHeight = 128;

const readFile = promisify(fs.readFile);

const staticImagesFolder = path.resolve(__dirname, '..', '..', 'static', 'images');

export default async function logo(req, res, next) {
  let collective;
  try {
    collective = await fetchCollectiveWithCache(req.params.collectiveSlug);
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

  let image;
  let imageUrl = collective.image;

  if (!imageUrl) {
    if (!collective.name || collective.name === 'anonymous') {
      image = await readFile(path.resolve(staticImagesFolder, 'anonymous-logo-square.png'));
    } else if (collective.type === 'USER') {
      imageUrl = getUiAvatarUrl(collective.name, params.height || defaultHeight, false);
    }
  }
  // TODO: add clearbit handling for organizations here?

  if (!image && !imageUrl) {
    return res.status(404).send('Not found');
  }

  switch (req.params.format) {
    case 'txt':
      logger.warn(`logo: generating ascii from ${imageUrl}`);
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
        if (!image) {
          logger.info(`logo: fetching ${imageUrl}`);
          const response = await fetch(imageUrl);
          if (!response.ok) {
            return res.status(response.status).send(response.statusText);
          }
          image = await response.buffer();
          if (image.byteLength === 0) {
            return res.status(400).send('Invalid Image');
          }
        }

        const resizedImage = await sharp(image)
          .resize(params.width, params.height || defaultHeight)
          .toFormat(req.params.format)
          .toBuffer();

        res.set('Content-Type', mime.lookup(req.params.format)).send(resizedImage);
      } catch (err) {
        logger.error(`logo: ${err.message}`);
        return res.status(500).send('Internal Server Error');
      }

      break;
  }
}
