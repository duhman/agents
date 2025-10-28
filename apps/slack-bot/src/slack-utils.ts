/**
 * Slack API utility functions for shared logic across HITM codepaths
 * Reference: https://docs.slack.dev
 */

export interface SlackCapabilities {
  hasValidToken: boolean;
  hasRequiredScopes: boolean;
  canOpenModals: boolean;
  error?: string;
}

/**
 * Parse Retry-After value from HTTP headers or response body
 * Honors Retry-After header over body field per HTTP spec
 * Reference: https://docs.slack.dev/apis/rate-limiting
 */
export function parseRetryAfterSeconds(
  headers: Headers | Record<string, string>,
  bodyRetryAfter?: unknown
): number | undefined {
  // Handle both Fetch API Headers and plain object
  const headerValue =
    headers instanceof Headers
      ? headers.get("retry-after")
      : (headers["retry-after"] as string | undefined);

  if (headerValue) {
    const parsed = parseInt(headerValue, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Fallback to body field
  const fallbackNumber =
    typeof bodyRetryAfter === "number"
      ? bodyRetryAfter
      : typeof bodyRetryAfter === "string"
        ? parseInt(bodyRetryAfter, 10)
        : undefined;

  if (fallbackNumber && fallbackNumber > 0) {
    return fallbackNumber;
  }

  return undefined;
}

/**
 * Check if error response indicates rate limiting
 */
export function isRateLimitError(error: string | undefined): boolean {
  if (!error) return false;
  return /^rate_?limit/i.test(error) || /^ratelimit/i.test(error);
}

/**
 * Check if error is retryable (transient)
 */
export function isRetryableError(error: string | undefined): boolean {
  if (!error) return false;

  const retryableErrors = [
    "internal_error",
    "service_unavailable",
    "request_timeout",
    "connection_error",
    "rate_limited",
    "ratelimited"
  ];

  return retryableErrors.some(e => error.toLowerCase().includes(e));
}

/**
 * Required OAuth scopes for HITM bot functionality
 */
const REQUIRED_SCOPES = [
  "chat:write",
  "commands",
  "im:write",
  "channels:read",
  "groups:read",
  "users:read",
  "users:read.email"
];

/**
 * Check Slack bot capabilities (token validity and required scopes)
 * Used on cold start paths and health checks
 * Reference: https://docs.slack.dev/methods/auth/auth.test
 */
export async function checkSlackCapabilities(
  token?: string
): Promise<SlackCapabilities> {
  const botToken = token || process.env.SLACK_BOT_TOKEN;

  if (!botToken) {
    return {
      hasValidToken: false,
      hasRequiredScopes: false,
      canOpenModals: false,
      error: "SLACK_BOT_TOKEN not configured"
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        hasValidToken: false,
        hasRequiredScopes: false,
        canOpenModals: false,
        error: `HTTP ${res.status} from Slack API`
      };
    }

    const result = await res.json();

    if (!result.ok) {
      return {
        hasValidToken: false,
        hasRequiredScopes: false,
        canOpenModals: false,
        error: result.error || "auth.test failed"
      };
    }

    // Extract scopes from response
    const scopesStr = result.scope || "";
    const grantedScopes = scopesStr.split(/[,\s]+/).filter(Boolean);

    // Check if all required scopes are present
    const hasRequiredScopes = REQUIRED_SCOPES.every(scope =>
      grantedScopes.includes(scope)
    );

    // Modal capability requires specific scopes
    const canOpenModals = grantedScopes.includes("commands") || grantedScopes.includes("im:write");

    return {
      hasValidToken: true,
      hasRequiredScopes,
      canOpenModals,
      error: !hasRequiredScopes
        ? `Missing scopes. Required: ${REQUIRED_SCOPES.join(", ")}. Got: ${grantedScopes.join(", ")}`
        : undefined
    };
  } catch (error: any) {
    return {
      hasValidToken: false,
      hasRequiredScopes: false,
      canOpenModals: false,
      error: error?.message || String(error)
    };
  }
}
