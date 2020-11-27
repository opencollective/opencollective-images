import fs from 'fs';
import path from 'path';
import sizeOf from 'image-size';
import debug from 'debug';
import mime from 'mime-types';

import { logger } from '../logger';
import { fetchMembersWithCache } from '../lib/graphql';
import { getCloudinaryUrl, parseToBooleanDefaultFalse, parseToBooleanDefaultTrue } from '../lib/utils';
import { imageRequest } from '../lib/request';

const debugAvatar = debug('avatar');

const imagesUrl = process.env.IMAGES_URL;

const getSvg = (svgPath) => fs.readFileSync(path.join(__dirname, svgPath), { encoding: 'utf8' });

const anonymousSvg = getSvg('../../static/images/default-anonymous-logo.svg');
const guestSvg = getSvg('../../static/images/default-guest-logo.svg');

const sendSvg = (res, svg) => {
  res.setHeader('Cache-Control', 'public, max-age=7200');
  res.setHeader('Content-Type', 'image/svg+xml;charset=utf-8');
  return res.send(svg);
};

const imageAsSvg = (buffer, { maxHeight, selector, imageformat }) => {
  const imageHeight = Math.round(maxHeight / 2);
  const contentType = mime.lookup(imageformat);

  let imageWidth = 64;

  if (selector.match(/sponsor/)) {
    try {
      const dimensions = sizeOf(buffer);
      imageWidth = Math.round((dimensions.width / dimensions.height) * imageHeight);
    } catch (err) {
      throw new Error('Unable to get image size.');
    }
  }

  const base64data = buffer.toString('base64');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${imageWidth}" height="${imageHeight}">
        <image width="${imageWidth}" height="${imageHeight}" xlink:href="data:${contentType};base64,${base64data}"/>
      </svg>`;
};

const proxyImage = async (req, res, imageUrl, { imageFormat }) => {
  const response = await imageRequest(imageUrl);
  if (response.statusCode !== 200) {
    return res.status(response.statusCode).send(response.statusMessage);
  }
  const image = response.body;
  if (image.byteLength === 0) {
    return res.status(400).send('Invalid Image');
  }

  res.setHeader('Cache-Control', 'public, max-age=7200');
  res.setHeader('Content-Type', mime.lookup(imageFormat));

  return res.send(image);
};

export default async function avatar(req, res) {
  if (req.params.backerType && req.params.backerType === 'contributors') {
    return res.status(404).send('Not found');
  }

  if (
    req.params.backerType &&
    (req.params.backerType.match(/organization/i) || req.params.backerType.match(/individual/i))
  ) {
    req.params.isActive = parseToBooleanDefaultFalse(req.query.isActive);
  } else {
    req.params.isActive = parseToBooleanDefaultTrue(req.query.isActive);
  }

  let users;
  try {
    users = await fetchMembersWithCache(req.params);
  } catch (err) {
    // Invalid collectiveSlug (not found) or No collective found with slug
    if (err.message.match(/not found/) || err.message.match(/No collective found/)) {
      return res.status(404).send('Not found');
    }
    logger.error(`avatar: error while fetching members (${err.message})`);
    return res.status(400).send('Unable to fetch avatar');
  }

  const { tierSlug, backerType } = req.params;

  const format = req.params.format || 'svg';
  const selector = tierSlug || backerType;
  const position = parseInt(req.params.position, 10);
  const user = position < users.length ? users[position] : {};

  // Unexisting position or button
  if (position == users.length) {
    let buttonImage;
    if (selector.match(/sponsor/)) {
      buttonImage = `${imagesUrl}/static/images/become_sponsor.svg`;
    } else if (selector.match(/backer/)) {
      buttonImage = `${imagesUrl}/static/images/become_backer.svg`;
    } else {
      buttonImage = `${imagesUrl}/static/images/contribute.svg`;
    }
    return res.redirect(buttonImage);
  } else if (position > users.length) {
    return res.redirect(`${imagesUrl}/static/images/1px.png`);
  }

  let maxHeight, maxWidth;

  if (req.query.avatarHeight) {
    maxHeight = Number(req.query.avatarHeight);
  } else {
    maxHeight = format === 'svg' ? 128 : 64;
    if (selector.match(/silver/)) {
      maxHeight *= 1.25;
    }
    if (selector.match(/gold/)) {
      maxHeight *= 1.5;
    }
    if (selector.match(/diamond/)) {
      maxHeight *= 2;
    }
    maxWidth = maxHeight * 3;
  }

  const imageFormat = format === 'jpg' ? format : 'png';

  // Special cases for USER
  if (user.type === 'USER') {
    // Anonymous
    if (!user.name || user.name === 'anonymous') {
      const imageHeight = Math.round(maxHeight / 2);
      return sendSvg(
        res,
        anonymousSvg.replace('width="88"', `width="${imageHeight}"`).replace('height="88"', `height="${imageHeight}"`),
      );
    } else if (user.isGuest && user.name === 'Guest') {
      const imageHeight = Math.round(maxHeight / 2);
      return sendSvg(
        res,
        guestSvg.replace('width="96"', `width="${imageHeight}"`).replace('height="96"', `height="${imageHeight}"`),
      );
    }

    // Normal image
    let imageUrl = `${process.env.IMAGES_URL}/${user.slug}/avatar/rounded/${maxHeight}.${imageFormat}`;
    // Use Cloudinary directly if internal images disabled
    if (process.env.DISABLE_BANNER_INTERNAL_IMAGES) {
      imageUrl = getCloudinaryUrl(user.image, { height: maxHeight, style: 'rounded', format: imageFormat });
    }
    debugAvatar(`Serving ${imageUrl} for ${user.slug} (type=USER)`);
    try {
      if (format === 'svg') {
        const response = await imageRequest(imageUrl);
        if (response.statusCode !== 200) {
          return res.status(response.statusCode).send(response.statusMessage);
        }
        const image = response.body;
        if (image.byteLength === 0) {
          return res.status(400).send('Invalid Image');
        }
        return sendSvg(res, imageAsSvg(image, { selector, maxHeight, imageFormat }));
      } else {
        return proxyImage(req, res, imageUrl, { imageFormat });
      }
    } catch (err) {
      logger.error(`avatar: unable to serve ${imageUrl} for ${user.slug}: ${err.message}`);
      return res.status(400).send('Unable to fetch image.');
    }
  }

  // Default case (likely Organizations)
  let imageUrl = `${process.env.IMAGES_URL}/${user.slug}/logo/square/${maxHeight}/${maxWidth}.${imageFormat}`;
  // Use Cloudinary directly if internal images disabled
  if (process.env.DISABLE_BANNER_INTERNAL_IMAGES) {
    imageUrl = getCloudinaryUrl(user.image, { height: maxHeight, width: maxWidth, format: imageFormat });
  }
  debugAvatar(`Serving ${imageUrl} for ${user.slug} (default)`);
  try {
    if (format === 'svg') {
      const response = await imageRequest(imageUrl);
      if (response.statusCode !== 200) {
        return res.status(response.statusCode).send(response.statusMessage);
      }
      const image = response.body;
      if (image.byteLength === 0) {
        return res.status(400).send('Invalid Image');
      }
      return sendSvg(res, imageAsSvg(image, { selector, maxHeight, imageFormat }));
    } else {
      return proxyImage(req, res, imageUrl, { imageFormat });
    }
  } catch (err) {
    logger.error(`avatar: unable to serve ${imageUrl} for ${user.slug}: ${err.message}`);
    return res.status(400).send('Unable to fetch image.');
  }
}
