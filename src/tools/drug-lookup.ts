/**
 * pharmgkb_drug_lookup — Search drugs by name in PharmGKB.
 *
 * Fetches /data/drug?name={name}&view=max and returns drug details
 * with cross-references, dosing guidelines, and label annotations.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pharmgkbFetch } from "../lib/http";
import {
    shouldStage,
    stageToDoAndRespond,
} from "@bio-mcp/shared/staging/utils";

interface DrugLookupEnv {
    PHARMGKB_DATA_DO?: {
        idFromName(name: string): unknown;
        get(id: unknown): { fetch(req: Request): Promise<Response> };
    };
}

interface PharmGKBDrug {
    id?: string;
    name?: string;
    objCls?: string;
    genericNames?: string[];
    tradeNames?: string[];
    crossReferences?: unknown[];
    dosageGuidelines?: unknown[];
    [key: string]: unknown;
}

interface PharmGKBResponse {
    data?: PharmGKBDrug[];
    status?: string;
}

export function registerDrugLookup(server: McpServer, env?: DrugLookupEnv) {
    server.registerTool(
        "pharmgkb_drug_lookup",
        {
            title: "PharmGKB Drug Lookup",
            description:
                "Search PharmGKB for pharmacogenomic drug information by drug name. " +
                "Returns drug details including generic/trade names, cross-references " +
                "to DrugBank, RxNorm, ATC, and links to dosing guidelines and drug labels.",
            inputSchema: {
                name: z
                    .string()
                    .min(1)
                    .describe(
                        "Drug name to search for (e.g., warfarin, clopidogrel, imatinib, codeine)",
                    ),
            },
        },
        async (rawArgs, extra) => {
            const envToUse = env || (extra as any)?.env;
            try {
                const { name } = rawArgs as { name: string };

                const response = await pharmgkbFetch("/data/drug", {
                    name,
                    view: "max",
                });

                if (!response.ok) {
                    const body = await response.text().catch(() => "");
                    throw new Error(
                        `PharmGKB API error: HTTP ${response.status}${body ? ` - ${body.slice(0, 300)}` : ""}`,
                    );
                }

                const json = (await response.json()) as PharmGKBResponse;
                const drugs = json.data ?? [];

                if (drugs.length === 0) {
                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: `No drugs found in PharmGKB for "${name}".`,
                            },
                        ],
                        structuredContent: {
                            success: true,
                            data: { query: name, total: 0, results: [] },
                            _meta: { fetched_at: new Date().toISOString() },
                        },
                    };
                }

                const responseData = {
                    query: name,
                    total: drugs.length,
                    results: drugs,
                    fetched_at: new Date().toISOString(),
                };

                // Stage if large
                const responseBytes = JSON.stringify(responseData).length;
                if (shouldStage(responseBytes) && envToUse?.PHARMGKB_DATA_DO) {
                    try {
                        const staged = await stageToDoAndRespond(
                            drugs,
                            envToUse.PHARMGKB_DATA_DO as any,
                            "pharmgkb_drug",
                            undefined,
                            undefined,
                            "pharmgkb",
                        );
                        const text = `Found ${drugs.length} drug(s) for "${name}". Data staged (${staged.totalRows ?? 0} rows). Use pharmgkb_query_data with data_access_id '${staged.dataAccessId}'.`;
                        return {
                            content: [{ type: "text" as const, text }],
                            structuredContent: {
                                success: true,
                                data: {
                                    staged: true,
                                    data_access_id: staged.dataAccessId,
                                    query: name,
                                    total: drugs.length,
                                    tables_created: staged.tablesCreated,
                                    total_rows: staged.totalRows,
                                },
                                _meta: {
                                    fetched_at: new Date().toISOString(),
                                    staged: true,
                                    data_access_id: staged.dataAccessId,
                                },
                                _staging: staged._staging,
                            },
                        };
                    } catch {
                        // fall through to inline
                    }
                }

                // Build summary text
                const drugSummaries = drugs.map((d) => {
                    const parts = [`${d.name ?? "Unknown"} (${d.id ?? "no ID"})`];
                    if (d.genericNames?.length) {
                        parts.push(`Generic: ${d.genericNames.join(", ")}`);
                    }
                    if (d.tradeNames?.length) {
                        parts.push(`Trade: ${d.tradeNames.slice(0, 5).join(", ")}${d.tradeNames.length > 5 ? "..." : ""}`);
                    }
                    if (d.dosageGuidelines && Array.isArray(d.dosageGuidelines)) {
                        parts.push(`Dosing guidelines: ${d.dosageGuidelines.length}`);
                    }
                    return parts.join(" | ");
                });

                const text = `Found ${drugs.length} drug(s) for "${name}":\n${drugSummaries.join("\n")}`;

                return {
                    content: [{ type: "text" as const, text }],
                    structuredContent: {
                        success: true,
                        data: responseData,
                        _meta: {
                            fetched_at: new Date().toISOString(),
                            total: drugs.length,
                        },
                    },
                };
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                return {
                    content: [{ type: "text" as const, text: `Error: ${msg}` }],
                    isError: true,
                    structuredContent: {
                        success: false,
                        error: { code: "API_ERROR", message: msg },
                    },
                };
            }
        },
    );
}
