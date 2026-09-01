import * as Sentry from "@sentry/nextjs";

// Same public/pre-auth path set as `publicPaths` in
// src/utils/supabase/middleware.ts — kept in sync manually since this file
// runs in the browser (before routing) while that one runs in the edge
// middleware runtime.
const PUBLIC_PATHS = ["/", "/login", "/register"];
const isPublicRoute =
  typeof window !== "undefined" && PUBLIC_PATHS.includes(window.location.pathname);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session Replay: 10% of all sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  // Replay's DOM-mutation recording adds bundle weight + background work
  // that isn't worth paying on the public marketing pages — error tracking
  // (tracesSampleRate etc. above) still applies everywhere.
  integrations: isPublicRoute ? [] : [Sentry.replayIntegration()],
});

// Hook into App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
