import { pipeline } from 'stream';

import { fetchExternal } from './lib/fetch';
import { reportErrorToSentry } from './lib/sentry';
import { getCloudinaryUrl, getProxyFetchUrl, isValidUrl } from './lib/utils';
import controllers from './controllers';
import { logger } from './logger';
import { asyncHandler, maxAge } from './middlewares';

const maxAgeOneDay = maxAge(24 * 60 * 60);
const maxAgeTwoHours = maxAge(2 * 60 * 60);

export const loadRoutes = (app) => {
  app.get('/', (req, res) => {
    res.send('This is the Open Collective images server.');
  });

  /**
   * Proxy all images so that we can serve them from the opencollective.com domain
   * and we can cache them at cloudflare level (to reduce bandwidth at cloudinary level)
   * Format: /proxy/images?src=:encoded_url&width=:width
   */
  app.get('/proxy/images', maxAge(7200), async (req, res) => {
    const { src, width, height, query } = req.query;

    if (!isValidUrl(src)) {
      return res.status(400).send('Invalid parameter: "src"');
    }

    const url = getProxyFetchUrl(getCloudinaryUrl(src, { width, height, query }));
    if (!url) {
      return res.status(400).send('Invalid parameter: "src"');
    }

    let response;
    try {
      // User-controlled URL: no internal service headers, redirects are forwarded rather than followed
      response = await fetchExternal(url, { redirect: 'manual' });
    } catch (e) {
      logger.error('>>> Error proxying %s', url, e);
      reportErrorToSentry(e, { tags: { handler: 'proxy' }, extra: { url }, req });
      return res.status(500).send('Error proxying image');
    }

    res.status(response.status);
    for (const header of ['content-type', 'location']) {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    }
    pipeline(response.body, res, (e) => {
      if (e) {
        // Headers may already be sent: drop the connection instead of leaving it hanging
        logger.error('>>> Error streaming proxied %s', url, e);
        reportErrorToSentry(e, { tags: { handler: 'proxy' }, extra: { url }, req });
        res.destroy();
      }
    });
  });

  /**
   * Prevent indexation from search engines
   * (out of 'production' environment)
   */
  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    if (process.env.NODE_ENV !== 'production' || process.env.ROBOTS_DISALLOW) {
      res.send('User-agent: *\nDisallow: /');
    } else {
      res.send('User-agent: *\nAllow: /');
    }
  });

  // Express 5 (path-to-regexp v8) dropped optional and regex-constrained params from string patterns.
  // These routes keep the exact Express 4 matching (optional hash, style, height and width; format
  // whitelist) with regular expressions; named groups populate req.params like before. The `i` flag
  // and the optional trailing slash mirror Express's default case-insensitive, non-strict routing.

  // Route for user avatars or organization logos
  app.get(
    /^\/(?<collectiveSlug>[^/]+?)(?:\/(?<hash>[^/]+?))?\/(?<image>avatar|logo)(?:\/(?<style>rounded|square))?(?:\/(?<height>[^/]+?))?(?:\/(?<width>[^/]+?))?\.(?<format>txt|png|jpg|svg)\/?$/i,
    maxAgeOneDay,
    asyncHandler(controllers.logo),
  );

  app.get(
    /^\/(?<collectiveSlug>[^/]+?)(?:\/(?<hash>[^/]+?))?\/background(?:\/(?<height>[^/]+?))?(?:\/(?<width>[^/]+?))?\.(?<format>png|jpg)\/?$/i,
    maxAgeTwoHours,
    asyncHandler(controllers.background),
  );

  app.get('/:collectiveSlug/:backerType.svg', asyncHandler(controllers.banner));

  app.get('/:collectiveSlug/:backerType/badge.svg', asyncHandler(controllers.badge));

  app.get('/:collectiveSlug/:backerType/:position/website', asyncHandler(controllers.website));

  app.get(
    /^\/(?<collectiveSlug>[^/]+?)\/(?<backerType>[^/]+?)\/(?<position>[^/]+?)\/avatar(?:\.(?<format>png|jpg|svg))?\/?$/i,
    maxAgeTwoHours,
    asyncHandler(controllers.avatar),
  );

  app.get('/:collectiveSlug/tiers/:tierSlug.svg', asyncHandler(controllers.banner));

  app.get('/:collectiveSlug/tiers/:tierSlug/badge.svg', asyncHandler(controllers.badge));

  app.get('/:collectiveSlug/tiers/:tierSlug/:position/website', asyncHandler(controllers.website));

  app.get(
    /^\/(?<collectiveSlug>[^/]+?)\/tiers\/(?<tierSlug>[^/]+?)\/(?<position>[^/]+?)\/avatar(?:\.(?<format>png|jpg|svg))?\/?$/i,
    maxAgeTwoHours,
    asyncHandler(controllers.avatar),
  );
};
