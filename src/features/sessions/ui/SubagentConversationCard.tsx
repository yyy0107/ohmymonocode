import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GlassBackdrop } from "../../../app/shell/GlassBackdrop";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { ArrowLeft, Bot, X } from "../../../shared/ui/icons";
import {
  agentTranscript,
  resolveAgentBlock,
} from "../model/agentTranscript";
import type { Block } from "../model/session";
import {
  isSubagentBlock,
  subagentModelName,
  subagentName,
  toolCallLabel,
  toolCallState,
} from "../model/transcriptActivity";
import { SubagentTranscript } from "./SubagentTranscript";

/**
 * A subagent's own record, read beside the parent transcript.
 * Nested runs replace this card's conversation and keep a way back.
 */
export function SubagentConversationCard({
  blocks,
  path,
  cwd,
  onOpenFile,
  onOpenDiff,
  onOpenAgent,
  onBack,
  onClose,
}: {
  blocks: readonly Block[];
  path: readonly string[];
  cwd?: string;
  onOpenFile?: (path: string) => void;
  onOpenDiff?: (path: string) => void;
  onOpenAgent: (block: Block) => void;
  onBack?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [toolId, setToolId] = useState<string | null>(null);
  const pathKey = path.join("/");
  useEffect(() => setToolId(null), [pathKey]);
  const agent = resolveAgentBlock([...blocks], path);
  const rows = agent ? agentTranscript(agent) : [];
  const tool = toolId
    ? rows.find((row) => row.id === toolId && !isSubagentBlock(row))
    : undefined;
  const title = tool
    ? toolCallLabel(tool, cwd)
    : agent
      ? subagentName(agent)
      : t("Subagent conversation");
  const subtitle = !tool && agent
    ? [
        subagentModelName(agent),
        t(
          toolCallState(agent) === "pending"
            ? "Running"
            : toolCallState(agent) === "rejected"
              ? "Failed"
              : "Completed",
        ),
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;
  const back = tool ? () => setToolId(null) : onBack;
  const scroller = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const tail = rows.at(-1);
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node || tool || !following.current) return;
    node.scrollTop = node.scrollHeight;
  }, [pathKey, rows.length, tail?.id, tail?.text, agent?.tool?.output, tool]);

  return (
    <div
      role="dialog"
      aria-label={title}
      data-subagent-card=""
      className="relative isolate flex max-h-[min(60dvh,32rem)] min-h-40 flex-col overflow-hidden rounded-2xl border border-content/10 text-content shadow-xl"
    >
      <GlassBackdrop />
      <header className="relative z-[1] flex shrink-0 items-center gap-1.5 py-1.5 pr-1 pl-2">
        {back ? (
          <button
            type="button"
            aria-label={t("Back")}
            onClick={back}
            className="grid size-6 shrink-0 place-items-center rounded-md text-content/55 hover:bg-content/10 hover:text-content"
          >
            <ArrowLeft className="size-3.5" />
          </button>
        ) : (
          <span className="grid size-6 shrink-0 place-items-center text-content/55">
            <Bot className="size-3.5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold leading-4">
            {title}
          </span>
          {subtitle ? (
            <span className="block truncate text-[10px] leading-4 text-content/45">
              {subtitle}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          aria-label={t("Close")}
          onClick={onClose}
          className="grid size-6 shrink-0 place-items-center rounded-md text-content/45 hover:bg-content/10 hover:text-content"
        >
          <X className="size-3.5" />
        </button>
      </header>
      <div
        ref={scroller}
        className="relative z-[1] min-h-0 flex-1 overflow-y-auto"
        onScroll={(event) => {
          const node = event.currentTarget;
          following.current =
            node.scrollHeight - node.scrollTop - node.clientHeight < 60;
        }}
      >
        {tool ? (
          <ToolRecord
            block={tool}
            cwd={cwd}
            onOpenFile={onOpenFile}
            onOpenDiff={onOpenDiff}
          />
        ) : agent ? (
          <SubagentTranscript
            block={agent}
            cwd={cwd}
            onOpenAgent={onOpenAgent}
            onOpenTool={(block) => setToolId(block.id)}
            onOpenFile={onOpenFile}
          />
        ) : (
          <p className="px-4 py-3 text-[12px] text-content/50">
            {t("This subagent record is no longer available.")}
          </p>
        )}
      </div>
    </div>
  );
}

function ToolRecord({
  block,
  cwd,
  onOpenFile,
  onOpenDiff,
}: {
  block: Block;
  cwd?: string;
  onOpenFile?: (path: string) => void;
  onOpenDiff?: (path: string) => void;
}) {
  const { t } = useTranslation();
  const preview = block.tool?.preview;
  const text = (block.tool?.output || block.tool?.detail || "").trim();
  const file = preview?.path;
  const open = file
    ? () => {
        if (preview?.kind === "write" && onOpenDiff) onOpenDiff(file);
        else onOpenFile?.(file);
      }
    : undefined;
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-[13px] text-content/80">{toolCallLabel(block, cwd)}</p>
      {file && open ? (
        <button
          type="button"
          onClick={open}
          className="truncate text-left font-mono text-[12px] text-content/70 hover:text-content hover:underline"
        >
          {preview?.kind === "write" ? t("Changes") : file}
        </button>
      ) : null}
      {text ? (
        <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-content/75">
          {text}
        </pre>
      ) : null}
    </div>
  );
}
