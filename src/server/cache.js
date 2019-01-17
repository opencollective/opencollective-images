import LRUCache from 'lru-cache';

const cache = new LRUCache({
  max: 5000,
  maxAge: 1000 * 60 * 10,
});

export default cache;
