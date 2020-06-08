import Promise from 'bluebird';
import request from 'request';
import cachedRequestLib from 'cached-request';

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
  const headers = {
    'oc-env': process.env.OC_ENV,
    'oc-secret': process.env.OC_SECRET,
    'oc-application': process.env.OC_APPLICATION,
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
