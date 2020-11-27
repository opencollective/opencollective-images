import crypto from 'crypto';
import { URL } from 'url';

export function getCloudinaryUrl(src, { width, height, query, style, format }) {
  const cloudinaryBaseUrl = 'https://res.cloudinary.com/opencollective/image/fetch';

  if (!format) {
    format = 'png';
  }

  if (style == 'rounded') {
    query = `/c_thumb,r_max,h_${height},w_${height},bo_2px_solid_rgb:c4c7cc,f_${format}/`;
  }

  // We don't try to resize animated gif, svg or images already processed by cloudinary
  if (
    src.substr(0, cloudinaryBaseUrl.length) === cloudinaryBaseUrl ||
    src.match(/\.gif$/) ||
    (src.match(/\.svg$/) && !query) ||
    src.match(/localhost:3000/)
  ) {
    return src;
  }

  if (!query) {
    let size = '';
    if (width) {
      size += `w_${width},`;
    }
    if (height) {
      size += `h_${height},`;
    }
    if (size === '') {
      size = 'w_320,';
    }

    const format = src.match(/\.png$/) ? 'png' : 'jpg';

    query = `/${size}c_pad,f_${format}/`;
  }

  return `${cloudinaryBaseUrl}${query}${encodeURIComponent(src)}`;
}

export const queryString = {
  stringify: (obj) => {
    let str = '';
    for (const key in obj) {
      if (str != '') {
        str += '&';
      }
      str += `${key}=${encodeURIComponent(obj[key])}`;
    }
    return str;
  },
  parse: (query) => {
    if (!query) {
      return {};
    }
    const vars = query.split('&');
    const res = {};
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=');
      res[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return res;
  },
};

export const md5 = (string) => crypto.createHash('md5').update(string).digest('hex');

export const parseToBooleanDefaultFalse = (value) => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  const string = value.toString().trim().toLowerCase();
  return ['on', 'enabled', '1', 'true', 'yes', 1].includes(string);
};

export const parseToBooleanDefaultTrue = (value) => {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  const string = value.toString().trim().toLowerCase();
  return !['off', 'disabled', '0', 'false', 'no', 0].includes(string);
};

export const getUiAvatarUrl = (name, size, rounded = true, background = 'E6F3FF', color = '5CA3FF', length = 2) => {
  const url = new URL('https://ui-avatars.com/api/');

  url.searchParams.set('rounded', rounded);
  url.searchParams.set('name', name);
  url.searchParams.set('color', color);
  url.searchParams.set('background', background);
  url.searchParams.set('size', size);
  url.searchParams.set('length', length);

  return url.toString();
};

export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
};

export const getWebsite = (user) => {
  const twitter = user.twitterHandle ? `https://twitter.com/${user.twitterHandle}` : null;

  return user.website || twitter || `${process.env.WEBSITE_URL}/${user.slug}`;
};

export function sleep(ms = 0) {
  return new Promise((r) => setTimeout(r, ms));
}

export function randomInteger(max) {
  return Math.floor(Math.random() * max);
}
