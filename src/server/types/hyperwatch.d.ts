declare module '@hyperwatch/hyperwatch' {
  import type { Application, RequestHandler } from 'express';
  import type { Server } from 'http';

  interface HyperwatchApp {
    mount(app: Application, options: { server: Server; path: string; middleware: RequestHandler }): void;
  }

  interface HyperwatchInput {
    express: { create(): { middleware(): RequestHandler } };
  }

  interface HyperwatchPipeline {
    registerInput(input: unknown): void;
    map(callback: (log: unknown) => void): void;
    start(): void;
  }

  interface Hyperwatch {
    init(options: { modules: Record<string, { active: boolean }> }): void;
    app: HyperwatchApp;
    input: HyperwatchInput;
    pipeline: HyperwatchPipeline;
    modules: { start(): void };
    lib: { logger: { defaultFormatter: { format(log: unknown, output: string): string } } };
  }

  const hyperwatch: Hyperwatch;

  export default hyperwatch;
}
