import net from 'net';
import { URL } from 'url';

import Promise from 'bluebird';
import cachedRequestLib from 'cached-request';
import request from 'request';

import { assertSafeRemoteImageUrl } from './safe-remote-url';

const cachedRequest = cachedRequestLib(request);
cachedRequest.setCacheDirectory('/tmp');

const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

const defaultTtl = oneDayInMilliseconds;

const REMOTE_IMAGE_TIMEOUT_MS = 30000;
const MAX_REMOTE_IMAGE_REDIRECTS = 10;

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
  followRedirect: false,
  // Connect directly instead of inheriting HTTP(S)_PROXY.
  proxy: null,
  timeout: REMOTE_IMAGE_TIMEOUT_MS,
  headers: {
    'user-agent': 'opencollective-images/1.0',
  },
});

const buildValidatedLookup = (addresses) => {
  if (!addresses) {
    return undefined;
  }

  return (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};

    const family = options.family;
    const matchingAddresses = addresses.filter((address) => !family || net.isIP(address) === family);
    if (matchingAddresses.length === 0) {
      callback(new Error(`No validated address available for ${hostname}`));
      return;
    }

    if (options.all) {
      callback(
        null,
        matchingAddresses.map((address) => ({ address, family: net.isIP(address) })),
      );
      return;
    }

    const address = matchingAddresses[0];
    callback(null, address, net.isIP(address));
  };
};

const remoteImageRequest = async (requestOptions, addresses) => {
  let currentRequestOptions = {
    ...requestOptions,
    lookup: buildValidatedLookup(addresses),
  };

  for (let redirectCount = 0; redirectCount <= MAX_REMOTE_IMAGE_REDIRECTS; redirectCount += 1) {
    const [response, body] = process.env.ENABLE_CACHED_REQUEST
      ? await cachedRequestPromise({ ttl: defaultTtl, ...currentRequestOptions })
      : await requestPromise(currentRequestOptions);

    const locationHeader = response.headers.location;
    const location = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;
    if (![301, 302, 303, 307, 308].includes(response.statusCode) || !location) {
      return [response, body];
    }

    const redirectUrl = new URL(location, currentRequestOptions.url).toString();
    const redirectAddresses = await assertSafeRemoteImageUrl(redirectUrl);
    currentRequestOptions = {
      ...buildRemoteImageRequestOptions(redirectUrl),
      lookup: buildValidatedLookup(redirectAddresses),
    };
  }

  throw new Error('Too many redirects');
};

export const imageRequest = async (url) => {
  const addresses = await assertSafeRemoteImageUrl(url);
  const [response] = await remoteImageRequest(buildRemoteImageRequestOptions(url), addresses);
  return response;
};

export const fetchRemoteImageBody = async (url) => {
  const addresses = await assertSafeRemoteImageUrl(url);
  const [response, body] = await remoteImageRequest(buildRemoteImageRequestOptions(url), addresses);
  return { response, body };
};
