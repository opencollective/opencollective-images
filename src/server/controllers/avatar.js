import fs from 'fs';
import path from 'path';
import request from 'request';
import sizeOf from 'image-size';
import debug from 'debug';
import mime from 'mime-types';

import { logger } from '../logger';
import { fetchMembersWithCache } from '../lib/graphql';
import { getCloudinaryUrl } from '../lib/utils';
import { asyncRequest } from '../lib/request';

const debugAvatar = debug('avatar');

const getSvg = svgPath => fs.readFileSync(path.join(__dirname, svgPath), { encoding: 'utf8' });

const anonymousSvg = getSvg('../../static/images/default-anonymous-logo.svg');

const getImageData = url => asyncRequest({ url, encoding: null }).then(result => result[1]);

const sendSvg = (res, svg) => {
  res.setHeader('Cache-Control', 'public, max-age=7200');
  res.setHeader('Content-Type', 'image/svg+xml;charset=utf-8');
  return res.send(svg);
};

const imageAsSvg = (data, { maxHeight, selector, imageformat }) => {
  const imageHeight = Math.round(maxHeight / 2);
  const contentType = mime.lookup(imageformat);

  let imageWidth = 64;

  if (selector.match(/sponsor/)) {
    try {
      const dimensions = sizeOf(data);
      imageWidth = Math.round((dimensions.width / dimensions.height) * imageHeight);
    } catch (err) {
      throw new Error('Unable to get image size.');
    }
  }

  const base64data = Buffer.from(data).toString('base64');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${imageWidth}" height="${imageHeight}">
        <image width="${imageWidth}" height="${imageHeight}" xlink:href="data:${contentType};base64,${base64data}"/>
      </svg>`;
};

const proxyImage = (req, res, imageUrl) => {
  return req
    .pipe(request(imageUrl))
    .on('error', e => {
      logger.error('>>> collectives.avatar: Error proxying %s', imageUrl, e);
      res.status(500).send(e);
    })
    .on('response', res => {
      res.headers['Cache-Control'] = 'public, max-age=7200';
    })
    .pipe(res);
};

export default async function avatar(req, res) {
  req.params.isActive = req.query.isActive === 'false' ? false : true;

  let users;
  try {
    users = await fetchMembersWithCache(req.params);
  } catch (e) {
    return res.status(404).send('Not found');
  }

  const { tierSlug, backerType } = req.params;

  const format = req.params.format || 'svg';
  const selector = tierSlug || backerType;
  const position = parseInt(req.params.position, 10);
  const user = position < users.length ? users[position] : {};

  // Unexisting position or button
  if (position == users.length) {
    const btnImage = selector.match(/sponsor/) ? 'sponsor' : 'backer';
    return res.redirect(`/static/images/become_${btnImage}.svg`);
  } else if (position > users.length) {
    return res.redirect('/static/images/1px.png');
  }

  let maxHeight, maxWidth;

  if (req.query.avatarHeight) {
    maxHeight = Number(req.query.avatarHeight);
  } else {
    maxHeight = format === 'svg' ? 128 : 64;
    if (selector.match(/silver/)) maxHeight *= 1.25;
    if (selector.match(/gold/)) maxHeight *= 1.5;
    if (selector.match(/diamond/)) maxHeight *= 2;
    maxWidth = maxHeight * 3;
  }

  const imageformat = format === 'jpg' ? format : 'png';

  // Special cases for USER
  if (user.type === 'USER') {
    // Anonymous
    if (!user.name || user.name === 'anonymous') {
      const imageHeight = Math.round(maxHeight / 2);
      return sendSvg(
        res,
        anonymousSvg.replace('width="88"', `width="${imageHeight}"`).replace('height="88"', `height="${imageHeight}"`),
      );
    }

    // Normal image
    let imageUrl = `${process.env.IMAGES_URL}/${user.slug}/avatar/rounded/${maxHeight}.${imageformat}`;
    // Use Cloudinary directly if internal images disabled
    if (process.env.DISABLE_BANNER_INTERNAL_IMAGES) {
      imageUrl = getCloudinaryUrl(user.image, { height: maxHeight, style: 'rounded', format: imageformat });
    }
    debugAvatar(`Serving ${imageUrl} for ${user.slug} (type=USER)`);
    try {
      if (format === 'svg') {
        const data = await getImageData(imageUrl);
        return sendSvg(res, imageAsSvg(data, { selector, maxHeight, imageformat }));
      } else {
        return proxyImage(req, res, imageUrl);
      }
    } catch (err) {
      logger.error(`avatar: unable to serve ${imageUrl} for ${user.slug}: ${err.message}`);
      return res.status(400).send(`Unable to fetch image.`);
    }
  }

  // Default case (likely Organizations)
  let imageUrl = `${process.env.IMAGES_URL}/${user.slug}/logo/square/${maxHeight}/${maxWidth}.${imageformat}`;
  // Use Cloudinary directly if internal images disabled
  if (process.env.DISABLE_BANNER_INTERNAL_IMAGES) {
    imageUrl = getCloudinaryUrl(user.image, { height: maxHeight, width: maxWidth, format: imageformat });
  }
  debugAvatar(`Serving ${imageUrl} for ${user.slug} (default)`);
  try {
    if (format === 'svg') {
      const data = await getImageData(imageUrl);
      return sendSvg(res, imageAsSvg(data, { selector, maxHeight, imageformat }));
    } else {
      return proxyImage(req, res, imageUrl);
    }
  } catch (err) {
    logger.error(`avatar: unable to serve ${imageUrl} for ${user.slug}: ${err.message}`);
    return res.status(400).send(`Unable to fetch image.`);
  }
}
