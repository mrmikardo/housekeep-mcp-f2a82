import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    CallToolResult,
    ReadResourceResult,
    JSONRPCError
} from "@modelcontextprotocol/sdk/types.js";

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
    // Implemented later in this guide...
    return;
};

// Ensure this function responds to the <domain>/mcp path
// This can be any path you want but you'll need to ensure the
// mcp server config you use/share matches this path.
export const config = {
    path: "/mcp"
};
