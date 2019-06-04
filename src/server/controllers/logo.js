import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import debug from 'debug';
import fetch from 'node-fetch';
import sharp from 'sharp';
import mime from 'mime-types';
import { get, omit } from 'lodash';

import { logger } from '../logger';
import { fetchCollectiveWithCache } from '../lib/graphql';
import { generateAsciiLogo } from '../lib/ascii-logo';
import { getUiAvatarUrl, parseToBooleanDefaultFalse, parseToBooleanDefaultTrue } from '../lib/utils';

const defaultHeight = 128;

const readFile = promisify(fs.readFile);

const staticFolder = path.resolve(__dirname, '..', '..', 'static');

const debugLogo = debug('logo');

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

  if (githubUsername) {
    debugLogo(
      `generating ${githubUsername} (github): ${JSON.stringify(omit(req.params, ['githubUsername', 'image']))}`,
    );
  } else {
    debugLogo(
      `generating ${collectiveSlug} (collective): ${JSON.stringify(omit(req.params, ['collectiveSlug', 'image']))}`,
    );
  }

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
      debugLogo(`generating ascii for ${collectiveSlug} from ${imageUrl}`);
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
        .catch(err => {
          logger.error(`logo: unable to generate ascii for ${collectiveSlug} from ${imageUrl} (${err.message})`);
          return res.status(400).send(`Unable to create an ASCII art.`);
        });
      break;

    default:
      try {
        const height = params.height || defaultHeight;
        const width = params.width;

        let image;
        if (!imageUrl.includes('https://')) {
          image = await readFile(path.join(staticFolder, imageUrl));
        }

        if (!image) {
          debugLogo(`fetching ${imageUrl}`);
          const response = await fetch(imageUrl);
          if (!response.ok) {
            logger.error(`logo: error processing ${imageUrl} (status=${response.status} ${response.statusText})`);
            return res.status(response.status).send(response.statusText);
          }
          image = await response.buffer();
          if (image.byteLength === 0) {
            logger.error(`logo: error processing ${imageUrl} (Invalid Image)`);
            return res.status(400).send('Invalid Image');
          }
        }

        let processedImage = sharp(image);

        if (style === 'rounded') {
          const roundedCorners = Buffer.from(
            `<svg><rect x="0" y="0" width="${height}" height="${height}" rx="${height}" ry="${height}"/></svg>`,
          );
          processedImage = processedImage
            .resize(height, height)
            // about "composite"
            // https://sharp.pixelplumbing.com/en/stable/api-composite/
            .composite([
              {
                input: roundedCorners,
                // about "dest-in"
                // https://libvips.github.io/libvips/API/current/libvips-conversion.html#VipsBlendMode
                // the second (input) object is removed completely
                // the first (original) is only drawn where the second was
                blend: 'dest-in',
              },
            ]);
        } else {
          processedImage = processedImage.resize(width, height, {
            fit: 'contain',
            background: format === 'jpg' ? 'white' : { r: 255, g: 255, b: 255, alpha: 0 },
          });
        }

        if (format === 'jpg') {
          processedImage = processedImage.flatten({ background: 'white' });
        }

        processedImage = await processedImage.toFormat(format).toBuffer();

        res.set('Content-Type', mime.lookup(format)).send(processedImage);
      } catch (err) {
        logger.error(`logo: error processing ${imageUrl} (${err.message})`);
        return res.status(500).send('Internal Server Error');
      }

      break;
  }
}
