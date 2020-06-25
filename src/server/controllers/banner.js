import debug from 'debug';

import { logger } from '../logger';
import { parseToBooleanDefaultFalse, parseToBooleanDefaultTrue, randomInteger } from '../lib/utils';
import { fetchMembersWithCache } from '../lib/graphql';
import { generateSvgBanner } from '../lib/svg-banner';

const imagesUrl = process.env.IMAGES_URL;

const debugBanner = debug('banner');

const oneDayInSeconds = 60 * 60 * 24;

export default async function banner(req, res) {
  const { collectiveSlug, tierSlug, backerType } = req.params;
  const limit = Number(req.query.limit) || Infinity;
  const width = Number(req.query.width) || 0;
  const height = Number(req.query.height) || 0;
  const { avatarHeight, margin } = req.query;
  const showBtn = parseToBooleanDefaultTrue(req.query.button);

  // handle includeAnonymous, default to true for tiers
  let includeAnonymous;
  if (req.query.includeAnonymous !== undefined) {
    includeAnonymous = parseToBooleanDefaultFalse(req.query.includeAnonymous);
  } else {
    includeAnonymous = tierSlug ? true : false;
  }

  // handle isActive default to true for tiers
  if (req.query.isActive !== undefined) {
    req.params.isActive = parseToBooleanDefaultFalse(req.query.isActive);
  } else {
    req.params.isActive = tierSlug ? true : false;
  }

  let users;
  try {
    users = await fetchMembersWithCache(req.params);
  } catch (e) {
    return res.status(404).send('Not found');
  }

  let buttonImage;
  if (showBtn) {
    const selector = tierSlug || backerType;
    if (selector.match(/sponsor/)) {
      buttonImage = `${imagesUrl}/static/images/become_sponsor.svg`;
    } else if (selector.match(/backer/)) {
      buttonImage = `${imagesUrl}/static/images/become_backer.svg`;
    } else {
      buttonImage = `${imagesUrl}/static/images/contribute.svg`;
    }
  }

  if (backerType) {
    debugBanner(`generating for ${collectiveSlug} (backerType=${backerType})`);
  } else if (tierSlug) {
    debugBanner(`generating for ${collectiveSlug} (tierSlug=${tierSlug})`);
  }

  const maxAge = oneDayInSeconds + randomInteger(3600);

  return generateSvgBanner(users, {
    limit,
    buttonImage,
    width,
    height,
    avatarHeight,
    margin,
    collectiveSlug,
    includeAnonymous,
  })
    .then((content) => {
      res.setHeader('Content-Type', 'image/svg+xml;charset=utf-8');
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.send(content);
    })
    .catch((e) => {
      logger.error('>>> collectives.banner error', e);
    });
}
