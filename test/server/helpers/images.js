export const pngBody = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+BAQAHggJ/PpI2ywAAAABJRU5ErkJggg==',
  'base64',
);

export const mockImageResponse = (body = pngBody) => ({
  statusCode: 200,
  statusMessage: 'OK',
  headers: { 'content-type': 'image/png' },
  body,
});
