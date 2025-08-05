import { isNil } from 'lodash';

/**
 * Normalize the size to 8, 16, 32, 64, 128, etc. up to maxSize
 *
 * @param {number} size
 * @param {number} maxSize
 * @returns {number}
 */
export const normalizeSize = (size, maxSize) => {
  if (isNil(size)) {
    return size;
  } else if (size > maxSize) {
    return maxSize;
  } else if (size <= 8) {
    return 8;
  } else {
    const result = 2 ** Math.ceil(Math.log2(size));
    return result > maxSize ? maxSize : result; // Need to re-check maxSize in case it's not a power of 2
  }
};
