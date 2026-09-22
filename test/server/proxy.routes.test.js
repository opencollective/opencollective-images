import '../../src/server/env';

import http from 'http';

import fetch from 'node-fetch';
import sharp from 'sharp';

const imagesUrl = process.env.IMAGES_URL;
const timeout = 30000;
const cacheBurst = `cacheBurst=${Math.round(Math.random() * 100000)}`;

const fetchProxy = (src, params = '') => {
  const path = `/proxy/images?src=${encodeURIComponent(src)}${params}&${cacheBurst}`;
  return fetch(`${imagesUrl}${path}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Serves a fixed buffer, and hands back the url to reach it */
function createOrigin(handler) {
  const server = http.createServer(handler);
  return {
    listen: (path) =>
      new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}${path}`));
      }),
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(resolve);
      }),
  };
}

/**
 * An origin that streams forever, so the proxy has to give up on its own.
 * It reports whether the connection it served is still open.
 */
function createEndlessOrigin() {
  const state = { connections: 0, openConnections: 0, bytesSent: 0 };
  let stopped = false;

  const origin = createOrigin((req, res) => {
    state.connections++;
    state.openConnections++;
    res.on('close', () => {
      state.openConnections--;
    });

    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    const chunk = Buffer.alloc(64 * 1024, 0xff);
    const pump = () => {
      if (stopped || res.writableEnded || res.destroyed) {
        return;
      }
      state.bytesSent += chunk.length;
      if (res.write(chunk)) {
        setImmediate(pump);
      } else {
        res.once('drain', pump);
      }
    };
    pump();
  });

  return {
    state,
    listen: () => origin.listen('/endless'),
    close: () => {
      stopped = true;
      return origin.close();
    },
  };
}

function serveBuffer(buffer) {
  return createOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(buffer);
  });
}

describe('proxy.routes.test.js', () => {
  describe('image processing', () => {
    test(
      'applies the EXIF orientation, which is dropped from the output',
      async () => {
        // 80x40 tagged with orientation 6, so it is meant to be displayed as 40x80
        const source = await sharp({ create: { width: 80, height: 40, channels: 3, background: '#0c0' } })
          .withMetadata({ orientation: 6 })
          .jpeg()
          .toBuffer();

        const origin = serveBuffer(source);
        const src = await origin.listen('/oriented.jpg');
        try {
          const res = await fetchProxy(src, '&width=40');
          expect(res.status).toEqual(200);
          expect(res.headers.get('content-type')).toEqual('image/jpeg');

          const metadata = await sharp(await res.buffer()).metadata();
          expect(metadata.width).toEqual(40);
          expect(metadata.height).toEqual(80);
        } finally {
          await origin.close();
        }
      },
      timeout,
    );

    test(
      'bounds both dimensions when a single one is requested',
      async () => {
        // A 10x100 sliver asked for at width=400 would otherwise derive a 4000px height
        const source = await sharp({ create: { width: 10, height: 100, channels: 3, background: '#c00' } })
          .jpeg()
          .toBuffer();

        const origin = serveBuffer(source);
        const src = await origin.listen('/sliver.jpg');
        try {
          const res = await fetchProxy(src, '&width=400');
          expect(res.status).toEqual(200);

          const metadata = await sharp(await res.buffer()).metadata();
          expect(metadata.width).toBeLessThanOrEqual(3000);
          expect(metadata.height).toBeLessThanOrEqual(3000);
        } finally {
          await origin.close();
        }
      },
      timeout,
    );
  });

  describe('malformed parameters', () => {
    test(
      'does not take the service down on a non scalar dimension',
      async () => {
        const source = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#369' } })
          .jpeg()
          .toBuffer();

        const origin = serveBuffer(source);
        const src = await origin.listen('/small.jpg');
        try {
          const res = await fetch(`${imagesUrl}/proxy/images?src=${encodeURIComponent(src)}&width[toString]=x`);
          expect(res.status).toBeLessThan(500);

          // The service is still answering
          const robots = await fetch(`${imagesUrl}/robots.txt`);
          expect(robots.status).toEqual(200);
        } finally {
          await origin.close();
        }
      },
      timeout,
    );
  });

  describe('oversized sources', () => {
    test(
      'closes the upstream connection when the response goes over the size limit',
      async () => {
        const origin = createEndlessOrigin();
        const src = await origin.listen();

        try {
          const res = await fetchProxy(src, '&width=100');
          expect(res.status).toEqual(400);

          // The proxy gave up, so the origin must not be streaming to it anymore
          await sleep(1000);
          expect(origin.state.connections).toEqual(1);
          expect(origin.state.openConnections).toEqual(0);

          const bytesSent = origin.state.bytesSent;
          await sleep(1000);
          expect(origin.state.bytesSent).toEqual(bytesSent);
        } finally {
          await origin.close();
        }
      },
      timeout,
    );
  });
});
