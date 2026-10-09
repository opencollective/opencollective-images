import { isValidDebugSentryKey } from './lib/sentry';
import controllers from './controllers';
import { asyncHandler, maxAge } from './middlewares';

const maxAgeOneDay = maxAge(24 * 60 * 60);
const maxAgeTwoHours = maxAge(2 * 60 * 60);

export const loadRoutes = (app) => {
  app.get('/', (req, res) => {
    res.send('This is the Open Collective images server.');
  });

  // Debug endpoint to verify Sentry reporting end-to-end. It behaves like an unknown route unless
  // the configured shared secret is provided.
  app.get('/debug-sentry', (req, res, next) => {
    if (!isValidDebugSentryKey(req.query.key)) {
      next();
      return;
    }
    throw new Error('Sentry debug error triggered via /debug-sentry');
  });

  /**
   * Proxy images and resize them on the fly
   * Format: /proxy/images?src=:encoded_url&width=:width
   */
  app.get('/proxy/images', maxAgeOneDay, asyncHandler(controllers.proxy));

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
    /^\/(?<collectiveSlug>[^/]+?)(?:\/(?<hash>[^/]+?))?\/(?<image>avatar|logo)(?:\/(?<style>rounded|square))?(?:\/(?<height>[^/]+?))?(?:\/(?<width>[^/]+?))?\.(?<format>png|jpg|svg)\/?$/i,
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
