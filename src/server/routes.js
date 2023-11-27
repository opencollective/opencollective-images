import controllers from './controllers';
import { maxAge } from './middlewares';

const maxAgeOneDay = maxAge(24 * 60 * 60);
const maxAgeTwoHours = maxAge(2 * 60 * 60);

export const loadRoutes = (app) => {
  app.get('/', (req, res) => {
    res.send('This is the Open Collective images server.');
  });

  /**
   * Proxy images and resize them on the fly
   * Format: /proxy/images?src=:encoded_url&width=:width
   */
  app.get('/proxy/images', maxAgeOneDay, controllers.proxy);

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
