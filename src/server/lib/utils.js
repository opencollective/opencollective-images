import crypto from 'crypto';
import { URL } from 'url';

export function getCloudinaryUrl(src, { width, height, query }) {
  const cloudinaryBaseUrl = 'https://res.cloudinary.com/opencollective/image/fetch';

  // We don't try to resize animated gif, svg or images already processed by cloudinary
  if (
    src.substr(0, cloudinaryBaseUrl.length) === cloudinaryBaseUrl ||
    src.match(/\.gif$/) ||
    (src.match(/\.svg$/) && !query) ||
    src.match(/localhost:3000/)
  ) {
    return src;
  }

  let size = '';
  if (width) size += `w_${width},`;
  if (height) size += `h_${height},`;
  if (size === '') size = 'w_320,';

  const format = src.match(/\.png$/) ? 'png' : 'jpg';

  const queryurl = query || `/${size}c_pad,f_${format}/`;

  return `${cloudinaryBaseUrl}${queryurl}${encodeURIComponent(src)}`;
}

export const queryString = {
  stringify: obj => {
    let str = '';
    for (const key in obj) {
      if (str != '') {
        str += '&';
      }
      str += `${key}=${encodeURIComponent(obj[key])}`;
    }
    return str;
  },
  parse: query => {
    if (!query) return {};
    const vars = query.split('&');
    const res = {};
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=');
      res[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return res;
  },
};

export const md5 = string =>
  crypto
    .createHash('md5')
    .update(string)
    .digest('hex');

export function parseToBoolean(value) {
  let lowerValue = value;
  // check whether it's string
  if (lowerValue && (typeof lowerValue === 'string' || lowerValue instanceof String)) {
    lowerValue = lowerValue.trim().toLowerCase();
  }
  if (['on', 'enabled', '1', 'true', 'yes', 1].includes(lowerValue)) {
    return true;
  }
  return false;
}

export const getUiAvatarUrl = (name, size) => {
  const url = new URL('https://ui-avatars.com/api/');

  url.searchParams.set('rounded', true);
  url.searchParams.set('name', name);
  url.searchParams.set('background', 'f2f3f5');
  url.searchParams.set('background', 'c4c7cc');
  url.searchParams.set('size', size);

  return url.toString();
};
