import Promise from 'bluebird';
import cachedRequestLib from 'cached-request';
import request from 'request';

const cachedRequest = cachedRequestLib(request);
cachedRequest.setCacheDirectory('/tmp');

const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

const defaultTtl = oneDayInMilliseconds;

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

export const asyncRequest = (requestOptions) => {
  // Image fetches are user-controlled. Never attach internal service headers.
  const headers = {
    'user-agent': 'opencollective-images/1.0',
  };
  if (process.env.ENABLE_CACHED_REQUEST) {
    return cachedRequestPromise({ ttl: defaultTtl, ...requestOptions, headers });
  } else {
    return requestPromise({ ...requestOptions, headers });
  }
};

export const imageRequest = (url) =>
  asyncRequest({ url, encoding: null }).then(([response]) => {
    return response;
  });
