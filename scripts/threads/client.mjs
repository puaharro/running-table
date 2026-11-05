import { setTimeout as delay } from "node:timers/promises";

const BASE = "https://graph.threads.net/v1.0/";
export const POST_FIELDS =
  "id,text,username,permalink,timestamp,has_replies,is_reply,root_post,replied_to";
export const REPLY_FIELDS = POST_FIELDS;
const RATE_CODES = new Set([4, 17, 32, 613, 80004]);

export class CollectorError extends Error {
  constructor(kind, status = null, code = null) {
    super(`${kind}${status ? ` (HTTP ${status})` : ""}${code ? ` [API ${code}]` : ""}`);
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

// Never fetch paging.next itself: it can contain credentials or an unexpected host.
export function nextCursor(body, endpoint) {
  if (!body.paging?.next) return null;
  let next;
  try {
    next = new URL(body.paging.next);
  } catch {
    throw new CollectorError("invalid_pagination");
  }
  const expected = new URL(endpoint, BASE);
  if (
    next.origin !== expected.origin ||
    next.pathname !== expected.pathname ||
    next.username ||
    next.password
  ) {
    throw new CollectorError("invalid_pagination");
  }
  const cursor = body.paging.cursors?.after ?? next.searchParams.get("after");
  if (typeof cursor !== "string" || !cursor) throw new CollectorError("missing_cursor");
  return cursor;
}

export class ThreadsClient {
  constructor({
    token,
    fetchImpl = fetch,
    sleep,
    retries = 4,
    intervalMs = 250,
    timeoutMs = 30000,
    signal,
    onError = () => {},
  }) {
    if (!token?.trim()) throw new CollectorError("missing_access_token");
    Object.assign(this, {
      token,
      fetchImpl,
      sleep,
      retries,
      intervalMs,
      timeoutMs,
      signal,
      onError,
    });
    this.sleep = sleep ?? ((ms) => delay(ms, undefined, { signal }));
  }

  async getPage(endpoint, params, after = null) {
    if (endpoint !== "keyword_search" && !/^\d+\/conversation$/.test(endpoint)) {
      throw new CollectorError("invalid_endpoint");
    }
    const url = new URL(endpoint, BASE);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    if (after) url.searchParams.set("after", after);
    for (let attempt = 0; ; attempt++) {
      this.signal?.throwIfAborted();
      await this.sleep(this.intervalMs);
      let response, body, error;
      try {
        response = await this.fetchImpl(url, {
          headers: { Authorization: `Bearer ${this.token}` },
          redirect: "error",
          signal: this.signal
            ? AbortSignal.any([this.signal, AbortSignal.timeout(this.timeoutMs)])
            : AbortSignal.timeout(this.timeoutMs),
        });
        body = await response.json();
      } catch {
        this.signal?.throwIfAborted();
        error = new CollectorError(response ? "invalid_json" : "network_error", response?.status);
      }
      const code = Number.isInteger(body?.error?.code) ? body.error.code : null;
      const retryable =
        !response ||
        response.status === 429 ||
        response.status >= 500 ||
        RATE_CODES.has(code) ||
        body?.error?.is_transient === true;
      if (!error && (!response.ok || body?.error))
        error = new CollectorError("api_error", response.status, code);
      if (!error) {
        if (
          !Array.isArray(body?.data) ||
          body.data.some((item) => !item || typeof item.id !== "string" || !/^\d+$/.test(item.id))
        ) {
          error = new CollectorError("invalid_response", response.status);
        } else {
          try {
            return { data: body.data, next: nextCursor(body, endpoint) };
          } catch (failure) {
            error = failure;
          }
        }
      }
      // Persist categories/codes, never raw API messages, headers, URLs or tokens.
      this.onError({
        endpoint,
        attempt: attempt + 1,
        kind: error.kind,
        status: error.status,
        code: error.code,
      });
      if (!retryable || attempt >= this.retries) throw error;
      const retryAfter = response?.headers.get("retry-after");
      const seconds =
        retryAfter && /^\d+(\.\d+)?$/.test(retryAfter)
          ? Number(retryAfter) * 1000
          : Date.parse(retryAfter) - Date.now();
      // Long server delays stop this run; resume later instead of retrying too early.
      if (seconds > 60000)
        throw new CollectorError("rate_limit_wait_required", response.status, code);
      await this.sleep(
        Math.max(Number.isFinite(seconds) ? seconds : 0, Math.min(1000 * 2 ** attempt, 60000)),
      );
    }
  }
}
