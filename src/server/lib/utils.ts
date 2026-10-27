import crypto from 'crypto';
import { URL } from 'url';

export const queryString = {
  stringify: (obj: Record<string, unknown>): string => {
    let str = '';
    for (const key in obj) {
      if (str !== '') {
        str += '&';
      }
      str += `${key}=${encodeURIComponent(String(obj[key]))}`;
    }
    return str;
  },
  parse: (query: string): Record<string, string> => {
    if (!query) {
      return {};
    }
    const vars = query.split('&');
    const res: Record<string, string> = {};
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=');
      res[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return res;
  },
};

export const md5 = (string: string): string => crypto.createHash('md5').update(string).digest('hex');

export const parseToBooleanDefaultFalse = (value: string | number | boolean | null | undefined): boolean => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  const string = value.toString().trim().toLowerCase();
  return ['on', 'enabled', '1', 'true', 'yes', 1].includes(string);
};

export const parseToBooleanDefaultTrue = (value: string | number | boolean | null | undefined): boolean => {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  const string = value.toString().trim().toLowerCase();
  return !['off', 'disabled', '0', 'false', 'no', 0].includes(string);
};

export const getUiAvatarUrl = (
  name: string,
  size: number,
  rounded = true,
  background = 'E6F3FF',
  color = '5CA3FF',
  length = 2,
): string => {
  const url = new URL('https://ui-avatars.com/api/');

  url.searchParams.set('rounded', String(rounded));
  url.searchParams.set('name', name);
  url.searchParams.set('color', color);
  url.searchParams.set('background', background);
  url.searchParams.set('size', String(size));
  url.searchParams.set('length', String(length));

  return url.toString();
};

export const getWebsite = (user: { twitterHandle?: string; website?: string; slug?: string }): string => {
  const twitter = user.twitterHandle ? `https://twitter.com/${user.twitterHandle}` : null;

  return user.website || twitter || `${process.env.WEBSITE_URL}/${user.slug}`;
};

export function sleep(ms = 0): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function randomInteger(max: number): number {
  return Math.floor(Math.random() * max);
}
