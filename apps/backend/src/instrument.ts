// Must be imported before any other module (see main.ts) so Sentry can
// instrument everything else as it loads. No-ops when SENTRY_DSN is unset.
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment: process.env['NODE_ENV'] ?? 'development',
  tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.2 : 0,
});
