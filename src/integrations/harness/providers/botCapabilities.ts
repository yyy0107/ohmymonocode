import type { HarnessBotCapabilities } from "../core/botContext";

/** Adapter support, independent of an installed CLI's unrelated user MCP config. */
export function providerBotCapabilities(provider: string): HarnessBotCapabilities {
  const nativeSystem = ["codex", "claude", "pi", "omp"].includes(provider);
  return {
    systemInstructions: nativeSystem ? "native" : "context-block",
    mcp: "unavailable",
    toolBridge: "control-cli",
    limitations: [
      ...(!nativeSystem ? ["This adapter delivers Bot instructions in a marked user context block; native system priority is unavailable."] : []),
      "The Host MCP bridge is not configured; Host actions use the scoped control CLI.",
      "Host action permissions are enforced by the control service. They do not restrict the provider's built-in tools or user MCP servers.",
    ],
  };
}
