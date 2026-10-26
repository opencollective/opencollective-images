export interface CacheGetOptions {
  unserialize?: (value: string) => unknown;
}

export interface CacheSetOptions {
  serialize?: (value: unknown) => string;
}

export interface CacheProvider {
  clear: () => Promise<unknown>;
  delete: (key: string) => Promise<unknown>;
  get: (key: string, options?: CacheGetOptions) => Promise<unknown>;
  has: (key: string) => Promise<boolean | null | undefined>;
  set: (key: string, value: unknown, expirationInSeconds: number, options?: CacheSetOptions) => Promise<unknown>;
}
