/**
 * pharmgkb_clinical_annotations — Get clinical annotations for gene/drug combinations.
 *
 * Fetches /data/clinicalAnnotation with filters for gene symbol, drug name,
 * and evidence level. May return many results — uses staging for large responses.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pharmgkbFetch } from "../lib/http";
import {
    shouldStage,
    stageToDoAndRespond,
} from "@bio-mcp/shared/staging/utils";

interface ClinicalAnnotationsEnv {
    PHARMGKB_DATA_DO?: {
        idFromName(name: string): unknown;
        get(id: unknown): { fetch(req: Request): Promise<Response> };
    };
}

interface ClinicalAnnotation {
    id?: number;
    level?: string;
    type?: string;
    location?: { genes?: Array<{ symbol?: string }> };
    relatedChemicals?: Array<{ name?: string }>;
    phenotypes?: Array<{ name?: string }>;
    [key: string]: unknown;
}

interface PharmGKBResponse {
    data?: ClinicalAnnotation[];
    status?: string;
}

export function registerClinicalAnnotations(
    server: McpServer,
    env?: ClinicalAnnotationsEnv,
) {
    server.registerTool(
        "pharmgkb_clinical_annotations",
        {
            title: "PharmGKB Clinical Annotations",
            description:
                "Get clinical annotations from PharmGKB that link genetic variants to drug response. " +
                "Filter by gene symbol, drug name, and/or evidence level (1A highest to 4 lowest). " +
                "Returns variant-drug-phenotype associations with clinical significance.",
            inputSchema: {
                gene: z
                    .string()
                    .optional()
                    .describe(
                        "Gene symbol to filter by (e.g., CYP2D6, CYP2C19, VKORC1)",
                    ),
                drug: z
                    .string()
                    .optional()
                    .describe(
                        "Drug name to filter by (e.g., warfarin, codeine, clopidogrel)",
                    ),
                level: z
                    .enum(["1A", "1B", "2A", "2B", "3", "4"])
                    .optional()
                    .describe(
                        "Evidence level filter: 1A (highest, CPIC guideline), 1B, 2A, 2B, 3, 4 (lowest)",
                    ),
                offset: z
                    .coerce.number()
                    .int()
                    .min(0)
                    .default(0)
                    .optional()
                    .describe("Pagination offset (default: 0)"),
                max: z
                    .coerce.number()
                    .int()
                    .positive()
                    .max(100)
                    .default(25)
                    .optional()
                    .describe("Maximum results per page (default: 25, max: 100)"),
            },
        },
        async (rawArgs, extra) => {
            const envToUse = env || (extra as any)?.env;
            try {
                const {
                    gene,
                    drug,
                    level,
                    offset = 0,
                    max = 25,
                } = rawArgs as {
                    gene?: string;
                    drug?: string;
                    level?: string;
                    offset?: number;
                    max?: number;
                };

                if (!gene && !drug && !level) {
                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: "Error: At least one filter must be provided: gene, drug, or level.",
                            },
                        ],
                        isError: true,
                        structuredContent: {
                            success: false,
                            error: {
                                code: "INVALID_ARGUMENTS",
                                message:
                                    "At least one filter must be provided: gene, drug, or level.",
                            },
                        },
                    };
                }

                const params: Record<string, unknown> = {
                    view: "max",
                    offset,
                    max,
                };
                if (gene) params["location.genes.symbol"] = gene;
                if (drug) params["relatedChemicals.name"] = drug;
                if (level) params.level = level;

                const response = await pharmgkbFetch(
                    "/data/clinicalAnnotation",
                    params,
                );

                if (!response.ok) {
                    const body = await response.text().catch(() => "");
                    throw new Error(
                        `PharmGKB API error: HTTP ${response.status}${body ? ` - ${body.slice(0, 300)}` : ""}`,
                    );
                }

                const json = (await response.json()) as PharmGKBResponse;
                const annotations = json.data ?? [];

                const filterDesc = [
                    gene ? `gene=${gene}` : "",
                    drug ? `drug=${drug}` : "",
                    level ? `level=${level}` : "",
                ]
                    .filter(Boolean)
                    .join(", ");

                if (annotations.length === 0) {
                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: `No clinical annotations found for ${filterDesc}.`,
                            },
                        ],
                        structuredContent: {
                            success: true,
                            data: {
                                filters: { gene, drug, level },
                                total: 0,
                                results: [],
                            },
                            _meta: { fetched_at: new Date().toISOString() },
                        },
                    };
                }

                const responseData = {
                    filters: { gene, drug, level },
                    total: annotations.length,
                    offset,
                    max,
                    results: annotations,
                    fetched_at: new Date().toISOString(),
                };

                // Stage if large
                const responseBytes = JSON.stringify(responseData).length;
                if (shouldStage(responseBytes) && envToUse?.PHARMGKB_DATA_DO) {
                    try {
                        const staged = await stageToDoAndRespond(
                            annotations,
                            envToUse.PHARMGKB_DATA_DO as any,
                            "clinical_annotation",
                            undefined,
                            undefined,
                            "pharmgkb",
                        );
                        const text = `Found ${annotations.length} clinical annotation(s) for ${filterDesc}. Data staged (${staged.totalRows ?? 0} rows). Use pharmgkb_query_data with data_access_id '${staged.dataAccessId}'.`;
                        return {
                            content: [{ type: "text" as const, text }],
                            structuredContent: {
                                success: true,
                                data: {
                                    staged: true,
                                    data_access_id: staged.dataAccessId,
                                    filters: { gene, drug, level },
                                    total: annotations.length,
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
                const annotationSummaries = annotations.slice(0, 10).map((a) => {
                    const genes =
                        a.location?.genes?.map((g) => g.symbol).join(", ") ?? "?";
                    const drugs =
                        a.relatedChemicals?.map((c) => c.name).join(", ") ?? "?";
                    const phenotypes =
                        a.phenotypes?.map((p) => p.name).join(", ") ?? "";
                    return `[Level ${a.level ?? "?"}] ${genes} / ${drugs}${phenotypes ? ` - ${phenotypes}` : ""} (ID: ${a.id ?? "?"})`;
                });

                const text =
                    `Found ${annotations.length} clinical annotation(s) for ${filterDesc}:\n` +
                    annotationSummaries.join("\n") +
                    (annotations.length > 10
                        ? `\n... and ${annotations.length - 10} more`
                        : "");

                return {
                    content: [{ type: "text" as const, text }],
                    structuredContent: {
                        success: true,
                        data: responseData,
                        _meta: {
                            fetched_at: new Date().toISOString(),
                            total: annotations.length,
                            returned: annotations.length,
                        },
                    },
                };
            } catch (error) {
                const msg =
                    error instanceof Error ? error.message : String(error);
                return {
                    content: [
                        { type: "text" as const, text: `Error: ${msg}` },
                    ],
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
