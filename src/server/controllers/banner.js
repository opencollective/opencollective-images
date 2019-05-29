import debug from 'debug';

import { logger } from '../logger';
import { parseToBoolean } from '../lib/utils';
import { fetchMembersWithCache } from '../lib/graphql';
import { generateSVGBannerForUsers } from '../lib/image-generator';

const imagesUrl = process.env.IMAGES_URL;

const debugBanner = debug('banner');

export default async function banner(req, res) {
  const { collectiveSlug, tierSlug, backerType } = req.params;
  const style = req.query.style || 'rounded';
  const limit = Number(req.query.limit) || Infinity;
  const width = Number(req.query.width) || 0;
  const height = Number(req.query.height) || 0;
  const { avatarHeight, margin } = req.query;
  const showBtn = req.query.button === 'false' ? false : true;

  // handle includeAnonymous, default to true for tiers
  let includeAnonymous;
  if (req.query.includeAnonymous !== undefined) {
    includeAnonymous = parseToBoolean(req.query.includeAnonymous);
  } else {
    includeAnonymous = tierSlug ? true : false;
  }

  // handle isActive default to true for tiers
  if (req.query.isActive !== undefined) {
    req.params.isActive = parseToBoolean(req.query.isActive);
  } else {
    req.params.isActive = tierSlug ? true : false;
  }

  let users;
  try {
    users = await fetchMembersWithCache(req.params);
  } catch (e) {
    return res.status(404).send('Not found');
  }

  const selector = tierSlug || backerType;
  const linkToProfile = selector === 'contributors' || selector == 'sponsors' ? false : true;
  const buttonImage =
    showBtn && `${imagesUrl}/static/images/become_${selector.match(/sponsor/) ? 'sponsor' : 'backer'}.svg`;

  if (backerType) {
    debugBanner(`generating for ${collectiveSlug} (backerType=${backerType})`);
  } else if (tierSlug) {
    debugBanner(`generating for ${collectiveSlug} (tierSlug=${tierSlug})`);
  }

  return generateSVGBannerForUsers(users, {
    style,
    limit,
    buttonImage,
    width,
    height,
    avatarHeight,
    margin,
    linkToProfile,
    collectiveSlug,
    includeAnonymous,
  })
    .then(content => {
      res.setHeader('Content-Type', 'image/svg+xml;charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(content);
    })
    .catch(e => {
      logger.error('>>> collectives.banner error', e);
    });
}
