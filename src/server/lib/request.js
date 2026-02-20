import fetch from './fetch';

export const asyncRequest = async (requestOptions) => {
  const { url, encoding } = typeof requestOptions === 'string' ? { url: requestOptions } : requestOptions;

  const fetchResponse = await fetch(url);

  const body = encoding === null ? Buffer.from(await fetchResponse.arrayBuffer()) : await fetchResponse.text();

  // Return a response shape compatible with the old request module
  const response = {
    statusCode: fetchResponse.status,
    statusMessage: fetchResponse.statusText,
    headers: Object.fromEntries(fetchResponse.headers.entries()),
    body,
  };

  return [response, body];
};

export const imageRequest = (url) =>
  asyncRequest({ url, encoding: null }).then(([response]) => {
    return response;
  });
