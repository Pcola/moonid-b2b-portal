// Odstráni PII z eventu pred odoslaním do Sentry: cookies, auth hlavičky,
// query string (môže obsahovať tokeny) a email/ip používateľa.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scrubPii<T extends { request?: any; user?: any }>(event: T): T {
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.Authorization;
      delete event.request.headers.cookie;
      delete event.request.headers.Cookie;
    }
    delete event.request.query_string;
  }
  if (event.user) {
    event.user = { id: event.user.id }; // ponechaj len id, zahoď email/ip/username
  }
  return event;
}
