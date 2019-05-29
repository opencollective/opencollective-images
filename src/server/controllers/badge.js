import fetch from 'node-fetch';

import { logger } from '../logger';
import { fetchMembersStatsWithCache } from '../lib/graphql';

const fetchText = path => fetch(path).then(response => response.text());

/**
 * Generates a github badge for a backerType (backers|sponsors) or for a tierSlug
 */
export default async function badge(req, res) {
  try {
    const color = req.query.color || 'brightgreen';
    const style = req.query.style || 'flat';

    let imageUrl;

    // Starting to move to shields.io matching URLs
    if (process.env.SHIELDS_IO && req.params.backerType && !req.query.label) {
      imageUrl = `https://img.shields.io/opencollective/${req.params.backerType}/${
        req.params.collectiveSlug
      }.svg?color=${color}&style=${style}`;
    }

    if (!imageUrl) {
      try {
        const stats = await fetchMembersStatsWithCache(req.params);
        const filename = `${req.query.label || stats.name}-${stats.count ? stats.count : 0}-${color}.svg`;
        imageUrl = `https://img.shields.io/badge/${filename}?style=${style}`;
      } catch (e) {
        return res.status(404).send('Not found');
      }
    }

    try {
      const imageRequest = await fetchText(imageUrl);
      res.setHeader('content-type', 'image/svg+xml;charset=utf-8');
      res.setHeader('cache-control', 'max-age=600');
      return res.send(imageRequest);
    } catch (e) {
      logger.error('>>> collectives.badge: Error while fetching %s', imageUrl, e);
      res.setHeader('cache-control', 'max-age=30');
      return res.status(500).send(`Unable to fetch ${imageUrl}`);
    }
  } catch (e) {
    logger.debug('>>> collectives.badge error', e);
    return res.status(500).send(`Unable to generate badge for ${req.params.collectiveSlug}/${req.params.backerType}`);
  }
}
