export const maxAge = (maxAge = 60) => {
  return (req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
};

// This service only serves images: nothing it returns should run scripts or load other resources.
// Inline styles and data: images are kept because our SVGs use style attributes and embed avatars
// as data URIs. Popups stay allowed so the links in SVG banners still open.
export const CONTENT_SECURITY_POLICY =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox allow-popups allow-popups-to-escape-sandbox";

export const securityHeaders = (req, res, next) => {
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

/**
 * Answers with the status of a failed upstream image request. The upstream status text is
 * never forwarded, and transient failures (server errors, timeouts, rate limits) are not cached.
 */
export const sendUpstreamErrorStatus = (res, status) => {
  if (status >= 500 || status === 408 || status === 429) {
    res.set('Cache-Control', 'no-store');
  }
  return res.sendStatus(status);
};
