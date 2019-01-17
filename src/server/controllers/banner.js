import sizeOf from 'image-size';
import request from 'request';
import cachedRequestLib from 'cached-request';

import cache from '../cache';
import { logger } from '../logger';
import { fetchMembers } from '../lib/graphql';
import { svg2png } from '../lib/image-generator';
import { queryString, getCloudinaryUrl } from '../lib/utils';

const cachedRequest = cachedRequestLib(request);
cachedRequest.setCacheDirectory('/tmp');

const requestPromise = Promise.promisify(cachedRequest, { multiArgs: true });

const websiteUrl = process.env.WEBSITE_URL || 'https://opencollective.com';
const imagesUrl = process.env.IMAGES_URL || 'https://images.opencollective.com';

export function generateSVGBannerForUsers(users, options) {
  logger.debug('>>> generateSVGBannerForUsers %d users, options: %j', users.length, options);

  const { style, limit, collectiveSlug } = options;

  const imageWidth = options.width;
  const imageHeight = options.height;
  const count = Math.min(limit, users.length);

  let defaultAvatarHeight = 64;
  let defaultMargin = 5;
  if (users.length > 50) {
    defaultAvatarHeight = 48;
    defaultMargin = 3;
  }
  if (users.length > 150) {
    defaultAvatarHeight = 24;
    defaultMargin = 2;
  }

  const avatarHeight = Number(options.avatarHeight) || defaultAvatarHeight;
  const margin = Number(options.margin) || defaultMargin;

  const params =
    style === 'rounded'
      ? {
          query: `/c_thumb,g_face,h_${avatarHeight * 2},r_max,w_${avatarHeight *
            2},bo_3px_solid_white/c_thumb,h_${avatarHeight * 2},r_max,w_${avatarHeight *
            2},bo_2px_solid_rgb:66C71A/e_trim/f_png/`,
        }
      : { width: avatarHeight * 2, height: avatarHeight * 2 };

  const promises = [];
  for (let i = 0; i < count; i++) {
    let image = users[i].image;
    if (image) {
      if (users[i].type === 'USER' || style === 'rounded') {
        image = getCloudinaryUrl(image, params);
      }
      const promiseOptions = {
        url: image,
        encoding: null,
        ttl: 24 * 60 * 60 * 1000, // 1 day caching
      };
      promises.push(
        requestPromise(promiseOptions).then((response, body) => {
          const contentType = response.headers['content-type'];
          return { type: 'rawImage', contentType, body };
        }),
      );
    } else {
      promises.push(Promise.resolve());
    }
  }

  if (options.buttonImage) {
    const btn = {
      url: options.buttonImage,
      encoding: null,
      ttl: 24 * 60 * 60 * 1000, // 1 day caching
    };

    users.push({
      slug: collectiveSlug,
      website: `${websiteUrl}/${collectiveSlug}#support`,
    });

    promises.push(requestPromise(btn));
  }

  let posX = margin;
  let posY = margin;

  return Promise.all(promises)
    .then(responses => {
      const images = [];
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i]) continue;

        const response = responses[i];
        const user = users[i];

        if (!user) continue;

        const website = options.linkToProfile || !user.website ? `${websiteUrl}/${user.slug}` : user.website;

        let image;
        let avatarWidth = avatarHeight;
        if (response.type == 'rawImage') {
          const base64data = Buffer.from(response.body).toString('base64');
          try {
            // We make sure the image loaded properly
            const dimensions = sizeOf(response.body);
            avatarWidth = Math.round((dimensions.width / dimensions.height) * avatarHeight);
          } catch (e) {
            // Otherwise, we skip it
            logger.warn('Cannot get the dimensions of the avatar of %s.', user.slug, { image: user.image });
            continue;
          }
          image = `<image x="${posX}" y="${posY}" width="${avatarWidth}" height="${avatarHeight}" xlink:href="data:${
            response.contentType
          };base64,${base64data}"/>`;
        }

        if (imageWidth > 0 && posX + avatarWidth + margin > imageWidth) {
          posY += avatarHeight + margin;
          posX = margin;
        }

        if (image) {
          const imageLink = `<a xlink:href="${website.replace(
            /&/g,
            '&amp;',
          )}" class="opencollective-svg" target="_blank" id="${user.slug}">${image}</a>`;
          images.push(imageLink);
          posX += avatarWidth + margin;
        }
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${imageWidth ||
        posX}" height="${imageHeight || posY + avatarHeight + margin}">
        <style>.opencollective-svg { cursor: pointer; }</style>
        ${images.join('\n')}
      </svg>`;
    })
    .catch(e => {
      logger.error('>>> Error in image-generator:generateSVGBannerForUsers', e);
    });
}

export default async function banner(req, res) {
  const { collectiveSlug, tierSlug, backerType } = req.params;
  const format = req.params.format || 'svg';
  const style = req.query.style || 'rounded';
  const limit = Number(req.query.limit) || Infinity;
  const width = Number(req.query.width) || 0;
  const height = Number(req.query.height) || 0;
  const { avatarHeight, margin } = req.query;
  const showBtn = req.query.button === 'false' ? false : true;

  let users = cache.get(queryString.stringify(req.params));
  if (!users) {
    try {
      users = await fetchMembers(req.params);
      cache.set(queryString.stringify(req.params), users);
    } catch (e) {
      logger.error('>>> collectives.banner: Error while fetching members', e);
      return res.status(404).send('Not found');
    }
  }

  const selector = tierSlug || backerType;
  const linkToProfile = selector === 'contributors' || selector == 'sponsors' ? false : true;
  const buttonImage =
    showBtn && `${imagesUrl}/static/images/become_${selector.match(/sponsor/) ? 'sponsor' : 'backer'}.svg`;
  return generateSVGBannerForUsers(users, {
    format,
    style,
    limit,
    buttonImage,
    width,
    height,
    avatarHeight,
    margin,
    linkToProfile,
    collectiveSlug,
  })
    .then(svg => {
      switch (format) {
        case 'svg':
          res.setHeader('content-type', 'image/svg+xml;charset=utf-8');
          return svg;

        case 'png':
          res.setHeader('content-type', 'image/png');
          return svg2png(svg);
      }
    })
    .then(content => {
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(content);
    })
    .catch(e => {
      logger.error('>>> collectives.banner error', e);
    });
}
