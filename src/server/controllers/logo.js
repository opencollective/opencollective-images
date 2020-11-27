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

const white = 'white';

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const defaultHeight = 128;

const readFile = promisify(fs.readFile);

const staticFolder = path.resolve(__dirname, '..', '..', 'static');

const debugLogo = debug('logo');

const getCollectiveImageUrl = async (collectiveSlug, { height, hash } = {}) => {
  const collective = await fetchCollectiveWithCache(collectiveSlug, { hash });

  // Handle guest & incognito
  if (collective.type === 'USER') {
    if (!collective.name || collective.name === 'anonymous') {
      return '/images/anonymous-logo-square.png';
    } else if (collective.isGuest && collective.name === 'Guest') {
      return '/images/default-guest-logo.png';
    }
  }

  if (collective.image) {
    return collective.image;
  }

  if (['EVENT', 'PROJECT'].includes(collective.type)) {
    const parentCollectiveImage = get(collective, 'parentCollective.image');
    if (parentCollectiveImage) {
      return parentCollectiveImage;
    }
  }

  if (collective.type === 'USER') {
    return getUiAvatarUrl(collective.name, height || defaultHeight, false);
  }

  if (collective.type === 'ORGANIZATION') {
    if (collective.name) {
      return getUiAvatarUrl(collective.name, height || defaultHeight, false, '4E5052', 'F0F1F2', 1);
    } else {
      return '/images/default-organization-logo.png';
    }
  }

  if (['COLLECTIVE', 'FUND', 'EVENT', 'PROJECT'].includes(collective.type)) {
    return '/images/default-collective-logo.png';
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
      imageUrl = await getCollectiveImageUrl(collectiveSlug, {
        height: params.height || defaultHeight,
        hash: req.params.hash,
      });
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
        .then((ascii) => {
          res.setHeader('content-type', 'text/plain; charset=us-ascii');
          res.send(`${ascii}\n`);
        })
        .catch((err) => {
          logger.error(`logo: unable to generate ascii for ${collectiveSlug} from ${imageUrl} (${err.message})`);
          return res.status(400).send('Unable to create an ASCII art.');
        });
      break;

    default:
      try {
        const height = params.height || defaultHeight;
        const width = params.width;

        let image;
        if (!imageUrl.includes('https://') && !imageUrl.includes('http://')) {
          image = await readFile(path.join(staticFolder, imageUrl));
        }

        if (!image) {
          debugLogo(`fetching ${imageUrl}`);
          const response = await fetch(imageUrl);
          if (!response.ok) {
            if (response.status === 404) {
              logger.info(`logo: not found ${imageUrl} (status=${response.status} ${response.statusText})`);
            } else {
              logger.error(`logo: error processing ${imageUrl} (status=${response.status} ${response.statusText})`);
            }
            return res.status(response.status).send(response.statusText);
          }
          image = await response.buffer();
          if (image.byteLength === 0) {
            logger.error(`logo: error processing ${imageUrl} (Invalid Image)`);
            return res.status(400).send('Invalid Image');
          }
        }

        let sharpImage;
        if (style === 'rounded') {
          const roundedCorners = Buffer.from(
            `<svg><rect x="0" y="0" width="${height}" height="${height}" rx="${height}" ry="${height}"/></svg>`,
          );
          sharpImage = sharp(image)
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
          sharpImage = sharp(image).resize(width, height, { fit: 'contain', background: transparent });
        }

        let finalImageBuffer;
        if (format === 'jpg') {
          // We have to do this special treatment to avoid having a default black background
          const imageWithTransparency = await sharpImage.toFormat('png').toBuffer();
          finalImageBuffer = await sharp(imageWithTransparency).flatten({ background: white }).jpeg().toBuffer();
        } else {
          finalImageBuffer = await sharpImage.toFormat(format).toBuffer();
        }

        res.set('Content-Type', mime.lookup(format)).send(finalImageBuffer);
      } catch (err) {
        logger.error(`logo: error processing ${imageUrl} (${err.message})`);
        return res.status(500).send('Internal Server Error');
      }

      break;
  }
}
