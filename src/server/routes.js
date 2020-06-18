import request from 'request';

import controllers from './controllers';
import { maxAge } from './middlewares';
import { logger } from './logger';
import { getCloudinaryUrl, isValidUrl } from './lib/utils';

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
  app.get('/proxy/images', maxAge(7200), (req, res) => {
    const { src, width, height, query } = req.query;

    if (!isValidUrl(src)) {
      return res.status(400).send('Invalid parameter: "src"');
    }

    const url = getCloudinaryUrl(src, { width, height, query });

    req
      .pipe(request(url, { followRedirect: false }))
      .on('error', (e) => {
        logger.error('>>> Error proxying %s', url, e);
        res.status(500).send(e);
      })
      .pipe(res);
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

  // Special route for GitHub avatars
  app.get(
    '/github/:githubUsername/:image(avatar)/:style(rounded|square)?/:height?.:format(png)',
    maxAgeOneDay,
    controllers.logo,
  );

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
