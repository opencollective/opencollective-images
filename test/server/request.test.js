import http from 'http';

import { imageRequest } from '../../src/server/lib/request';

jest.mock('../../src/server/lib/safe-remote-url', () => {
  const actual = jest.requireActual('../../src/server/lib/safe-remote-url');
  return {
    ...actual,
    assertSafeRemoteImageUrl: jest.fn().mockResolvedValue(undefined),
  };
});

describe('request.imageRequest', () => {
  let server;
  let port;
  let capturedHeaders;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      capturedHeaders = req.headers;
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    });
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('does not send internal service headers to remote destinations', async () => {
    process.env.OC_SECRET = 'TEST_SECRET_ONLY';
    process.env.OC_ENV = 'security-test-local';
    process.env.OC_APPLICATION = 'opencollective-images-test';

    const url = `http://127.0.0.1:${port}/probe.png`;
    const response = await imageRequest(url);

    expect(response.statusCode).toEqual(200);
    expect(capturedHeaders['oc-secret']).toBeUndefined();
    expect(capturedHeaders['oc-env']).toBeUndefined();
    expect(capturedHeaders['oc-application']).toBeUndefined();
    expect(capturedHeaders['user-agent']).toEqual('opencollective-images/1.0');
  });
});
