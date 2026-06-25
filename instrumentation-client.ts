import * as Sentry from "@sentry/nextjs";
import { scrubPii } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // session replay vypnutý (PII/objem) — pri potrebe zapnúť cielene
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: (event) => scrubPii(event),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
