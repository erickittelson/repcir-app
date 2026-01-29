#!/usr/bin/env npx tsx
/**
 * Neon MCP Connection Diagnostic Script
 * Tests various aspects of the Neon MCP server connection
 */

import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const SERVER_ENDPOINT = "http://127.0.0.1:7242/ingest/f9417453-8d6f-45fa-9bc5-0274456ccefb";
const LOG_PATH = "/Users/erickittelson/Desktop/family-workout-app/.cursor/debug.log";

function logDebug(data: {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
}) {
  const payload = {
    sessionId: "debug-session",
    runId: "mcp-diagnostic",
    hypothesisId: data.hypothesisId || "unknown",
    location: data.location,
    message: data.message,
    data: data.data || {},
    timestamp: Date.now(),
  };

  // Write to log file (NDJSON format)
  const logLine = JSON.stringify(payload) + "\n";
  require("fs").appendFileSync(LOG_PATH, logLine, "utf8");

  // Also send via HTTP (non-blocking)
  fetch(SERVER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

async function testMcpConnection() {
  logDebug({
    location: "test-neon-mcp.ts:start",
    message: "Starting Neon MCP diagnostic",
    hypothesisId: "ALL",
  });

  // Hypothesis A: Configuration file format issue
  logDebug({
    location: "test-neon-mcp.ts:hypothesis-a",
    message: "Testing mcp.json configuration format",
    hypothesisId: "A",
  });

  try {
    const mcpConfigPath = join(homedir(), ".cursor", "mcp.json");
    const configContent = readFileSync(mcpConfigPath, "utf8");
    const config = JSON.parse(configContent);

    logDebug({
      location: "test-neon-mcp.ts:config-read",
      message: "Successfully read mcp.json",
      data: {
        hasMcpServers: !!config.mcpServers,
        hasNeon: !!config.mcpServers?.Neon,
        hasUrl: !!config.mcpServers?.Neon?.url,
        hasHeaders: !!config.mcpServers?.Neon?.headers,
        hasAuth: !!config.mcpServers?.Neon?.headers?.Authorization,
        url: config.mcpServers?.Neon?.url,
        authPrefix: config.mcpServers?.Neon?.headers?.Authorization?.substring(0, 20),
      },
      hypothesisId: "A",
    });

    if (!config.mcpServers?.Neon?.url) {
      logDebug({
        location: "test-neon-mcp.ts:config-error",
        message: "Missing URL in Neon MCP config",
        hypothesisId: "A",
      });
    }

    if (!config.mcpServers?.Neon?.headers?.Authorization) {
      logDebug({
        location: "test-neon-mcp.ts:config-error",
        message: "Missing Authorization header in Neon MCP config",
        hypothesisId: "A",
      });
    }
  } catch (error) {
    logDebug({
      location: "test-neon-mcp.ts:config-error",
      message: "Failed to read or parse mcp.json",
      data: { error: error instanceof Error ? error.message : String(error) },
      hypothesisId: "A",
    });
  }

  // Hypothesis B: API Key validity
  logDebug({
    location: "test-neon-mcp.ts:hypothesis-b",
    message: "Testing API key validity",
    hypothesisId: "B",
  });

  try {
    const mcpConfigPath = join(homedir(), ".cursor", "mcp.json");
    const configContent = readFileSync(mcpConfigPath, "utf8");
    const config = JSON.parse(configContent);
    const apiKey = config.mcpServers?.Neon?.headers?.Authorization?.replace("Bearer ", "");

    if (!apiKey) {
      logDebug({
        location: "test-neon-mcp.ts:api-key-missing",
        message: "API key not found in config",
        hypothesisId: "B",
      });
    } else {
      logDebug({
        location: "test-neon-mcp.ts:api-key-found",
        message: "API key extracted from config",
        data: {
          keyLength: apiKey.length,
          keyPrefix: apiKey.substring(0, 10),
          keyFormat: apiKey.startsWith("napi_") ? "neon-api" : "unknown",
        },
        hypothesisId: "B",
      });

      // Test API key with Neon API directly
      try {
        const neonApiResponse = await fetch("https://console.neon.tech/api/v2/projects", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });

        logDebug({
          location: "test-neon-mcp.ts:neon-api-test",
          message: "Neon API test response",
          data: {
            status: neonApiResponse.status,
            statusText: neonApiResponse.statusText,
            ok: neonApiResponse.ok,
          },
          hypothesisId: "B",
        });

        if (neonApiResponse.ok) {
          const data = await neonApiResponse.json();
          logDebug({
            location: "test-neon-mcp.ts:neon-api-success",
            message: "API key is valid",
            data: { projectCount: Array.isArray(data.projects) ? data.projects.length : 0 },
            hypothesisId: "B",
          });
        } else {
          const errorText = await neonApiResponse.text();
          logDebug({
            location: "test-neon-mcp.ts:neon-api-fail",
            message: "API key validation failed",
            data: { status: neonApiResponse.status, error: errorText.substring(0, 200) },
            hypothesisId: "B",
          });
        }
      } catch (error) {
        logDebug({
          location: "test-neon-mcp.ts:neon-api-error",
          message: "Error testing Neon API",
          data: { error: error instanceof Error ? error.message : String(error) },
          hypothesisId: "B",
        });
      }
    }
  } catch (error) {
    logDebug({
      location: "test-neon-mcp.ts:api-key-error",
      message: "Error extracting API key",
      data: { error: error instanceof Error ? error.message : String(error) },
      hypothesisId: "B",
    });
  }

  // Hypothesis C: MCP Server reachability
  logDebug({
    location: "test-neon-mcp.ts:hypothesis-c",
    message: "Testing MCP server reachability",
    hypothesisId: "C",
  });

  try {
    const mcpConfigPath = join(homedir(), ".cursor", "mcp.json");
    const configContent = readFileSync(mcpConfigPath, "utf8");
    const config = JSON.parse(configContent);
    const apiKey = config.mcpServers?.Neon?.headers?.Authorization?.replace("Bearer ", "");
    const mcpUrl = config.mcpServers?.Neon?.url;

    if (!mcpUrl) {
      logDebug({
        location: "test-neon-mcp.ts:mcp-url-missing",
        message: "MCP URL not found in config",
        hypothesisId: "C",
      });
    } else {
      logDebug({
        location: "test-neon-mcp.ts:mcp-url-found",
        message: "MCP URL extracted",
        data: { url: mcpUrl },
        hypothesisId: "C",
      });

      // Test MCP server endpoint (it will reject GET, but we can see if it's reachable)
      try {
        const mcpResponse = await fetch(mcpUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });

        logDebug({
          location: "test-neon-mcp.ts:mcp-server-test",
          message: "MCP server response",
          data: {
            status: mcpResponse.status,
            statusText: mcpResponse.statusText,
            ok: mcpResponse.ok,
            headers: Object.fromEntries(mcpResponse.headers.entries()),
          },
          hypothesisId: "C",
        });

        const responseText = await mcpResponse.text();
        logDebug({
          location: "test-neon-mcp.ts:mcp-server-response",
          message: "MCP server response body",
          data: { response: responseText.substring(0, 500) },
          hypothesisId: "C",
        });
      } catch (error) {
        logDebug({
          location: "test-neon-mcp.ts:mcp-server-error",
          message: "Error connecting to MCP server",
          data: {
            error: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
          hypothesisId: "C",
        });
      }
    }
  } catch (error) {
    logDebug({
      location: "test-neon-mcp.ts:mcp-reachability-error",
      message: "Error testing MCP server reachability",
      data: { error: error instanceof Error ? error.message : String(error) },
      hypothesisId: "C",
    });
  }

  // Hypothesis D: Protocol/Transport compatibility
  logDebug({
    location: "test-neon-mcp.ts:hypothesis-d",
    message: "Checking protocol compatibility",
    hypothesisId: "D",
  });

  try {
    const mcpConfigPath = join(homedir(), ".cursor", "mcp.json");
    const configContent = readFileSync(mcpConfigPath, "utf8");
    const config = JSON.parse(configContent);
    const mcpUrl = config.mcpServers?.Neon?.url;

    logDebug({
      location: "test-neon-mcp.ts:protocol-check",
      message: "Protocol analysis",
      data: {
        url: mcpUrl,
        isHttps: mcpUrl?.startsWith("https://"),
        isHttp: mcpUrl?.startsWith("http://"),
        usesMcpPath: mcpUrl?.includes("/mcp"),
        usesSsePath: mcpUrl?.includes("/sse"),
        transport: mcpUrl?.includes("/sse") ? "SSE" : mcpUrl?.includes("/mcp") ? "HTTP" : "unknown",
      },
      hypothesisId: "D",
    });
  } catch (error) {
    logDebug({
      location: "test-neon-mcp.ts:protocol-error",
      message: "Error checking protocol",
      data: { error: error instanceof Error ? error.message : String(error) },
      hypothesisId: "D",
    });
  }

  // Hypothesis E: Cursor-specific MCP client initialization
  logDebug({
    location: "test-neon-mcp.ts:hypothesis-e",
    message: "Checking Cursor MCP client requirements",
    hypothesisId: "E",
  });

  // Check if there are any Cursor-specific requirements
  const cursorVersion = process.env.CURSOR_VERSION || "unknown";
  const nodeVersion = process.version;

  logDebug({
    location: "test-neon-mcp.ts:cursor-env",
    message: "Environment information",
    data: {
      nodeVersion,
      cursorVersion,
      platform: process.platform,
      arch: process.arch,
    },
    hypothesisId: "E",
  });

  logDebug({
    location: "test-neon-mcp.ts:complete",
    message: "Diagnostic complete",
    hypothesisId: "ALL",
  });

  console.log("✅ Diagnostic complete. Check logs at:", LOG_PATH);
}

testMcpConnection().catch((error) => {
  logDebug({
    location: "test-neon-mcp.ts:fatal",
    message: "Fatal error in diagnostic",
    data: { error: error instanceof Error ? error.message : String(error) },
    hypothesisId: "ALL",
  });
  console.error("❌ Diagnostic failed:", error);
  process.exit(1);
});
