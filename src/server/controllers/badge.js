import fetch from 'node-fetch';

import { logger } from '../logger';
import { fetchMembersStatsWithCache } from '../lib/graphql';

const fetchText = (path) => fetch(path).then((response) => response.text());

/**
 * Generates a github badge for a backerType (backers|sponsors) or for a tierSlug
 */
export default async function badge(req, res) {
  try {
    const color = req.query.color || 'brightgreen';
    const style = req.query.style || 'flat';

    let imageUrl;

    // Starting to move to shields.io matching URLs
    if (process.env.SHIELDS_IO && req.params.backerType) {
      let backerType, label;
      if (req.params.backerType.match(/sponsor/i) || req.params.backerType.match(/organization/i)) {
        backerType = 'sponsors';
        label = req.query.label || req.params.backerType;
      } else if (req.params.backerType.match(/backer/i) || req.params.backerType.match(/individual/i)) {
        backerType = 'backers';
        label = req.query.label || req.params.backerType;
      } else {
        backerType = 'all';
        label = req.query.label || 'financial contributors';
      }

      imageUrl = `https://img.shields.io/opencollective/${backerType}/${req.params.collectiveSlug}.svg?color=${color}&style=${style}&label=${label}`;
    }

    if (!imageUrl) {
      try {
        const stats = await fetchMembersStatsWithCache(req.params);
        const filename = `${req.query.label || stats.name}-${stats.count ? stats.count : 0}-${color}.svg`;
        imageUrl = `https://img.shields.io/badge/${filename}?style=${style}`;
      } catch (err) {
        // Invalid collectiveSlug (not found) or No collective found with slug
        if (err.message.match(/not found/) || err.message.match(/No collective found/)) {
          return res.status(404).send('Not found');
        }
        logger.error(`badge: error while fetching members stats (${err.message})`);
        return res.status(400).send('Unable to fetch badge');
      }
    }

    try {
      const imageRequest = await fetchText(imageUrl);
      res.setHeader('content-type', 'image/svg+xml;charset=utf-8');
      res.setHeader('cache-control', 'max-age=600');
      return res.send(imageRequest);
    } catch (err) {
      logger.error(`badge: error while fetching ${imageUrl} (${err.message})`);
      res.setHeader('cache-control', 'max-age=30');
      return res.status(400).send('Unable to fetch badge');
    }
  } catch (err) {
    let errorParams = '';
    if (req.params.backerType) {
      errorParams = `backerType=${req.params.backerType}`;
    } else if (req.params.tierSlug) {
      errorParams = `tierSlug=${req.params.tierSlug}`;
    }
    logger.error(`badge: error while processing ${req.params.collectiveSlug} ${errorParams} (${err.message})`);
    return res.status(400).send('Unable to generate badge');
  }
}
