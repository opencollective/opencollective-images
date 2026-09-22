import Promise from 'bluebird';
import cachedRequestLib from 'cached-request';
import net from 'net';
import request from 'request';
import { URL } from 'url';

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
  followRedirect: false,
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
    const matchingAddresses = addresses.filter((address) => !options.family || net.isIP(address) === options.family);
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

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const [response, body] = process.env.ENABLE_CACHED_REQUEST
      ? await cachedRequestPromise({ ttl: defaultTtl, ...currentRequestOptions })
      : await requestPromise(currentRequestOptions);

    if (![301, 302, 303, 307, 308].includes(response.statusCode) || !response.headers.location) {
      return [response, body];
    }

    const redirectUrl = new URL(response.headers.location, currentRequestOptions.url).toString();
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
