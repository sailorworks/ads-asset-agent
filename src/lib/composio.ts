import { Composio } from "@composio/core";

// Initialize Composio client for server-side use
const composioApiKey = process.env.COMPOSIO_API_KEY;

if (!composioApiKey) {
  console.warn("COMPOSIO_API_KEY is not set. Composio tools will not work.");
}

export const composio = new Composio({
  apiKey: composioApiKey || "",
  toolkitVersions: {
    gemini: "latest", // Use "latest" for development, pin specific version in production
  },
});

// Helper to execute a Composio tool
export async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  userId: string = "default"
) {
  try {
    const result = await composio.tools.execute(toolName, {
      userId,
      arguments: params,
      version: "20260114_00", // Specify version per execution
    });

    if (!result.successful) {
      throw new Error(result.error || `Tool ${toolName} failed`);
    }

    return result.data;
  } catch (error) {
    console.error(`Composio tool execution error (${toolName}):`, error);
    throw error;
  }
}
