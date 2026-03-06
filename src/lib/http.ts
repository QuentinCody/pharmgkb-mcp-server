/**
 * PharmGKB REST API HTTP client.
 *
 * Wraps restFetch from @bio-mcp/shared with the PharmGKB v1 base URL.
 */

import { restFetch, type RestFetchOptions } from "@bio-mcp/shared/http/rest-fetch";

const PHARMGKB_BASE = "https://api.pharmgkb.org/v1";

export async function pharmgkbFetch(
    path: string,
    params?: Record<string, unknown>,
    opts?: Partial<RestFetchOptions>,
): Promise<Response> {
    return restFetch(PHARMGKB_BASE, path, params, {
        ...opts,
        headers: {
            Accept: "application/json",
            ...(opts?.headers ?? {}),
        },
        retryOn: [429, 500, 502, 503],
        retries: opts?.retries ?? 3,
        timeout: opts?.timeout ?? 30_000,
        userAgent: "pharmgkb-mcp-server/1.0 (bio-mcp)",
    });
}
