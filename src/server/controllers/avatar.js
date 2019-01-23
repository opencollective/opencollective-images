import fs from 'fs';
import path from 'path';
import request from 'request';
import sizeOf from 'image-size';

import cache from '../cache';
import { logger } from '../logger';
import { fetchMembers } from '../lib/graphql';
import { queryString, getCloudinaryUrl, getUiAvatarUrl, md5 } from '../lib/utils';

const getSvg = svgPath => fs.readFileSync(path.join(__dirname, svgPath), { encoding: 'utf8' });

const initialsSvg = getSvg('../../static/images/initials.svg');
const organizationSvg = getSvg('../../static/images/organization.svg');
const anonymousSvg = getSvg('../../static/images/default-anonymous-logo.svg');

const getInitials = name => name.split(' ').reduce((result, value) => (result += value.slice(0, 1).toUpperCase()), '');

const getImageData = imageUrl =>
  new Promise((resolve, reject) => {
    request({ url: imageUrl, encoding: null }, (err, res, data) => {
      // console.log(err, data);
      if (err) {
        reject(`Unable to fetch ${imageUrl}`);
      } else {
        const contentType = res.headers['content-type'];
        resolve({ contentType, data });
      }
    });
  });

const sendSvg = (res, svg) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('Content-Type', 'image/svg+xml;charset=utf-8');
  return res.send(svg);
};

const imageAsSvg = ({ data, contentType }, { maxHeight, selector }) => {
  const imageHeight = Math.round(maxHeight / 2);

  let imageWidth = 64;

  if (selector.match(/sponsor/)) {
    try {
      const dimensions = sizeOf(data);
      imageWidth = Math.round((dimensions.width / dimensions.height) * imageHeight);
    } catch (err) {
      // console.log(err);
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
      res.headers['Cache-Control'] = 'public, max-age=300';
    })
    .pipe(res);
};

export default async function avatar(req, res) {
  req.params.isActive = req.query.isActive === 'false' ? false : true;
  const { collectiveSlug, tierSlug, backerType, isActive } = req.params;
  const cacheKey = `users_${md5(queryString.stringify(req.params))}`;
  let users = cache.get(cacheKey);
  if (!users) {
    try {
      users = await fetchMembers(req.params);
      cache.set(cacheKey, users);
    } catch (e) {
      return res.status(404).send('Not found');
    }
  }

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
    if (user.image) {
      const imageUrl = getCloudinaryUrl(user.image, {
        query: `/c_thumb,g_face,h_${maxHeight},r_max,w_${maxHeight}/c_thumb,h_${maxHeight},r_max,w_${maxHeight},bo_2px_solid_rgb:c4c7cc/e_trim/f_auto/`,
      });
      try {
        if (format === 'svg') {
          const imageData = await getImageData(imageUrl);
          return sendSvg(res, imageAsSvg(imageData, { selector, maxHeight }));
        } else {
          return proxyImage(req, res, imageUrl);
        }
      } catch (err) {
        // Ignore error, will default to initials
        logger.error('>>> collectives.avatar: Error while fetching image %s', imageUrl, err);
      }
    }

    // Default

    // Initials with SVG
    if (req.query.svgInitials && format === 'svg') {
      return sendSvg(res, initialsSvg.replace('{INITIALS}', getInitials(user.name)));
    }

    // Initials with UI-Avatars
    const imageHeight = Math.round(maxHeight / 2);
    const imageUrl = getUiAvatarUrl(user.name, imageHeight);
    return proxyImage(req, res, imageUrl);
  }

  // Default case (likely Organizations)
  if (user.image) {
    const imageUrl = getCloudinaryUrl(user.image, { height: maxHeight, width: maxWidth });
    try {
      if (format === 'svg') {
        const imageData = await getImageData(imageUrl);
        return sendSvg(res, imageAsSvg(imageData, { selector, maxHeight }));
      } else {
        return proxyImage(req, res, imageUrl);
      }
    } catch (err) {
      // Ignore error, will default to organization SVG
      logger.error('>>> collectives.avatar: Error while fetching image %s', imageUrl, err);
    }
  }

  // Default
  if (format == 'svg') {
    return sendSvg(res, organizationSvg);
  } else {
    return res.redirect('/static/images/organization.svg');
  }
}
