import fetch from './lib/fetch';
import { getCloudinaryUrl, isValidUrl } from './lib/utils';
import controllers from './controllers';
import { logger } from './logger';
import { maxAge } from './middlewares';

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

    const url = getCloudinaryUrl(src, { width, height, query });

    try {
      const response = await fetch(url, { redirect: 'manual' });
      // Forward status and content-type headers
      res.status(response.status);
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      // Forward redirect location if present
      const location = response.headers.get('location');
      if (location) {
        res.setHeader('Location', location);
      }
      response.body.pipe(res);
    } catch (e) {
      logger.error('>>> Error proxying %s', url, e);
      res.status(500).send(e.message);
    }
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

  // Route for user avatars or organization logos
  app.get(
    '/:collectiveSlug/:hash?/:image(avatar|logo)/:style(rounded|square)?/:height?/:width?.:format(txt|png|jpg|svg)',
    maxAgeOneDay,
    controllers.logo,
  );

  app.get(
    '/:collectiveSlug/:hash?/background/:height?/:width?.:format(png|jpg)',
    maxAgeTwoHours,
    controllers.background,
  );

  app.get('/:collectiveSlug/:backerType.svg', controllers.banner);

  app.get('/:collectiveSlug/:backerType/badge.svg', controllers.badge);

  app.get('/:collectiveSlug/:backerType/:position/website', controllers.website);

  app.get('/:collectiveSlug/:backerType/:position/avatar(.:format(png|jpg|svg))?', maxAgeTwoHours, controllers.avatar);

  app.get('/:collectiveSlug/tiers/:tierSlug.svg', controllers.banner);

  app.get('/:collectiveSlug/tiers/:tierSlug/badge.svg', controllers.badge);

  app.get('/:collectiveSlug/tiers/:tierSlug/:position/website', controllers.website);

  app.get(
    '/:collectiveSlug/tiers/:tierSlug/:position/avatar(.:format(png|jpg|svg))?',
    maxAgeTwoHours,
    controllers.avatar,
  );
};
