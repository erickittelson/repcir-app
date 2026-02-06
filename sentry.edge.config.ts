import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring - lower for edge
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  // Debug mode in development
  debug: process.env.NODE_ENV === "development",

  // Environment
  environment: process.env.NODE_ENV,
});
