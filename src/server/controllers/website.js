import { URL } from 'url';

import cache from '../cache';
import { fetchMembers } from '../lib/graphql';
import { queryString, md5 } from '../lib/utils';

const websiteUrl = process.env.WEBSITE_URL || 'https://opencollective.com';

export default async function website(req, res) {
  req.params.isActive = req.query.isActive === 'false' ? false : true;

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

  const { collectiveSlug, tierSlug, backerType } = req.params;

  const position = parseInt(req.params.position, 10);

  if (position > users.length) {
    return res.sendStatus(404);
  }

  const user = users[position] || {};
  const selector = tierSlug || backerType;
  let redirectUrl = `${websiteUrl}/${user.slug}`;
  if (selector.match(/sponsor/)) {
    user.twitter = user.twitterHandle ? `https://twitter.com/${user.twitterHandle}` : null;
    redirectUrl = user.website || user.twitter || `${websiteUrl}/${user.slug}`;
  }

  if (position === users.length) {
    redirectUrl = `${websiteUrl}/${collectiveSlug}#support`;
  }

  const parsedUrl = new URL(redirectUrl);
  if (!parsedUrl.searchParams.has('utm_source')) {
    parsedUrl.searchParams.set('utm_source', 'opencollective');
  }
  if (!parsedUrl.searchParams.has('utm_medium')) {
    parsedUrl.searchParams.set('utm_medium', 'github');
  }
  if (!parsedUrl.searchParams.has('utm_campaign')) {
    parsedUrl.searchParams.set('utm_campaign', collectiveSlug);
  }
  redirectUrl = parsedUrl.toString();

  res.redirect(301, redirectUrl);
}
