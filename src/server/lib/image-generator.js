import fs from 'fs-extra';
import Promise from 'bluebird';
import convertSvgToPng from 'convert-svg-to-png';
import imageToAscii from 'image-to-ascii';

export function generateAsciiFromImage(imgsrc, options) {
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
      if (err) return reject(err);
      if (options.trim) {
        ascii = ascii.replace(/\n^\s*$/gm, '');
      }
      return resolve(ascii);
    });
  });
}

/**
 * Converts an svg string into a PNG data blob
 * (returns a promise)
 */
export function svg2png(svg) {
  const outputDir = '/tmp';
  const outputFile = `${outputDir}/${md5(svg)}.png`;

  return (
    fs
      // If file exists, return it
      // Note: because we generate a md5 fingerprint based on the content of the svg,
      //       any change in the svg (margin, size, number of backers, etc.) will force
      //       the creation of a new png :-)
      .readFile(outputFile)
      .catch(() =>
        // Otherwise, generate a new png (slow)
        convertSvgToPng.convert(svg).then(png => fs.writeFile(outputFile, png).then(() => png)),
      )
  );
}
