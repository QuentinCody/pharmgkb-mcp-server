/**
 * PharmGKB API adapter — wraps pharmgkbFetch into the ApiFetchFn interface
 * for use by the Code Mode execute tool.
 */

import type { ApiFetchFn } from "@bio-mcp/shared/codemode/catalog";
import { pharmgkbFetch } from "./http";

/**
 * Create an ApiFetchFn that routes through pharmgkbFetch.
 * No auth needed — PharmGKB REST API is public for read access.
 */
export function createPharmgkbApiFetch(): ApiFetchFn {
    return async (request) => {
        const response = await pharmgkbFetch(
            request.path,
            request.params as Record<string, unknown>,
        );

        if (!response.ok) {
            let errorBody: string;
            try {
                errorBody = await response.text();
            } catch {
                errorBody = response.statusText;
            }
            const error = new Error(
                `HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
            ) as Error & { status: number; data: unknown };
            error.status = response.status;
            error.data = errorBody;
            throw error;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("json")) {
            const text = await response.text();
            return { status: response.status, data: text };
        }

        const data = await response.json();
        return { status: response.status, data };
    };
}
