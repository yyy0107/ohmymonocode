/** Host-issued metadata. It is never accepted from a public send command. */
export type HarnessBotContext = {
  scope: { botId: string; threadId: string; runId: string };
  /** Stable identity/Soul instructions only. Retrieved material belongs in user text. */
  systemInstructions: string;
  /** Stable context version, excluding current input and dynamic recall selection. */
  contextFingerprint: string;
  /** Host control actions, not a claim about a CLI's built-in tool permissions. */
  tools?: { enabledActions?: string[]; computer?: boolean };
  controlCli?: { command: string };
};

export type HarnessBotCapabilities = {
  systemInstructions: "native" | "context-block";
  /** The active Host bridge, not whether the CLI can load unrelated user MCPs. */
  mcp: "native" | "unavailable";
  toolBridge: "control-cli" | "unavailable";
  limitations: string[];
};

/** Detach caller-owned objects before the asynchronous provider run begins. */
export function snapshotBotContext(context: HarnessBotContext): HarnessBotContext {
  if (!context.scope?.botId || !context.scope.threadId || !context.scope.runId ||
      typeof context.systemInstructions !== "string" || typeof context.contextFingerprint !== "string")
    throw new Error("Invalid Host Bot context");
  return Object.freeze({
    scope: Object.freeze({ ...context.scope }),
    systemInstructions: context.systemInstructions,
    contextFingerprint: context.contextFingerprint,
    ...(context.tools ? { tools: Object.freeze({ ...context.tools,
      ...(context.tools.enabledActions ? { enabledActions: Object.freeze([...context.tools.enabledActions]) as unknown as string[] } : {}),
    }) } : {}),
    ...(context.controlCli ? { controlCli: Object.freeze({ ...context.controlCli }) } : {}),
  });
}

/** Cache keys deliberately omit per-run identity and current-message recall. */
export function botContextKey(context?: HarnessBotContext): string {
  return context ? JSON.stringify([context.scope.botId, context.scope.threadId,
    context.contextFingerprint, context.systemInstructions, context.tools, context.controlCli]) : "";
}

export function botContextPrompt(text: string, context?: HarnessBotContext): string {
  if (!context?.systemInstructions) return text;
  // JSON quoting keeps instruction text from closing the enclosing marker.
  return `<monocode_bot_context delivery="user-message-fallback">\n${JSON.stringify({ systemInstructions: context.systemInstructions }).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e")}\n</monocode_bot_context>\n\n${text}`;
}
