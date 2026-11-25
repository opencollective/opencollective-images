type KeysOfUnion<T> = T extends unknown ? keyof T : never;

/**
 * Merges the members of a union into a single object type. Properties that exist in every member keep their type,
 * the ones that only exist in some members (e.g. fields coming from `... on Type` fragments) become optional.
 */
export type MergeUnion<T> = Pick<T, keyof T> & {
  [K in Exclude<KeysOfUnion<T>, keyof T>]?: T extends unknown ? (K extends keyof T ? T[K] : never) : never;
};
