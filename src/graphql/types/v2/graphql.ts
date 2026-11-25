/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All account types */
export type AccountType =
  'BOT' | 'COLLECTIVE' | 'EVENT' | 'FUND' | 'INDIVIDUAL' | 'ORGANIZATION' | 'PLATFORM' | 'PROJECT' | 'VENDOR';

export type TierFrequency = 'FLEXIBLE' | 'MONTHLY' | 'ONETIME' | 'YEARLY';

export type BackersForImagesQueryVariables = Exact<{
  slug: string;
  accountType?: Array<AccountType | null | undefined> | AccountType | null | undefined;
  limit: number;
  offset: number;
}>;

export type BackersForImagesQuery = {
  account:
    | {
        id: string;
        members: {
          totalCount: number | null;
          nodes: Array<{
            id: string;
            isActive: boolean;
            tier: { id: string } | null;
            account:
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  isGuest: boolean;
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        members: {
          totalCount: number | null;
          nodes: Array<{
            id: string;
            isActive: boolean;
            tier: { id: string } | null;
            account:
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  isGuest: boolean;
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        members: {
          totalCount: number | null;
          nodes: Array<{
            id: string;
            isActive: boolean;
            tier: { id: string } | null;
            account:
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  isGuest: boolean;
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        members: {
          totalCount: number | null;
          nodes: Array<{
            id: string;
            isActive: boolean;
            tier: { id: string } | null;
            account:
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  isGuest: boolean;
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        members: {
          totalCount: number | null;
          nodes: Array<{
            id: string;
            isActive: boolean;
            tier: { id: string } | null;
            account:
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  isGuest: boolean;
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        members: {
          totalCount: number | null;
          nodes: Array<{
            id: string;
            isActive: boolean;
            tier: { id: string } | null;
            account:
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  isGuest: boolean;
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        members: {
          totalCount: number | null;
          nodes: Array<{
            id: string;
            isActive: boolean;
            tier: { id: string } | null;
            account:
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  isGuest: boolean;
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        members: {
          totalCount: number | null;
          nodes: Array<{
            id: string;
            isActive: boolean;
            tier: { id: string } | null;
            account:
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  isGuest: boolean;
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        members: {
          totalCount: number | null;
          nodes: Array<{
            id: string;
            isActive: boolean;
            tier: { id: string } | null;
            account:
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  isGuest: boolean;
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        members: {
          totalCount: number | null;
          nodes: Array<{
            id: string;
            isActive: boolean;
            tier: { id: string } | null;
            account:
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  isGuest: boolean;
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | {
                  slug: string;
                  name: string | null;
                  type: AccountType;
                  imageUrl: string | null;
                  website: string | null;
                  twitterHandle: string | null;
                }
              | null;
          } | null> | null;
        };
      }
    | null;
};

export type ActiveOrdersForImagesQueryVariables = Exact<{
  slug: string;
  limit: number;
  offset: number;
}>;

export type ActiveOrdersForImagesQuery = {
  account:
    | {
        id: string;
        orders: {
          totalCount: number | null;
          nodes: Array<{
            fromAccount:
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        orders: {
          totalCount: number | null;
          nodes: Array<{
            fromAccount:
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        orders: {
          totalCount: number | null;
          nodes: Array<{
            fromAccount:
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        orders: {
          totalCount: number | null;
          nodes: Array<{
            fromAccount:
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        orders: {
          totalCount: number | null;
          nodes: Array<{
            fromAccount:
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        orders: {
          totalCount: number | null;
          nodes: Array<{
            fromAccount:
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        orders: {
          totalCount: number | null;
          nodes: Array<{
            fromAccount:
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        orders: {
          totalCount: number | null;
          nodes: Array<{
            fromAccount:
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        orders: {
          totalCount: number | null;
          nodes: Array<{
            fromAccount:
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | null;
          } | null> | null;
        };
      }
    | {
        id: string;
        orders: {
          totalCount: number | null;
          nodes: Array<{
            fromAccount:
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | { slug: string }
              | null;
          } | null> | null;
        };
      }
    | null;
};

export type TiersForImagesQueryVariables = Exact<{
  slug: string;
}>;

export type TiersForImagesQuery = {
  account:
    | { id: string }
    | {
        id: string;
        tiers: { nodes: Array<{ id: string; slug: string | null; frequency: TierFrequency } | null> | null };
      }
    | {
        id: string;
        tiers: { nodes: Array<{ id: string; slug: string | null; frequency: TierFrequency } | null> | null };
      }
    | {
        id: string;
        tiers: { nodes: Array<{ id: string; slug: string | null; frequency: TierFrequency } | null> | null };
      }
    | {
        id: string;
        tiers: { nodes: Array<{ id: string; slug: string | null; frequency: TierFrequency } | null> | null };
      }
    | { id: string }
    | {
        id: string;
        tiers: { nodes: Array<{ id: string; slug: string | null; frequency: TierFrequency } | null> | null };
      }
    | { id: string }
    | {
        id: string;
        tiers: { nodes: Array<{ id: string; slug: string | null; frequency: TierFrequency } | null> | null };
      }
    | {
        id: string;
        tiers: { nodes: Array<{ id: string; slug: string | null; frequency: TierFrequency } | null> | null };
      }
    | null;
};

export type TierOrdersForImagesQueryVariables = Exact<{
  tierId: string;
  limit: number;
  offset: number;
}>;

export type TierOrdersForImagesQuery = {
  tier: {
    id: string;
    orders: {
      totalCount: number | null;
      nodes: Array<{
        createdAt: any;
        processedAt: any;
        lastChargedAt: any;
        fromAccount:
          | {
              slug: string;
              name: string | null;
              type: AccountType;
              imageUrl: string | null;
              website: string | null;
              twitterHandle: string | null;
            }
          | {
              slug: string;
              name: string | null;
              type: AccountType;
              imageUrl: string | null;
              website: string | null;
              twitterHandle: string | null;
            }
          | {
              slug: string;
              name: string | null;
              type: AccountType;
              imageUrl: string | null;
              website: string | null;
              twitterHandle: string | null;
            }
          | {
              slug: string;
              name: string | null;
              type: AccountType;
              imageUrl: string | null;
              website: string | null;
              twitterHandle: string | null;
            }
          | {
              slug: string;
              name: string | null;
              type: AccountType;
              imageUrl: string | null;
              website: string | null;
              twitterHandle: string | null;
            }
          | {
              isGuest: boolean;
              slug: string;
              name: string | null;
              type: AccountType;
              imageUrl: string | null;
              website: string | null;
              twitterHandle: string | null;
            }
          | {
              slug: string;
              name: string | null;
              type: AccountType;
              imageUrl: string | null;
              website: string | null;
              twitterHandle: string | null;
            }
          | {
              slug: string;
              name: string | null;
              type: AccountType;
              imageUrl: string | null;
              website: string | null;
              twitterHandle: string | null;
            }
          | {
              slug: string;
              name: string | null;
              type: AccountType;
              imageUrl: string | null;
              website: string | null;
              twitterHandle: string | null;
            }
          | {
              slug: string;
              name: string | null;
              type: AccountType;
              imageUrl: string | null;
              website: string | null;
              twitterHandle: string | null;
            }
          | null;
      } | null> | null;
    };
  } | null;
};

export const BackersForImagesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BackersForImages' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'slug' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'accountType' } },
          type: { kind: 'ListType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'AccountType' } } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'account' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'slug' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'slug' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'members' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'role' },
                      value: { kind: 'ListValue', values: [{ kind: 'EnumValue', value: 'BACKER' }] },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'accountType' },
                      value: { kind: 'Variable', name: { kind: 'Name', value: 'accountType' } },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'orderByTotalContributed' },
                      value: { kind: 'EnumValue', value: 'DESC' },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'includeInherited' },
                      value: { kind: 'BooleanValue', value: false },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'limit' },
                      value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'offset' },
                      value: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nodes' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'tier' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'id' } }],
                              },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'account' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'imageUrl' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'website' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'twitterHandle' } },
                                  {
                                    kind: 'InlineFragment',
                                    typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Individual' } },
                                    selectionSet: {
                                      kind: 'SelectionSet',
                                      selections: [{ kind: 'Field', name: { kind: 'Name', value: 'isGuest' } }],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BackersForImagesQuery, BackersForImagesQueryVariables>;
export const ActiveOrdersForImagesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ActiveOrdersForImages' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'slug' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'account' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'slug' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'slug' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'orders' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'filter' },
                      value: { kind: 'EnumValue', value: 'INCOMING' },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'status' },
                      value: { kind: 'ListValue', values: [{ kind: 'EnumValue', value: 'ACTIVE' }] },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'frequency' },
                      value: {
                        kind: 'ListValue',
                        values: [
                          { kind: 'EnumValue', value: 'MONTHLY' },
                          { kind: 'EnumValue', value: 'YEARLY' },
                        ],
                      },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'limit' },
                      value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'offset' },
                      value: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nodes' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'fromAccount' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [{ kind: 'Field', name: { kind: 'Name', value: 'slug' } }],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ActiveOrdersForImagesQuery, ActiveOrdersForImagesQueryVariables>;
export const TiersForImagesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'TiersForImages' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'slug' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'account' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'slug' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'slug' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'InlineFragment',
                  typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'AccountWithContributions' } },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tiers' },
                        arguments: [
                          {
                            kind: 'Argument',
                            name: { kind: 'Name', value: 'limit' },
                            value: { kind: 'IntValue', value: '1000' },
                          },
                          {
                            kind: 'Argument',
                            name: { kind: 'Name', value: 'onlyValid' },
                            value: { kind: 'BooleanValue', value: false },
                          },
                        ],
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'nodes' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'frequency' } },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TiersForImagesQuery, TiersForImagesQueryVariables>;
export const TierOrdersForImagesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'TierOrdersForImages' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'tierId' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tier' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'tier' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'id' },
                      value: { kind: 'Variable', name: { kind: 'Name', value: 'tierId' } },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'orders' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'limit' },
                      value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'offset' },
                      value: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nodes' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'processedAt' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'lastChargedAt' } },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'fromAccount' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'imageUrl' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'website' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'twitterHandle' } },
                                  {
                                    kind: 'InlineFragment',
                                    typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Individual' } },
                                    selectionSet: {
                                      kind: 'SelectionSet',
                                      selections: [{ kind: 'Field', name: { kind: 'Name', value: 'isGuest' } }],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TierOrdersForImagesQuery, TierOrdersForImagesQueryVariables>;
