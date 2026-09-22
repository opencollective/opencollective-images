import dns from 'dns';
import { URL } from 'url';

import ipaddr from 'ipaddr.js';

const DISALLOWED_HOSTNAME_SUFFIXES = ['.internal', '.localhost', '.local'];
const DISALLOWED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);
const DEV_LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

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
  const ocEnv = process.env.OC_ENV || process.env.NODE_ENV;
  return ocEnv === 'development';
};

const normalizeHostname = (hostname) =>
  hostname
    .toLowerCase()
    .replace(/\.+$/, '')
    .replace(/^\[|\]$/g, '');

const isDisallowedHostname = (hostname) => {
  const normalizedHostname = normalizeHostname(hostname);

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
    ipaddr.parse(normalizeHostname(hostname));
    return true;
  } catch {
    return false;
  }
};

const devLoopbackAddresses = (hostname) => {
  if (normalizeHostname(hostname) === '::1') {
    return ['::1'];
  }

  return ['127.0.0.1'];
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
  const normalized = normalizeHostname(hostname);
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
  const allowedAddresses = addresses.filter((address) => !isDisallowedIpAddress(address));

  if (allowedAddresses.length === 0) {
    throw new RemoteImageUrlNotAllowedError('Remote image URL resolves to a disallowed address');
  }

  return allowedAddresses;
};

export const assertSafeRemoteImageUrl = async (url) => {
  if (isSameServiceUrl(url)) {
    return undefined;
  }

  const parsed = parseRemoteImageHttpUrl(url);
  const hostname = normalizeHostname(parsed.hostname);

  if (isDevelopmentEnv() && DEV_LOOPBACK_HOSTNAMES.has(hostname)) {
    return devLoopbackAddresses(hostname);
  }

  if (isLiteralIpHostname(hostname)) {
    throw new RemoteImageUrlNotAllowedError('IP addresses cannot be used as remote image URLs');
  }

  if (isDisallowedHostname(hostname)) {
    throw new RemoteImageUrlNotAllowedError('Remote image URL hostname is not allowed');
  }

  if (isProtectedFilesUrl(parsed) || isTrustedImageProviderHost(hostname)) {
    return undefined;
  }

  return assertResolvedAddressesAllowed(hostname);
};
