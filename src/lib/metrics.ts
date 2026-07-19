import client from 'prom-client';

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000, 2000, 5000]
});

import { Request, Response, NextFunction } from 'express';
export function observeRequest(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = diff[0] * 1e3 + diff[1] / 1e6;
    httpRequestDurationMicroseconds.labels(req.method, req.route?.path || req.path, String(res.statusCode)).observe(duration);
  });
  next();
}

import { Express } from 'express';
export function exposeMetrics(app: Express) {
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });
}
