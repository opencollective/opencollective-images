import Promise from 'bluebird';
import sizeOf from 'image-size';
import pLimit from 'p-limit';
import { cloneDeep } from 'lodash';

import { imageRequest } from './request';
import { getCloudinaryUrl, getWebsite } from './utils';
import { logger } from '../logger';

const WEBSITE_URL = process.env.WEBSITE_URL;

const svgBannerRequestLimit = pLimit(process.env.SVG_BANNER_REQUEST_CONCURRENCY || 20);

const getImageUrlForUser = (user, height, options) => {
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

    // NOTE: we ask everywhere a double size quality for high resolution devices
    user.requestImageUrl = getImageUrlForUser(user, avatarHeight * 2, options);
    if (user.requestImageUrl) {
      promises.push(svgBannerRequestLimit(imageRequest, user.requestImageUrl));
    } else {
      promises.push(Promise.resolve());
    }
  }

  if (options.buttonImage) {
    users.push({
      slug: collectiveSlug,
      website: `${WEBSITE_URL}/${collectiveSlug}#support`,
    });

    promises.push(imageRequest(options.buttonImage));
  }

  let posX = margin;
  let posY = margin;

  return Promise.all(promises)
    .then((responses) => {
      const images = [];
      for (let i = 0; i < responses.length; i++) {
        const user = users[i];
        const response = responses[i];
        if (!user || !response) {
          continue;
        }

        if (response.statusCode !== 200) {
          logger.warn(
            `svgBanner: statusCode=${response.statusCode} for ${user.requestImageUrl} (${user.slug} - ${user.type})`,
          );
          continue;
        }
        const rawImage = response.body;
        if (rawImage.byteLength === 0) {
          logger.warn(`svgBanner: length=0 for ${user.requestImageUrl} (${user.slug} - ${user.type})`);
          continue;
        }

        let avatarWidth = avatarHeight;
        try {
          // We make sure the image loaded properly
          const dimensions = sizeOf(rawImage);
          avatarWidth = Math.round((dimensions.width / dimensions.height) * avatarHeight);
        } catch (err) {
          // Otherwise, we skip it
          logger.warn(`svgBanner: invalid image for ${user.requestImageUrl} (${user.slug} - ${user.type})`);
          logger.debug(err);
          continue;
        }

        const contentType = response.headers['content-type'];

        const website = getWebsite(user);
        const base64data = Buffer.from(rawImage).toString('base64');

        if (imageWidth > 0 && posX + avatarWidth + margin > imageWidth) {
          posY += avatarHeight + margin;
          posX = margin;
        }
        const image = `<image x="${posX}" y="${posY}" width="${avatarWidth}" height="${avatarHeight}" xlink:href="data:${contentType};base64,${base64data}"/>`;
        const imageLink = `<a xlink:href="${website.replace(
          /&/g,
          '&amp;',
        )}" class="opencollective-svg" target="_blank" rel="nofollow sponsored" id="${user.slug}">${image}</a>`;
        images.push(imageLink);
        posX += avatarWidth + margin;
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${
        imageWidth || posX
      }" height="${imageHeight || posY + avatarHeight + margin}">
        <style>.opencollective-svg { cursor: pointer; }</style>
        ${images.join('\n')}
      </svg>`;
    })
    .catch((err) => {
      logger.error(`svgBanner: ${err.message}`);
      logger.debug(err);
    });
}
