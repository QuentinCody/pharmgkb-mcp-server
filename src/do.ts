/**
 * PharmgkbDataDO — Durable Object for staging large PharmGKB responses.
 *
 * Extends RestStagingDO with PharmGKB-specific schema hints.
 */

import { RestStagingDO } from "@bio-mcp/shared/staging/rest-staging-do";
import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";

export class PharmgkbDataDO extends RestStagingDO {
    protected getSchemaHints(data: unknown): SchemaHints | undefined {
        if (!data || typeof data !== "object") return undefined;

        if (Array.isArray(data)) {
            const sample = data[0];
            if (sample && typeof sample === "object") {
                // PharmGKB objects have objCls, id, and name fields
                if ("type" in sample && "name" in sample && ("objCls" in sample || "id" in sample)) {
                    const objCls =
                        (sample as any).objCls || (sample as any).type || "data";
                    return {
                        tableName: String(objCls).toLowerCase().replace(/\s+/g, "_"),
                        indexes: ["id", "name"],
                    };
                }

                // Clinical annotations have location and level fields
                if ("location" in sample && "level" in sample) {
                    return {
                        tableName: "clinical_annotation",
                        indexes: ["id", "level"],
                    };
                }

                // Drug labels have drug and source fields
                if ("objCls" in sample && (sample as any).objCls === "Drug Label") {
                    return {
                        tableName: "drug_label",
                        indexes: ["id", "name"],
                    };
                }

                // Guideline annotations
                if ("objCls" in sample && (sample as any).objCls === "Guideline Annotation") {
                    return {
                        tableName: "guideline_annotation",
                        indexes: ["id", "name"],
                    };
                }

                // Generic fallback for PharmGKB objects with id/name
                if ("id" in sample && "name" in sample) {
                    return {
                        tableName: "pharmgkb_data",
                        indexes: ["id", "name"],
                    };
                }
            }
        }

        return undefined;
    }
}
