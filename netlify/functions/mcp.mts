import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    CallToolResult,
    ReadResourceResult,
    JSONRPCError
} from "@modelcontextprotocol/sdk/types.js";

const HOUSEKEEP_API_BASE = "https://housekeep.com/api/v1"

export default async (req: Request) => {

    try {

        // for stateless MCP, we'll only use the POST requests that are sent
        // with event information for the init phase and resource/tool requests
        if (req.method === "POST") {

            // Convert the Request object into a Node.js Request object
            const { req: nodeReq, res: nodeRes } = toReqRes(req);
            const server = getServer();

            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
            });

            await server.connect(transport);

            const body = await req.json();
            await transport.handleRequest(nodeReq, nodeRes, body);

            nodeRes.on("close", () => {
                console.log("Request closed");
                transport.close();
                server.close();
            });

            return toFetchResponse(nodeRes);

        }

        return new Response("Method not allowed", { status: 405 });

    } catch (error) {

        console.error("MCP error:", error);
        return new Response(
            JSON.stringify({
                jsonrpc: "2.0",
                error: {
                    code: -32603,
                    message: "Internal server error",
                },
                id: '',
            } satisfies JSONRPCError),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
};

function getServer(): McpServer {
    const server = new McpServer(
        {
            name: "housekeep-mcp-server",
            version: "1.0.0",
        },
        { capabilities: { logging: {} } }
    );

    server.resource(
        "getTradesServicesSummary",
            "housekeep://trades-services-summary",
        { mimeType: "text/plain" },
        async (req): Promise<ReadResourceResult> => {
            const response = await fetch(`${HOUSEKEEP_API_BASE}/work/tradespeople/v3/`);

            if (!response.ok) {
                throw new Error(`Failed to fetch trades services summary: ${response.statusText}`);
            }

            const data = await response.json()
            const text = data.sub_items
                .map(subItem => `Name: ${subItem.name}\nString identifier: ${subItem.string_identifier}`)
                .join('\n---\n')

            return {
                contents: [
                    {
                        uri: "housekeep://trades-services-summary",
                        text,
                    },
                ],
            };
        }
    )

    return server;
}

// Ensure this function responds to the <domain>/mcp path
// This can be any path you want but you'll need to ensure the
// mcp server config you use/share matches this path.
export const config = {
    path: "/mcp"
};
