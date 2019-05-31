import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import fetch from 'node-fetch';
import sharp from 'sharp';
import mime from 'mime-types';
import { get } from 'lodash';

import { logger } from '../logger';
import { fetchCollectiveWithCache } from '../lib/graphql';
import { generateAsciiLogo } from '../lib/ascii-logo';
import { getCloudinaryUrl, getUiAvatarUrl, parseToBooleanDefaultFalse, parseToBooleanDefaultTrue } from '../lib/utils';

const defaultHeight = 128;

const readFile = promisify(fs.readFile);

const staticFolder = path.resolve(__dirname, '..', '..', 'static');

const getCollectiveImageUrl = async (collectiveSlug, height = defaultHeight) => {
  const collective = await fetchCollectiveWithCache(collectiveSlug);

  if (!collective.name || collective.name === 'anonymous') {
    return `/images/anonymous-logo-square.png`;
  }

  if (collective.image) {
    return collective.image;
  }

  if (collective.type === 'USER') {
    return getUiAvatarUrl(collective.name, height, false);
  }
};

const getGithubImageUrl = async (githubUsername, height = defaultHeight) => {
  return `https://avatars.githubusercontent.com/${githubUsername}?s=${height}`;
};

export default async function logo(req, res) {
  const collectiveSlug = req.params.collectiveSlug;
  const githubUsername = req.params.githubUsername;

  const format = req.params.format;

  const height = get(req.query, 'height', get(req.params, 'height'));
  const width = get(req.query, 'width', get(req.params, 'width'));
  const style = get(req.query, 'style', get(req.params, 'style'));

  const params = {};

  if (Number(height)) {
    params['height'] = Number(height);
  }

  if (Number(width)) {
    params['width'] = Number(width);
  }

  let imageUrl;
  try {
    if (collectiveSlug) {
      imageUrl = await getCollectiveImageUrl(collectiveSlug, params.height || defaultHeight);
    } else if (githubUsername) {
      imageUrl = await getGithubImageUrl(githubUsername, params.height || defaultHeight);
    }
  } catch (err) {
    if (!err.message.match(/No collective found/)) {
      logger.error(`logo: ${err.message}`);
    }
  }
  if (!imageUrl) {
    return res.status(404).send('Not found');
  }

  switch (format) {
    case 'txt':
      logger.warn(`logo: generating ascii for ${collectiveSlug} from ${imageUrl}`);
      generateAsciiLogo(imageUrl, {
        bg: parseToBooleanDefaultFalse(req.query.bg),
        fg: parseToBooleanDefaultFalse(req.query.fg),
        white_bg: parseToBooleanDefaultTrue(req.query.white_bg),
        colored: parseToBooleanDefaultTrue(req.query.colored),
        size: {
          height: params.height || 20,
          width: params.width,
        },
        variant: req.query.variant || 'wide',
        trim: parseToBooleanDefaultTrue(req.query.trim),
        reverse: parseToBooleanDefaultFalse(req.query.reverse),
      })
        .then(ascii => {
          res.setHeader('content-type', 'text/plain; charset=us-ascii');
          res.send(`${ascii}\n`);
        })
        .catch(() => {
          logger.error(`logo: unable to generate ascii for ${collectiveSlug} from ${imageUrl}`);
          return res.status(400).send(`Unable to create an ASCII art.`);
        });
      break;

    default:
      try {
        const height = params.height || defaultHeight;
        const width = params.width;

        if (style === 'rounded') {
          // For anonymous, we have it already rounded
          if (imageUrl.includes('anonymous-logo-square')) {
            imageUrl = imageUrl.replace('anonymous-logo-square', 'anonymous-logo-rounded');
          }
          // We apply the rounded style through UI Avatars (no border for now)
          else if (imageUrl.includes('rounded=false')) {
            imageUrl = imageUrl.replace('rounded=false', 'rounded=true');
          }
          // We apply the rounded style through Cloudinary
          else {
            imageUrl = getCloudinaryUrl(imageUrl, { height, style });
          }
        }

        let image;
        if (!imageUrl.includes('https://')) {
          image = await readFile(path.join(staticFolder, imageUrl));
        }

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
          .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toFormat(format)
          .toBuffer();

        res.set('Content-Type', mime.lookup(format)).send(resizedImage);
      } catch (err) {
        logger.error(`logo: ${err.message}`);
        return res.status(500).send('Internal Server Error');
      }

      break;
  }
}
