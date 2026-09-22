import fetch from 'node-fetch';

export const LIVE_SERVER_TIMEOUT = 30000;

export const describeLiveServer = process.env.E2E_TEST ? describe : describe.skip;

const cacheBurst = `cacheBurst=${Math.round(Math.random() * 100000)}`;

export const fetchFromImagesServer = (path) => {
  const imagesUrl = process.env.IMAGES_URL;
  const pathWithCacheBurst = [path, cacheBurst].join(path.indexOf('?') === -1 ? '?' : '&');
  return fetch(`${imagesUrl}${pathWithCacheBurst}`);
};

export const fetchTextFromImagesServer = (path) => fetchFromImagesServer(path).then((response) => response.text());
