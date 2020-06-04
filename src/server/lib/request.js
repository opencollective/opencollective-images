import Promise from 'bluebird';
import request from 'request';
import cachedRequestLib from 'cached-request';

const cachedRequest = cachedRequestLib(request);
cachedRequest.setCacheDirectory('/tmp');

const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

const defaultTtl = oneDayInMilliseconds;

const cachedRequestPromise = Promise.promisify(cachedRequest, { multiArgs: true });

const userAgent = 'opencollective-images/1.0 request/2.88.2';

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
  if (process.env.ENABLE_CACHED_REQUEST) {
    return cachedRequestPromise({ ttl: defaultTtl, ...requestOptions, headers: { 'user-agent': userAgent } });
  } else {
    return requestPromise({ ...requestOptions, headers: { 'user-agent': userAgent } });
  }
};

export const imageRequest = (url) =>
  asyncRequest({ url, encoding: null }).then(([response]) => {
    return response;
  });
