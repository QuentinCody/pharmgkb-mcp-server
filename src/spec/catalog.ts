/**
 * PharmGKB REST API v1 catalog for Code Mode.
 *
 * Covers ~25 endpoints across 9 categories:
 * genes, drugs, variants, clinical, labels, pathways, literature, phenotypes, automated_annotations
 *
 * PharmGKB response format: { data: [...], status: "success" }
 * Many list endpoints support view (min, max, base) plus offset/max pagination.
 */

import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

export const pharmgkbCatalog: ApiCatalog = {
    name: "PharmGKB",
    baseUrl: "https://api.pharmgkb.org/v1",
    version: "1.0.0",
    auth: "none",
    endpointCount: 25,
    notes:
        "- All list responses are wrapped in { data: [...], status: 'success' }. Access results via result.data\n" +
        "- Detail responses return { data: {object}, status: 'success' }\n" +
        "- Use 'view' param to control detail level: 'min' (IDs only), 'base' (default), 'max' (all cross-references)\n" +
        "- Many list endpoints use 'offset' (0-based) and 'max' (page size, default varies by endpoint)\n" +
        "- PharmGKB accession IDs look like PA12345 (genes), PA123456789 (drugs), PA166100001 (annotations)\n" +
        "- Gene symbols are case-sensitive (e.g., CYP2D6 not cyp2d6)\n" +
        "- Drug names are case-insensitive for search\n" +
        "- /data/clinicalAnnotation does not support server-side evidence-level filtering; use levelOfEvidence client-side when needed\n" +
        "- Clinical annotation levels: 1A, 1B, 2A, 2B, 3, 4 (1A = highest evidence)",
    endpoints: [
        // === Genes ===
        {
            method: "GET",
            path: "/data/gene",
            summary: "Search genes by symbol, name, or PharmGKB accession ID",
            category: "genes",
            coveredByTool: "pharmgkb_gene_lookup",
            queryParams: [
                { name: "symbol", type: "string", required: false, description: "Gene symbol (e.g., CYP2D6, BRCA1, VKORC1)" },
                { name: "name", type: "string", required: false, description: "Gene name keyword search" },
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset (0-based)", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },
        {
            method: "GET",
            path: "/data/gene/{accessionId}",
            summary: "Get detailed gene information by PharmGKB accession ID (e.g., PA131)",
            category: "genes",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
            ],
        },
        {
            method: "GET",
            path: "/data/gene/{accessionId}/clinicalAnnotation",
            summary: "Get clinical annotations associated with a specific gene",
            category: "genes",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },

        // === Drugs ===
        {
            method: "GET",
            path: "/data/drug",
            summary: "Search drugs by name, trade name, or PharmGKB accession ID",
            category: "drugs",
            coveredByTool: "pharmgkb_drug_lookup",
            queryParams: [
                { name: "name", type: "string", required: false, description: "Drug name (e.g., warfarin, imatinib, clopidogrel)" },
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },
        {
            method: "GET",
            path: "/data/drug/{accessionId}",
            summary: "Get detailed drug information by PharmGKB accession ID (e.g., PA452625)",
            category: "drugs",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
            ],
        },
        {
            method: "GET",
            path: "/data/drug/{accessionId}/clinicalAnnotation",
            summary: "Get clinical annotations associated with a specific drug",
            category: "drugs",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },

        // === Variants ===
        {
            method: "GET",
            path: "/data/variant",
            summary: "Search pharmacogenomic variants by gene symbol or rsID",
            category: "variants",
            queryParams: [
                { name: "location.genes.symbol", type: "string", required: false, description: "Filter by gene symbol (e.g., CYP2C19)" },
                { name: "name", type: "string", required: false, description: "Variant name or rsID (e.g., rs4244285)" },
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },
        {
            method: "GET",
            path: "/data/variant/{accessionId}",
            summary: "Get detailed variant information by PharmGKB accession ID",
            category: "variants",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
            ],
        },

        // === Clinical Annotations ===
        {
            method: "GET",
            path: "/data/clinicalAnnotation",
            summary: "Search clinical annotations — evidence linking genes/variants to drug response",
            category: "clinical",
            coveredByTool: "pharmgkb_clinical_annotations",
            queryParams: [
                { name: "location.genes.symbol", type: "string", required: false, description: "Filter by gene symbol (e.g., CYP2D6)" },
                { name: "relatedChemicals.name", type: "string", required: false, description: "Filter by drug name (e.g., codeine)" },
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
            ],
        },
        {
            method: "GET",
            path: "/data/clinicalAnnotation/{id}",
            summary: "Get a specific clinical annotation by numeric ID",
            category: "clinical",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
            ],
        },

        // === Guideline Annotations ===
        {
            method: "GET",
            path: "/data/guidelineAnnotation",
            summary: "Search CPIC/DPWG dosing guidelines for pharmacogenomic-guided prescribing",
            category: "clinical",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },
        {
            method: "GET",
            path: "/data/guidelineAnnotation/{id}",
            summary: "Get a specific dosing guideline annotation by PharmGKB ID",
            category: "clinical",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
            ],
        },

        // === Drug Labels ===
        {
            method: "GET",
            path: "/data/drugLabel",
            summary: "Search FDA/EMA drug labels with pharmacogenomic biomarker information",
            category: "labels",
            queryParams: [
                { name: "relatedChemicals.name", type: "string", required: false, description: "Filter by drug name (e.g., warfarin)" },
                { name: "relatedGenes.symbol", type: "string", required: false, description: "Filter by gene symbol (e.g., CYP2C9)" },
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },
        {
            method: "GET",
            path: "/data/drugLabel/{id}",
            summary: "Get a specific drug label by PharmGKB ID",
            category: "labels",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
            ],
        },

        // === Pathways ===
        {
            method: "GET",
            path: "/data/pathway",
            summary: "Search pharmacokinetic and pharmacodynamic pathways",
            category: "pathways",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },
        {
            method: "GET",
            path: "/data/pathway/{accessionId}",
            summary: "Get detailed pathway information by PharmGKB accession ID",
            category: "pathways",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
            ],
        },

        // === Literature ===
        {
            method: "GET",
            path: "/data/literature/{pmid}",
            summary: "Get PharmGKB literature annotation info for a PubMed article",
            category: "literature",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
            ],
        },

        // === Phenotypes ===
        {
            method: "GET",
            path: "/data/phenotype",
            summary: "Search phenotypes/diseases in PharmGKB",
            category: "phenotypes",
            queryParams: [
                { name: "name", type: "string", required: false, description: "Phenotype/disease name (e.g., hypertension)" },
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },
        {
            method: "GET",
            path: "/data/phenotype/{accessionId}",
            summary: "Get detailed phenotype/disease information by PharmGKB accession ID",
            category: "phenotypes",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
            ],
        },
        {
            method: "GET",
            path: "/data/phenotype/{accessionId}/clinicalAnnotation",
            summary: "Get clinical annotations associated with a specific phenotype",
            category: "phenotypes",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },

        // === Automated Annotations ===
        {
            method: "GET",
            path: "/data/automatedAnnotation",
            summary: "Search automated (text-mined) annotations linking genes, drugs, and diseases",
            category: "automated_annotations",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },
        {
            method: "GET",
            path: "/data/automatedAnnotation/{id}",
            summary: "Get a specific automated annotation by ID",
            category: "automated_annotations",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
            ],
        },

        // === Very Important Pharmacogenes (VIP) ===
        {
            method: "GET",
            path: "/data/gene/{accessionId}/variant",
            summary: "Get all pharmacogenomic variants for a specific gene",
            category: "genes",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },
        {
            method: "GET",
            path: "/data/variant/{accessionId}/clinicalAnnotation",
            summary: "Get clinical annotations for a specific variant",
            category: "variants",
            queryParams: [
                { name: "view", type: "string", required: false, description: "Detail level: min, base, max", default: "base" },
                { name: "offset", type: "number", required: false, description: "Pagination offset", default: 0 },
                { name: "max", type: "number", required: false, description: "Max results per page", default: 25 },
            ],
        },
    ],
};
