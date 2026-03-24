import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3483e10ac4982450133cc07873e11e64@o4511101091512320.ingest.us.sentry.io/4511101096099840",

  // Send 100% of errors (adjust down if you get high volume)
  sampleRate: 1.0,

  // Capture 20% of transactions for performance monitoring
  tracesSampleRate: 0.2,

  // Capture session replays on errors (helps you see what the user did)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],
});
