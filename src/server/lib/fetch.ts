import http from 'http';
import https from 'https';

import { pick } from 'lodash';
import type { Response as NodeFetchResponse } from 'node-fetch';
import nodeFetch from 'node-fetch';

import { parseToBooleanDefaultTrue } from './utils';

interface FetchInit {
  agent?: http.Agent | ((parsedURL: URL) => http.Agent);
  body?: string;
  headers?: Record<string, string>;
}

// node-fetch implements the fetch API at runtime; Apollo's HttpLink is typed against the DOM one
const asFetchResponse = (response: NodeFetchResponse | Response): Response => response as Response;

let customAgent: ((parsedURL: URL) => http.Agent | https.Agent) | undefined;

const getCustomAgent = (): ((parsedURL: URL) => http.Agent | https.Agent) | undefined => {
  if (!customAgent) {
    const { FETCH_AGENT_KEEP_ALIVE, FETCH_AGENT_KEEP_ALIVE_MSECS } = process.env;
    const keepAlive = FETCH_AGENT_KEEP_ALIVE !== undefined ? parseToBooleanDefaultTrue(FETCH_AGENT_KEEP_ALIVE) : true;
    const keepAliveMsecs = FETCH_AGENT_KEEP_ALIVE_MSECS ? Number(FETCH_AGENT_KEEP_ALIVE_MSECS) : 10000;
    const httpAgent = new http.Agent({ keepAlive, keepAliveMsecs });
    const httpsAgent = new https.Agent({ keepAlive, keepAliveMsecs });
    customAgent = (_parsedURL) => (_parsedURL.protocol === 'http:' ? httpAgent : httpsAgent);
  }
  return customAgent;
};

function isInternalApiUrl(url: string | URL): boolean {
  const apiUrl = process.env.API_URL;
  const href = typeof url === 'string' ? url : url instanceof URL ? url.href : null;
  if (!apiUrl || !href) {
    return false;
  }

  try {
    return new URL(href).origin === new URL(apiUrl).origin;
  } catch {
    return false;
  }
}

/**
 * Fetch for user-controlled URLs (images, proxied assets): keep-alive agent and user-agent only.
 * Never attaches the internal service headers and skips the GraphQL benchmarking.
 */
export async function fetchExternal(url: string, options: FetchInit = {}): Promise<NodeFetchResponse> {
  return nodeFetch(url, {
    ...options,
    agent: getCustomAgent(),
    headers: { ...options.headers, 'user-agent': 'opencollective-images/1.0' },
  });
}

async function fetch(url: string, options: FetchInit = {}): Promise<Response> {
  options.agent = getCustomAgent();

  // Internal service headers identify this app to the API. They must not be sent anywhere else.
  options.headers = options.headers || {};
  options.headers['user-agent'] = 'opencollective-images/1.0';
  if (isInternalApiUrl(url)) {
    options.headers['oc-env'] = process.env.OC_ENV;
    options.headers['oc-secret'] = process.env.OC_SECRET;
    options.headers['oc-application'] = process.env.OC_APPLICATION;
  }

  // Start benchmarking if the request is server side
  const start = process.hrtime.bigint();

  const result = await nodeFetch(url, options);

  // Complete benchmark measure and log
  if (process.env.GRAPHQL_BENCHMARK) {
    const end = process.hrtime.bigint();
    const executionTime = Math.round(Number(end - start) / 1000000);
    const apiExecutionTime = result.headers.get('Execution-Time');
    const latencyTime = apiExecutionTime ? executionTime - Number(apiExecutionTime) : null;
    const body = JSON.parse(options.body);
    if (body.operationName || body.variables) {
      const pickList = [
        'CollectiveId',
        'collectiveSlug',
        'CollectiveSlug',
        'id',
        'ledgacyId',
        'legacyExpenseId',
        'slug',
        'term',
        'tierId',
      ];
      const operationName = body.operationName || 'anonymous GraphQL query';
      const variables = pick(body.variables, pickList) || {};
      console.log(
        '-> Fetched',
        operationName,
        variables,
        executionTime ? `in ${executionTime}ms` : '',
        latencyTime ? `latency=${latencyTime}ms` : '',
      );
    }
  }

  return asFetchResponse(result);
}

export default fetch;
