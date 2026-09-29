import { isValidHttpUrl } from '../../src/server/lib/utils';

describe('utils.test.js', () => {
  describe('isValidHttpUrl', () => {
    test.each(['https://opencollective.com/logo.png', 'http://example.com/image.jpg'])(
      'accepts HTTP image URLs: %s',
      (url) => {
        expect(isValidHttpUrl(url)).toEqual(true);
      },
    );

    test.each(['javascript:alert(1)', 'file:///etc/passwd', 'data:image/svg+xml,<svg></svg>', ['https://example.com']])(
      'rejects unsupported proxy image URLs: %s',
      (url) => {
        expect(isValidHttpUrl(url)).toEqual(false);
      },
    );
  });
});
