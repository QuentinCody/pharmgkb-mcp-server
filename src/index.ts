import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGeneLookup } from "./tools/gene-lookup";
import { registerDrugLookup } from "./tools/drug-lookup";
import { registerClinicalAnnotations } from "./tools/clinical-annotations";
import { registerQueryData } from "./tools/query-data";
import { registerGetSchema } from "./tools/get-schema";
import { registerCodeMode } from "./tools/code-mode";
import { PharmgkbDataDO } from "./do";

// Export Durable Object classes
export { PharmgkbDataDO };

interface PharmgkbEnv {
    PHARMGKB_DATA_DO: DurableObjectNamespace;
    CODE_MODE_LOADER: WorkerLoader;
}

export class MyMCP extends McpAgent {
    server: any = new McpServer({
        name: "pharmgkb",
        version: "0.1.0",
    });

    async init() {
        const env = this.env as unknown as PharmgkbEnv;
        registerGeneLookup(this.server, env);
        registerDrugLookup(this.server, env);
        registerClinicalAnnotations(this.server, env);
        registerQueryData(this.server, env);
        registerGetSchema(this.server, env);
        registerCodeMode(this.server, env);
    }
}

export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const url = new URL(request.url);

        if (url.pathname === "/health") {
            return new Response("ok", {
                status: 200,
                headers: { "content-type": "text/plain" },
            });
        }

        if (url.pathname === "/sse" || url.pathname === "/sse/message") {
            return MyMCP.serveSSE("/sse", { binding: "MCP_OBJECT" }).fetch(request, env, ctx);
        }

        if (url.pathname === "/mcp") {
            return MyMCP.serve("/mcp", { binding: "MCP_OBJECT" }).fetch(request, env, ctx);
        }

        return new Response("Not found", { status: 404 });
    },
};
