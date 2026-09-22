import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import debug from 'debug';
import { get, omit } from 'lodash';
import mime from 'mime-types';
import sharp from 'sharp';

import { generateAsciiLogo } from '../lib/ascii-logo';
import { MAX_AVATAR_HEIGHT } from '../lib/constants';
import { fetchCollectiveWithCache } from '../lib/graphql';
import { normalizeSize } from '../lib/image-size';
import { fetchRemoteImageBody } from '../lib/request';
import { isRemoteImageHttpUrl, RemoteImageUrlNotAllowedError } from '../lib/safe-remote-url';
import { getUiAvatarUrl, parseToBooleanDefaultFalse, parseToBooleanDefaultTrue } from '../lib/utils';
import { logger } from '../logger';

const white = 'white';

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const defaultHeight = 128;

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

const staticFolder = path.resolve(__dirname, '..', '..', 'static');

const SAFE_IMAGE_EXTENSION = /^\.[a-z0-9]{1,5}$/;

const extensionFromBuffer = (body) => {
  if (!body || body.length < 3) {
    return '';
  }
  if (body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) {
    return '.png';
  }
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
    return '.jpg';
  }
  if (body.slice(0, 3).toString() === 'GIF') {
    return '.gif';
  }
  const head = body.slice(0, 256).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) {
    return '.svg';
  }
  return '';
};

const imageFileExtension = (imageUrl, contentType, body) => {
  const sniffed = extensionFromBuffer(body);
  if (sniffed) {
    return sniffed;
  }

  try {
    const ext = path.extname(new URL(imageUrl).pathname).toLowerCase();
    if (SAFE_IMAGE_EXTENSION.test(ext)) {
      return ext;
    }
  } catch {
    // Fall through to the content type.
  }

  const type = typeof contentType === 'string' ? contentType.split(';')[0].trim() : '';
  const fromType = type ? mime.extension(type) : false;
  if (fromType && SAFE_IMAGE_EXTENSION.test(`.${fromType}`)) {
    return `.${fromType}`;
  }

  return '.img';
};

const writeTempImage = async (body, imageUrl, contentType) => {
  const filePath = path.join(
    os.tmpdir(),
    `oc-logo-${crypto.randomBytes(16).toString('hex')}${imageFileExtension(imageUrl, contentType, body)}`,
  );
  await writeFile(filePath, body);
  return filePath;
};

const debugLogo = debug('logo');

const DEFAULT_COLLECTIVE_LOGOS = [
  '/images/default-collective-logo-1.png',
  '/images/default-collective-logo-2.png',
  '/images/default-collective-logo-3.png',
  '/images/default-collective-logo-4.png',
];

const DEFAULT_FUND_LOGOS = [
  '/images/default-fund-logo-1.png',
  '/images/default-fund-logo-2.png',
  '/images/default-fund-logo-3.png',
  '/images/default-fund-logo-4.png',
];

const getDefaultAvatar = (collective) => {
  return DEFAULT_COLLECTIVE_LOGOS[collective.id % 4];
};

const getDefaultFundAvatar = (collective) => {
  return DEFAULT_FUND_LOGOS[collective.id % 4];
};

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
  if (collective.type === 'VENDOR') {
    return '/images/vendor.svg';
  }

  if (collective.type === 'FUND') {
    return getDefaultFundAvatar(collective);
  }

  if (['COLLECTIVE', 'FUND', 'EVENT', 'PROJECT'].includes(collective.type)) {
    return getDefaultAvatar(collective);
  }
};

export default async function logo(req, res) {
  const collectiveSlug = req.params.collectiveSlug;

  debugLogo(
    `generating ${collectiveSlug} (collective): ${JSON.stringify(omit(req.params, ['collectiveSlug', 'image']))}`,
  );

  const format = req.params.format;

  const height = get(req.query, 'height', get(req.params, 'height'));
  const width = get(req.query, 'width', get(req.params, 'width'));
  const style = get(req.query, 'style', get(req.params, 'style'));

  const params = {};

  if (Number(height)) {
    params['height'] = Number(height);
    params.height = normalizeSize(params.height, MAX_AVATAR_HEIGHT);
  }

  if (Number(width)) {
    params['width'] = Number(width);
    params.width = normalizeSize(params.width, MAX_AVATAR_HEIGHT);
  }

  let imageUrl;
  try {
    if (collectiveSlug) {
      imageUrl = await getCollectiveImageUrl(collectiveSlug, {
        height: params.height || defaultHeight,
        hash: req.params.hash,
      });
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
    case 'txt': {
      debugLogo(`generating ascii for ${collectiveSlug} from ${imageUrl}`);
      let tempImagePath;
      try {
        let imageSource = imageUrl;
        if (isRemoteImageHttpUrl(imageUrl)) {
          const { response, body } = await fetchRemoteImageBody(imageUrl);
          if (response.statusCode !== 200 || !body || body.byteLength === 0) {
            logger.error(
              `logo: unable to generate ascii for ${collectiveSlug} from ${imageUrl} (status=${response.statusCode})`,
            );
            return res.status(400).send('Unable to create an ASCII art.');
          }
          tempImagePath = await writeTempImage(body, imageUrl, response.headers['content-type']);
          imageSource = tempImagePath;
        }

        const ascii = await generateAsciiLogo(imageSource, {
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
        });
        res.setHeader('content-type', 'text/plain; charset=us-ascii');
        return res.send(`${ascii}\n`);
      } catch (err) {
        if (err instanceof RemoteImageUrlNotAllowedError) {
          logger.error(`logo: blocked remote image URL ${imageUrl} (${err.message})`);
          return res.status(400).send('Invalid image URL');
        }
        logger.error(`logo: unable to generate ascii for ${collectiveSlug} from ${imageUrl} (${err.message})`);
        return res.status(400).send('Unable to create an ASCII art.');
      } finally {
        if (tempImagePath) {
          unlink(tempImagePath).catch(() => {});
        }
      }
    }

    default:
      try {
        const height = params.height || defaultHeight;
        const width = params.width;

        let image;
        if (!isRemoteImageHttpUrl(imageUrl)) {
          image = await readFile(path.join(staticFolder, imageUrl));
        }

        if (!image) {
          debugLogo(`fetching ${imageUrl}`);
          try {
            const { response, body } = await fetchRemoteImageBody(imageUrl);
            if (response.statusCode !== 200) {
              if (response.statusCode === 404) {
                logger.info(`logo: not found ${imageUrl} (status=${response.statusCode} ${response.statusMessage})`);
              } else {
                logger.error(
                  `logo: error processing ${imageUrl} (status=${response.statusCode} ${response.statusMessage})`,
                );
              }
              return res.status(response.statusCode).send(response.statusMessage);
            }
            image = body;
            if (image.byteLength === 0) {
              logger.error(`logo: error processing ${imageUrl} (Invalid Image)`);
              return res.status(400).send('Invalid Image');
            }
          } catch (err) {
            if (err instanceof RemoteImageUrlNotAllowedError) {
              logger.error(`logo: blocked remote image URL ${imageUrl} (${err.message})`);
              return res.status(400).send('Invalid image URL');
            }
            throw err;
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
