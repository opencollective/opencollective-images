import dns from 'dns';
import { URL } from 'url';

import ipaddr from 'ipaddr.js';

const DISALLOWED_HOSTNAME_SUFFIXES = ['.internal', '.localhost', '.local'];
const DISALLOWED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);
const DISALLOWED_IP_RANGES = new Set([
  'broadcast',
  'carrierGradeNat',
  'linkLocal',
  'loopback',
  'multicast',
  'private',
  'reserved',
  'uniqueLocal',
  'unspecified',
]);

const TRUSTED_IMAGE_PROVIDER_HOSTS = new Set([
  'gravatar.com',
  'logo.clearbit.com',
  'avatars.githubusercontent.com',
  'pbs.twimg.com',
  'abs.twimg.com',
  'secure.meetupstatic.com',
  'res.cloudinary.com',
  'ui-avatars.com',
]);

export class RemoteImageUrlNotAllowedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RemoteImageUrlNotAllowedError';
  }
}

const isDevelopmentEnv = () => {
  const ocEnv = process.env.OC_ENV || process.env.NODE_ENV || 'development';
  return ocEnv === 'development';
};

const isDisallowedHostname = (hostname) => {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, '');

  if (DISALLOWED_HOSTNAMES.has(normalizedHostname)) {
    return true;
  }

  return DISALLOWED_HOSTNAME_SUFFIXES.some((suffix) => normalizedHostname.endsWith(suffix));
};

const isDisallowedIpAddress = (ip) => {
  let address;

  try {
    address = ipaddr.parse(ip);
  } catch {
    return true;
  }

  if (address.kind() === 'ipv6' && address.isIPv4MappedAddress()) {
    address = address.toIPv4Address();
  }

  return address.range() !== 'unicast';
};

const isLiteralIpHostname = (hostname) => {
  try {
    ipaddr.parse(hostname);
    return true;
  } catch {
    return false;
  }
};

const isSameServiceUrl = (url) => {
  const imagesUrl = process.env.IMAGES_URL;
  if (!imagesUrl) {
    return false;
  }

  try {
    return new URL(url).origin === new URL(imagesUrl).origin;
  } catch {
    return false;
  }
};

const isProtectedFilesUrl = (parsed) => {
  const websiteUrl = process.env.WEBSITE_URL;
  if (!websiteUrl) {
    return false;
  }

  try {
    const websiteOrigin = new URL(websiteUrl).origin;
    return parsed.origin === websiteOrigin && /^\/api\/files\/[^/]+\/?$/.test(parsed.pathname);
  } catch {
    return false;
  }
};

const isTrustedImageProviderHost = (hostname) => {
  const normalized = hostname.toLowerCase();
  if (TRUSTED_IMAGE_PROVIDER_HOSTS.has(normalized)) {
    return true;
  }

  return normalized.endsWith('.gravatar.com');
};

const parseRemoteImageHttpUrl = (url) => {
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    throw new RemoteImageUrlNotAllowedError('Remote image URL must be a valid URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new RemoteImageUrlNotAllowedError('Remote image URL must use HTTP or HTTPS');
  }

  if (!parsed.hostname) {
    throw new RemoteImageUrlNotAllowedError('Remote image URL must include a hostname');
  }

  if (isDevelopmentEnv() && ['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    return parsed;
  }

  if (isLiteralIpHostname(parsed.hostname)) {
    throw new RemoteImageUrlNotAllowedError('IP addresses cannot be used as remote image URLs');
  }

  if (isDisallowedHostname(parsed.hostname)) {
    throw new RemoteImageUrlNotAllowedError('Remote image URL hostname is not allowed');
  }

  return parsed;
};

const resolveHostnameAddresses = async (hostname) => {
  const [ipv4Result, ipv6Result] = await Promise.allSettled([
    dns.promises.resolve4(hostname),
    dns.promises.resolve6(hostname),
  ]);
  const addresses = [
    ...(ipv4Result.status === 'fulfilled' ? ipv4Result.value : []),
    ...(ipv6Result.status === 'fulfilled' ? ipv6Result.value : []),
  ];

  if (addresses.length === 0) {
    const rejectedResult = [ipv4Result, ipv6Result].find((result) => result.status === 'rejected');
    const error = rejectedResult?.reason;
    throw new RemoteImageUrlNotAllowedError(
      `Remote image URL hostname could not be resolved: ${error?.message || 'unknown error'}`,
    );
  }

  return addresses;
};

const assertResolvedAddressesAllowed = async (hostname) => {
  const addresses = await resolveHostnameAddresses(hostname);

  for (const address of addresses) {
    if (isDisallowedIpAddress(address)) {
      throw new RemoteImageUrlNotAllowedError('Remote image URL resolves to a disallowed address');
    }
  }
};

export const assertSafeRemoteImageUrl = async (url) => {
  if (isSameServiceUrl(url)) {
    return;
  }

  const parsed = parseRemoteImageHttpUrl(url);

  if (isProtectedFilesUrl(parsed) || isTrustedImageProviderHost(parsed.hostname)) {
    return;
  }

  await assertResolvedAddressesAllowed(parsed.hostname);
};
