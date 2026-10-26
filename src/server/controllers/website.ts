import { URL } from 'url';

import type { Request, Response } from 'express';

import { fetchMembersWithCache } from '../lib/graphql';
import { getWebsite, parseToBooleanDefaultFalse, parseToBooleanDefaultTrue } from '../lib/utils';

type WebsiteParams = Record<string, string> & {
  collectiveSlug: string;
  backerType?: string;
  tierSlug?: string;
  position?: string;
  isActive?: boolean;
};

type WebsiteQuery = {
  isActive?: string;
};

type WebsiteRequest = Request<WebsiteParams, unknown, unknown, WebsiteQuery>;

export default async function website(req: WebsiteRequest, res: Response): Promise<Response> {
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
    redirectUrl = `${process.env.WEBSITE_URL}/${collectiveSlug}#support`;
  } else {
    redirectUrl = getWebsite(user);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(redirectUrl);
  } catch (e) {
    return res.sendStatus(404);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.sendStatus(404);
  }

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
