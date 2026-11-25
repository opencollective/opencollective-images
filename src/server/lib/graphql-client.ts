import { ApolloClient, ApolloLink, CombinedGraphQLErrors, HttpLink, InMemoryCache } from '@apollo/client/core';
import type { DocumentNode, GraphQLFormattedError } from 'graphql';

import type { FetchInit } from './fetch';
import fetch from './fetch';

// Apollo Client 4 only accepts the default options declared in this namespace
declare module '@apollo/client/core/defaultOptions' {
  namespace DeclareDefaultOptions {
    interface WatchQuery {
      errorPolicy: 'all';
    }
    interface Query {
      errorPolicy: 'all';
    }
  }
}

export type GraphqlVersion = 'v1' | 'v2';

// `HttpLink` is typed against the DOM `fetch`, but always calls it with the endpoint URL as a string
const linkFetch: typeof globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return fetch(url, init as FetchInit | undefined);
};

const getGraphqlUrl = (version: GraphqlVersion): string => {
  const apiKey = process.env.API_KEY;
  const baseApiUrl = process.env.API_URL;
  return `${baseApiUrl}/graphql/${version}${apiKey ? `?api_key=${apiKey}` : ''}`;
};

const clients: Partial<Record<GraphqlVersion, ApolloClient>> = {};

function getClient(version: GraphqlVersion): ApolloClient {
  if (!clients[version]) {
    clients[version] = new ApolloClient({
      cache: new InMemoryCache(),
      link: ApolloLink.from([new HttpLink({ fetch: linkFetch, uri: getGraphqlUrl(version) })]),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'no-cache',
          errorPolicy: 'all',
        },
        query: {
          fetchPolicy: 'no-cache',
          errorPolicy: 'all',
        },
      },
    });
  }
  return clients[version];
}

export async function graphqlRequest<TData>(
  query: DocumentNode,
  variables: Record<string, unknown>,
  { version = 'v1' }: { version?: GraphqlVersion } = {},
): Promise<{ data: TData; errors?: readonly GraphQLFormattedError[] }> {
  const { data, error } = await getClient(version).query({ query, variables, fetchPolicy: 'no-cache' });
  // `graphql-tag` documents are untyped: the response shape is declared by each caller
  const result = data as TData;
  if (!error) {
    return { data: result };
  }
  // With `errorPolicy: 'all'`, Apollo Client 4 returns GraphQL errors as a single `error`:
  // expose them as `errors` like before, and throw network errors like Apollo Client 3 did
  if (CombinedGraphQLErrors.is(error)) {
    return { data: result, errors: error.errors };
  }
  throw error;
}
