import Promise from 'bluebird';
import cachedRequestLib from 'cached-request';
import request from 'request';

import { assertSafeRemoteImageUrl } from './safe-remote-url';

const cachedRequest = cachedRequestLib(request);
cachedRequest.setCacheDirectory('/tmp');

const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

const defaultTtl = oneDayInMilliseconds;

const REMOTE_IMAGE_TIMEOUT_MS = 30000;

const cachedRequestPromise = Promise.promisify(cachedRequest, { multiArgs: true });

const requestPromise = async (options) => {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve([response, body]);
      }
    });
  });
};

const buildRemoteImageRequestOptions = (url) => ({
  url,
  encoding: null,
  followRedirect: true,
  maxRedirects: 5,
  timeout: REMOTE_IMAGE_TIMEOUT_MS,
  headers: {
    'user-agent': 'opencollective-images/1.0',
  },
});

const remoteImageRequest = (requestOptions) => {
  if (process.env.ENABLE_CACHED_REQUEST) {
    return cachedRequestPromise({ ttl: defaultTtl, ...requestOptions });
  }

  return requestPromise(requestOptions);
};

export const imageRequest = async (url) => {
  await assertSafeRemoteImageUrl(url);
  const [response] = await remoteImageRequest(buildRemoteImageRequestOptions(url));
  return response;
};

export const fetchRemoteImageBody = async (url) => {
  await assertSafeRemoteImageUrl(url);
  const [response, body] = await remoteImageRequest(buildRemoteImageRequestOptions(url));
  return { response, body };
};
