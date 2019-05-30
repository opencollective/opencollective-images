import Promise from 'bluebird';
import debug from 'debug';
import sizeOf from 'image-size';
import { cloneDeep } from 'lodash';

import { asyncRequest } from './request';
import { getCloudinaryUrl } from './utils';
import { logger } from '../logger';

const debugBanner = debug('banner');

const WEBSITE_URL = process.env.WEBSITE_URL;

const getImageForUser = (user, height, options) => {
  if (!user.image && (!user.name || user.name === 'anonymous') && !options.includeAnonymous) {
    return null;
  }

  if (user.image && process.env.DISABLE_BANNER_INTERNAL_IMAGES) {
    return getCloudinaryUrl(user.image, { height, style: 'rounded' });
  }

  if (user.type === 'GITHUB_USER') {
    return `${process.env.IMAGES_URL}/github/${user.slug}/avatar/rounded/${height}.png`;
  }

  return `${process.env.IMAGES_URL}/${user.slug}/avatar/rounded/${height}.png`;
};

export function generateSvgBanner(usersList, options) {
  // usersList might come from LRU-cache and we don't want to modify it
  const users = cloneDeep(usersList);

  logger.debug('>>> generateSvgBanner %d users, options: %j', users.length, options);

  const { limit, collectiveSlug } = options;

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

  const promises = [];
  for (let i = 0; i < count; i++) {
    const user = users[i];

    // NOTE: we ask everywhere a double size quality for retina
    const image = getImageForUser(user, avatarHeight * 2, options);

    debugBanner(`Pushing ${image}`);

    if (image) {
      promises.push(asyncRequest({ url: image, encoding: null }));
    } else {
      promises.push(Promise.resolve());
    }
  }

  if (options.buttonImage) {
    users.push({
      slug: collectiveSlug,
      website: `${WEBSITE_URL}/${collectiveSlug}#support`,
    });

    promises.push(asyncRequest({ url: options.buttonImage, encoding: null }));
  }

  let posX = margin;
  let posY = margin;

  return Promise.all(promises)
    .then(responses => {
      const images = [];
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i]) continue;

        const { headers } = responses[i][0];
        const rawData = responses[i][1];
        const user = users[i];
        if (!user) continue;

        const contentType = headers['content-type'];
        const website = options.linkToProfile || !user.website ? `${WEBSITE_URL}/${user.slug}` : user.website;
        const base64data = Buffer.from(rawData).toString('base64');
        let avatarWidth = avatarHeight;
        try {
          // We make sure the image loaded properly
          const dimensions = sizeOf(rawData);
          avatarWidth = Math.round((dimensions.width / dimensions.height) * avatarHeight);
        } catch (e) {
          // Otherwise, we skip it
          logger.warn('Cannot get the dimensions of the avatar of %s.', user.slug, { image: user.image });
          continue;
        }

        if (imageWidth > 0 && posX + avatarWidth + margin > imageWidth) {
          posY += avatarHeight + margin;
          posX = margin;
        }
        const image = `<image x="${posX}" y="${posY}" width="${avatarWidth}" height="${avatarHeight}" xlink:href="data:${contentType};base64,${base64data}"/>`;
        const imageLink = `<a xlink:href="${website.replace(
          /&/g,
          '&amp;',
        )}" class="opencollective-svg" target="_blank" id="${user.slug}">${image}</a>`;
        images.push(imageLink);
        posX += avatarWidth + margin;
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${imageWidth ||
        posX}" height="${imageHeight || posY + avatarHeight + margin}">
        <style>.opencollective-svg { cursor: pointer; }</style>
        ${images.join('\n')}
      </svg>`;
    })
    .catch(e => {
      logger.error('>>> Error in image-generator:generateSvgBanner', e);
    });
}
