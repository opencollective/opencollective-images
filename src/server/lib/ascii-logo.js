import Promise from 'bluebird';
import imageToAscii from 'image-to-ascii';

export function generateAsciiLogo(imgsrc, options) {
  const variants = {
    solid: '█'.split(''),
    variant1: ' .,:;i1tfLCG08@'.split(''),
    variant2: '@%#*+=-:. '.split('').reverse(),
    variant3: '#¥¥®®ØØ$$ø0oo°++=-,.    '.split('').reverse(),
    variant4: '#WMBRXVYIti+=;:,. '.split('').reverse(),
    'ultra-wide': (
      'MMMMMMM@@@@@@@WWWWWWWWWBBBBBBBB000000008888888ZZZZZZZZZaZaaaaaa2222222SSS' +
      'SSSSXXXXXXXXXXX7777777rrrrrrr;;;;;;;;iiiiiiiii:::::::,:,,,,,,.........    '
    )
      .split('')
      .reverse(),
    wide: '@@@@@@@######MMMBBHHHAAAA&&GGhh9933XXX222255SSSiiiissssrrrrrrr;;;;;;;;:::::::,,,,,,,........        '.split(
      '',
    ),
    hatching: '##XXxxx+++===---;;,,...    '.split('').reverse(),
    bits: '# '.split('').reverse(),
    binary: '01 '.split('').reverse(),
    greyscale: ' ▤▦▩█'.split(''),
    blocks: ' ▖▚▜█'.split(''),
  };

  return new Promise((resolve, reject) => {
    options.pixels = variants[options.variant || 'wide'];
    imageToAscii(imgsrc, options, (err, ascii) => {
      if (err) {
        return reject(err);
      }
      if (options.trim) {
        ascii = ascii.replace(/\n^\s*$/gm, '');
      }
      return resolve(ascii);
    });
  });
}
