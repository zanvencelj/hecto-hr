import type { IncomingMessage } from 'http';
import type { Params } from 'nestjs-pino';

const isProduction = process.env['NODE_ENV'] === 'production';

export const loggerConfig: Params = {
  pinoHttp: {
    level: isProduction ? 'info' : 'debug',

    serializers: {
      req: (req: { id: string; method: string; url: string }) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res: { statusCode: number }) => ({
        statusCode: res.statusCode,
      }),
    },

    ...(isProduction
      ? {
          formatters: {
            // Emit string level names ("info", "warn", "error") instead of
            // pino's default numeric codes — required for Promtail label extraction.
            level: (label: string) => ({ level: label }),
            // Strip hostname from bindings to reduce log line noise.
            bindings: () => ({}),
          },
          timestamp: () => `,"time":"${new Date().toISOString()}"`,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.passwordHash',
            ],
            remove: true,
          },
        }
      : {
          transport: {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
              levelFirst: false,
              translateTime: 'HH:MM:ss.l',
              ignore: 'pid,hostname,service',
            },
          },
        }),

    // Attach a "service" field to every log line for Loki stream selection.
    customProps: () => ({
      service: process.env['SERVICE_NAME'] ?? 'backend',
    }),

    // Skip health-check polls (hit every 15s by Docker) to avoid log noise.
    autoLogging: {
      ignore: (req: IncomingMessage) => req.url === '/api/health',
    },
  },
};
