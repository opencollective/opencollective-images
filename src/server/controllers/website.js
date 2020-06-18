import { URL } from 'url';

import { fetchMembersWithCache } from '../lib/graphql';
import { getWebsite, parseToBooleanDefaultFalse, parseToBooleanDefaultTrue } from '../lib/utils';

const websiteUrl = process.env.WEBSITE_URL;

export default async function website(req, res) {
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
  } catch (e) {
    return res.status(404).send('Not found');
  }

  const { collectiveSlug } = req.params;

  const position = parseInt(req.params.position, 10);

  if (position > users.length) {
    return res.sendStatus(404);
  }

  const user = users[position] || {};

  let redirectUrl;
  if (position === users.length) {
    redirectUrl = `${websiteUrl}/${collectiveSlug}#support`;
  } else {
    redirectUrl = getWebsite(user);
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
