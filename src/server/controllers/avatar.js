import request from 'request';
import sizeOf from 'image-size';

import cache from '../cache';
import { logger } from '../logger';
import { fetchMembers } from '../lib/graphql';
import { queryString, getCloudinaryUrl } from '../lib/utils';

export default async function avatar(req, res) {
  req.params.isActive = req.query.isActive === 'false' ? false : true;
  const { collectiveSlug, tierSlug, backerType, isActive } = req.params;
  let users = cache.get(queryString.stringify({ collectiveSlug, tierSlug, backerType, isActive }));
  if (!users) {
    try {
      users = await fetchMembers(req.params);
      cache.set(
        queryString.stringify({
          collectiveSlug,
          tierSlug,
          backerType,
          isActive,
        }),
        users,
      );
    } catch (e) {
      return res.status(404).send('Not found');
    }
  }

  const position = parseInt(req.params.position, 10);
  const user = position < users.length ? users[position] : {};

  const format = req.params.format || 'svg';
  let maxHeight, maxWidth;
  const selector = tierSlug || backerType;
  if (req.query.avatarHeight) {
    maxHeight = Number(req.query.avatarHeight);
  } else {
    maxHeight = format === 'svg' ? 128 : 64;
    if (selector.match(/silver/)) maxHeight *= 1.25;
    if (selector.match(/gold/)) maxHeight *= 1.5;
    if (selector.match(/diamond/)) maxHeight *= 2;
    maxWidth = maxHeight * 3;
  }

  const collectiveType = user.type === 'USER' ? 'user' : 'organization';
  let imageUrl = `/static/images/${collectiveType}.svg`;
  if (user.image && user.image.substr(0, 1) !== '/') {
    if (user.type === 'USER') {
      imageUrl = getCloudinaryUrl(user.image, {
        query: `/c_thumb,g_face,h_${maxHeight},r_max,w_${maxHeight},bo_3px_solid_white/c_thumb,h_${maxHeight},r_max,w_${maxHeight},bo_2px_solid_rgb:66C71A/e_trim/f_auto/`,
      });
    } else {
      imageUrl = getCloudinaryUrl(user.image, {
        height: maxHeight,
        width: maxWidth,
      });
    }
  }

  if (position == users.length) {
    const btnImage = selector.match(/sponsor/) ? 'sponsor' : 'backer';
    imageUrl = `/static/images/become_${btnImage}.svg`;
  } else if (position > users.length) {
    imageUrl = '/static/images/1px.png';
  }

  if (imageUrl.substr(0, 1) === '/') {
    return res.redirect(imageUrl);
  }

  if (format === 'svg') {
    request({ url: imageUrl, encoding: null }, (err, r, data) => {
      if (err) {
        return res.status(500).send(`Unable to fetch ${imageUrl}`);
      }
      const contentType = r.headers['content-type'];

      const imageHeight = Math.round(maxHeight / 2);
      let imageWidth = 64;
      if (selector.match(/sponsor/)) {
        try {
          const dimensions = sizeOf(data);
          imageWidth = Math.round((dimensions.width / dimensions.height) * imageHeight);
        } catch (e) {
          logger.error('>>> collectives.avatar: Unable to get image dimensions for %s', imageUrl, e);
          return res.status(500).send(`Unable to fetch ${imageUrl}`);
        }
      }

      const base64data = Buffer.from(data).toString('base64');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${imageWidth}" height="${imageHeight}">
        <image width="${imageWidth}" height="${imageHeight}" xlink:href="data:${contentType};base64,${base64data}"/>
      </svg>`;
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('content-type', 'image/svg+xml;charset=utf-8');
      return res.send(svg);
    });
  } else {
    req
      .pipe(request(imageUrl))
      .on('error', e => {
        logger.error('>>> collectives.avatar: Error proxying %s', imageUrl, e);
        res.status(500).send(e);
      })
      .on('response', res => {
        res.headers['Cache-Control'] = 'public, max-age=300';
      })
      .pipe(res);
  }
}
