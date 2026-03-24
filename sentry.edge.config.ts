import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3483e10ac4982450133cc07873e11e64@o4511101091512320.ingest.us.sentry.io/4511101096099840",

  sampleRate: 1.0,
  tracesSampleRate: 0.2,
});
