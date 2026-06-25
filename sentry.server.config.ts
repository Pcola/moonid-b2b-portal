import * as Sentry from "@sentry/nextjs";
import { scrubPii } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Bez DSN je Sentry úplne inertný (enabled:false) — žiadna réžia, žiadne odosielanie.
Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: (event) => scrubPii(event),
});
