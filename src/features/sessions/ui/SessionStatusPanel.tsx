import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { reducedMotionQuery } from "../../../shared/lib/reducedMotion";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { AnimatedCollapse } from "../../../shared/ui/AnimatedCollapse";
import {
  Bot,
  ChevronRight,
  CloudUpload,
  FileScript,
  FoldVertical,
  Gauge,
  GitBranch,
  GitCompare,
  ListEnd,
  Terminal,
} from "../../../shared/ui/icons";
import { GlassBackdrop } from "../../../app/shell/GlassBackdrop";
import { BranchPicker } from "../../source-control/ui/BranchPicker";
import { useSessionHeaderActions } from "../../workspace/ui/SessionHeaderActions";
import { SubagentConversationCard } from "./SubagentConversationCard";
import type { Block } from "../model/session";
import {
  buildSessionStatusPanelModel,
  focusedTaskWindow,
  sessionStatusSummary,
  type SessionStatusGit,
  type SessionStatusPanelModel,
} from "../model/sessionStatusPanel";
import { taskListProgressLabel } from "../model/taskList";
import { TaskState } from "./TaskListPreview";
import { TerminalSpinner } from "./TerminalSpinner";

/** Transcript width at which the panel opens on its own, as in ZCode. */
const AUTO_EXPAND_WIDTH = 1280;
const MOTION_MS = 340;

// Manual choices outlive pane remounts but not the app; auto mode is the default.
const overrides = new Map<string, boolean>();

function useWide(scope: RefObject<HTMLElement | null>): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const element = scope.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const update = () =>
      setWide(element.getBoundingClientRect().width >= AUTO_EXPAND_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [scope]);
  return wide;
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const query = reducedMotionQuery();
      query?.addEventListener("change", listener);
      return () => query?.removeEventListener("change", listener);
    },
    () =>
      reducedMotionQuery().matches,
    () => false,
  );
}

export function SessionStatusPanel({
  sessionId,
  blocks,
  backgroundTasks,
  busy,
  git,
  cwd,
  worktree = false,
  scope,
  onNavigate,
  onOpenFile,
  onOpenDiff,
}: {
  sessionId: string;
  blocks: Block[];
  backgroundTasks?: string[];
  busy: boolean;
  git: SessionStatusGit | null;
  /** Working copy for the branch control. Absent for a host session. */
  cwd?: string;
  worktree?: boolean;
  scope: RefObject<HTMLElement | null>;
  onNavigate: (blockId: string) => void;
  onOpenFile?: (path: string) => void;
  onOpenDiff?: (path: string) => void;
}) {
  const model = useMemo(
    () => buildSessionStatusPanelModel({ blocks, backgroundTasks, busy, git }),
    [blocks, backgroundTasks, busy, git],
  );
  const wide = useWide(scope);
  const [override, setOverride] = useState(() => overrides.get(sessionId));
  useEffect(() => setOverride(overrides.get(sessionId)), [sessionId]);
  const expanded = override ?? wide;
  const summaryKind = sessionStatusSummary(model)?.kind;
  const reduced = useReducedMotion();
  const { t: uiT } = useTranslation();
  const toggle = (next: boolean) => {
    overrides.set(sessionId, next);
    setOverride(next);
  };
  const [agentPath, setAgentPath] = useState<string[] | null>(null);
  const [agentSession, setAgentSession] = useState(sessionId);
  if (agentSession !== sessionId) {
    setAgentSession(sessionId);
    setAgentPath(null);
  }
  const shownAgentPath = useRef<string[] | null>(null);
  if (agentPath) shownAgentPath.current = agentPath;

  if (!model.hasContent && !agentPath) return null;
  return (
    <div className="pointer-events-none absolute top-2 right-3 z-30 flex w-[min(32rem,calc(100%_-_24px))] flex-col items-end gap-2">
      {model.hasContent ? (
        <aside
          aria-label={uiT("Status")}
          data-state={expanded ? "expanded" : "collapsed"}
          className={`pointer-events-auto isolate max-w-full overflow-hidden border border-content/10 text-content shadow-xl ${
            expanded
              ? "w-80 rounded-2xl"
              : summaryKind === "git"
                ? "w-max max-w-full rounded-[17px]"
                : "w-60 rounded-[17px]"
          }`}
          style={{
            transition: reduced
              ? "none"
              : `width ${MOTION_MS}ms var(--collapse-easing, cubic-bezier(0.22, 1, 0.36, 1)), border-radius ${MOTION_MS}ms ease`,
          }}
        >
          <GlassBackdrop />
          <div className="relative z-[1] flex max-h-[min(64dvh,32rem)] flex-col">
            <PanelHeader
              model={model}
              expanded={expanded}
              onToggle={() => toggle(!expanded)}
            />
            <AnimatedCollapse
              expanded={expanded}
              motion="height"
              durationMs={MOTION_MS}
              className="min-h-0"
            >
              <div className="max-h-[calc(min(64dvh,32rem)_-_34px)] overflow-x-hidden overflow-y-auto px-1.5 pb-1.5">
                <PanelSections
                  model={model}
                  cwd={cwd}
                  worktree={worktree}
                  agentPath={agentPath}
                  onNavigate={onNavigate}
                  onOpenAgent={(blockId) =>
                    setAgentPath((current) =>
                      current?.length === 1 && current[0] === blockId
                        ? null
                        : [blockId],
                    )
                  }
                />
              </div>
            </AnimatedCollapse>
          </div>
        </aside>
      ) : null}
      <AnimatedCollapse
        expanded={!!agentPath}
        motion="height"
        durationMs={MOTION_MS}
        className="pointer-events-auto w-full"
      >
        {() =>
          shownAgentPath.current ? (
            <SubagentConversationCard
              blocks={blocks}
              path={shownAgentPath.current}
              cwd={cwd}
              onOpenFile={onOpenFile}
              onOpenDiff={onOpenDiff}
              onOpenAgent={(block) =>
                setAgentPath((current) =>
                  current ? [...current, block.id] : [block.id],
                )
              }
              onBack={() =>
                setAgentPath((current) =>
                  current && current.length > 1
                    ? current.slice(0, -1)
                    : null,
                )
              }
              onClose={() => setAgentPath(null)}
            />
          ) : null
        }
      </AnimatedCollapse>
    </div>
  );
}

function PanelHeader({
  model,
  expanded,
  onToggle,
}: {
  model: SessionStatusPanelModel;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t: uiT } = useTranslation();
  if (expanded) {
    return (
      <div className="flex h-8 shrink-0 items-center justify-between gap-2 pr-1 pl-3">
        <span className="text-[12px] font-semibold text-content/80">
          {uiT("Status")}
        </span>
        <button
          type="button"
          title={uiT("Collapse")}
          aria-label={uiT("Collapse")}
          aria-expanded
          onClick={onToggle}
          className="grid size-6 place-items-center rounded-md text-content/45 hover:bg-content/10 hover:text-content"
        >
          <FoldVertical className="size-3.5" />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      title={uiT("Show status")}
      aria-label={uiT("Show status")}
      aria-expanded={false}
      onClick={onToggle}
      className="flex h-8 w-full min-w-0 shrink-0 items-center gap-2 px-3 text-left text-[12px] text-content/75 hover:text-content"
    >
      <SummaryContent model={model} />
    </button>
  );
}

function SummaryContent({ model }: { model: SessionStatusPanelModel }) {
  const { t: uiT } = useTranslation();
  const summary = sessionStatusSummary(model);
  if (!summary) return null;
  const icon = (node: ReactNode) => (
    <span className="grid size-4 shrink-0 place-items-center text-content/55">
      {node}
    </span>
  );
  switch (summary.kind) {
    case "task":
      return (
        <>
          {icon(
            <TaskState
              status={summary.status === "current" ? "in_progress" : "completed"}
            />,
          )}
          <span className="min-w-0 flex-1 truncate">{summary.text}</span>
        </>
      );
    case "git": {
      const running = model.subagents.length;
      return (
        <>
          {icon(<GitCompare className="size-3.5" />)}
          <span className="shrink-0">{uiT("Changes")}</span>
          <DiffCounts
            additions={summary.additions}
            deletions={summary.deletions}
          />
          {!summary.additions && !summary.deletions && summary.files > 0 ? (
            <span className="min-w-0 truncate font-mono text-[11px] text-content/55">
              {uiT(
                summary.files === 1
                  ? "{count} file changed"
                  : "{count} files changed",
                { count: summary.files },
              )}
            </span>
          ) : null}
          {running > 0 ? (
            <span className="ml-auto flex shrink-0 items-center gap-1 text-content/45">
              <Bot className="size-3" />
              <span className="font-mono text-[10px] tabular-nums">
                {running}
              </span>
            </span>
          ) : null}
        </>
      );
    }
    case "progress":
      return (
        <>
          {icon(<ListEnd className="size-3.5" />)}
          <span className="font-mono text-[11px]">
            {summary.completed}/{summary.total}
          </span>
        </>
      );
    case "plan":
      return (
        <>
          {icon(<FileScript className="size-3.5" />)}
          <span className="min-w-0 flex-1 truncate">{summary.text}</span>
        </>
      );
    case "running": {
      const Icon =
        summary.agents && summary.background
          ? Gauge
          : summary.agents
            ? Bot
            : Terminal;
      return (
        <>
          {icon(<Icon className="size-3.5" />)}
          <span className="min-w-0 flex-1 truncate">
            {uiT("{count} running", { count: String(summary.count) })}
          </span>
        </>
      );
    }
  }
}

function DiffCounts({
  additions,
  deletions,
}: {
  additions: number;
  deletions: number;
}) {
  if (!additions && !deletions) return null;
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1.5 font-mono text-[11px] font-medium tabular-nums">
      {additions > 0 ? (
        <span className="text-emerald-400">+{additions}</span>
      ) : null}
      {deletions > 0 ? (
        <span className="text-rose-400">-{deletions}</span>
      ) : null}
    </span>
  );
}

function PanelSections({
  model,
  cwd,
  worktree,
  agentPath,
  onNavigate,
  onOpenAgent,
}: {
  model: SessionStatusPanelModel;
  cwd?: string;
  worktree: boolean;
  agentPath: string[] | null;
  onNavigate: (blockId: string) => void;
  onOpenAgent: (blockId: string) => void;
}) {
  const { t: uiT } = useTranslation();
  const actions = useSessionHeaderActions();
  const [moreTasks, setMoreTasks] = useState(false);
  const tasks = model.tasks;
  const span = tasks ? focusedTaskWindow(tasks) : null;
  const folded = tasks && span ? tasks.length - (span.end - span.start) : 0;
  const openChanges = () => {
    if (actions && !actions.changesOpen) actions.toggleChanges();
  };
  const files = model.git?.files ?? 0;
  return (
    <div className="flex flex-col gap-1.5">
      {model.git ? (
        <Section
          icon={GitCompare}
          title={uiT("Changes")}
          meta={
            <DiffCounts
              additions={model.git.additions}
              deletions={model.git.deletions}
            />
          }
          onClick={actions ? openChanges : undefined}
        >
          {cwd ? (
            <div className="px-1">
              <BranchPicker
                cwd={cwd}
                branch={model.git.branch}
                worktree={worktree}
                popoverSide="bottom"
              />
            </div>
          ) : model.git.branch ? (
            <div className="flex min-w-0 items-center gap-1 px-2 py-1 text-content/55">
              <GitBranch className="size-3 shrink-0" />
              <span className="truncate font-mono text-[11px]">
                {model.git.branch}
              </span>
            </div>
          ) : null}
          {files > 0 ? (
            <p className="px-2 py-1 text-[11px] text-content/45">
              {uiT(
                files === 1
                  ? "Uncommitted changes: {count} file"
                  : "Uncommitted changes: {count} files",
                { count: files },
              )}
            </p>
          ) : null}
          <RowButton disabled={!actions} onClick={openChanges}>
            <CloudUpload className="size-3.5 shrink-0 text-content/45" />
            <span className="min-w-0 flex-1 truncate">
              {uiT("Commit or push")}
            </span>
            <ChevronRight className="size-3 shrink-0 text-content/35" />
          </RowButton>
        </Section>
      ) : null}
      {tasks && span ? (
        <Section
          icon={ListEnd}
          title={uiT("Tasks")}
          meta={taskListProgressLabel(tasks, uiT)}
        >
          <ol>
            {folded > 0 ? (
              <>
                <AnimatedCollapse expanded={moreTasks} motion="height">
                  {() => <TaskRows items={tasks.slice(0, span.start)} />}
                </AnimatedCollapse>
                <TaskRows items={tasks.slice(span.start, span.end)} />
                <AnimatedCollapse expanded={moreTasks} motion="height">
                  {() => <TaskRows items={tasks.slice(span.end)} />}
                </AnimatedCollapse>
                <li>
                  <button
                    type="button"
                    onClick={() => setMoreTasks((value) => !value)}
                    className="w-full rounded-md px-2 py-1 text-left font-mono text-[11px] text-content/45 hover:bg-content/7 hover:text-content/70"
                  >
                    {moreTasks
                      ? uiT("Show fewer")
                      : uiT("+{count} more", { count: String(folded) })}
                  </button>
                </li>
              </>
            ) : (
              <TaskRows items={tasks} />
            )}
          </ol>
        </Section>
      ) : null}
      {model.plans.length ? (
        <Section icon={FileScript} title={uiT("Plans")}>
          {model.plans.map((plan) => (
            <RowButton key={plan.blockId} onClick={() => onNavigate(plan.blockId)}>
              <span className="min-w-0 flex-1 truncate">{plan.title}</span>
            </RowButton>
          ))}
        </Section>
      ) : null}
      {model.subagents.length ? (
        <Section icon={Bot} title={uiT("Agents")}>
          {model.subagents.map((agent) => (
            <RowButton
              key={agent.blockId}
              aria-haspopup="dialog"
              aria-expanded={agentPath?.[0] === agent.blockId}
              onClick={() => onOpenAgent(agent.blockId)}
            >
              <TerminalSpinner />
              <span className="min-w-0 flex-1 truncate">{agent.name}</span>
              {agent.model ? (
                <span className="shrink-0 font-mono text-[10px] text-content/40">
                  {agent.model}
                </span>
              ) : null}
            </RowButton>
          ))}
        </Section>
      ) : null}
      {model.background.length ? (
        <Section icon={Terminal} title={uiT("Background")}>
          {model.background.map((description, index) => (
            <div
              key={`${index}:${description}`}
              className="flex min-w-0 items-center gap-2 px-2 py-1 text-[12px] text-content/70"
            >
              <TerminalSpinner />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                {description}
              </span>
            </div>
          ))}
        </Section>
      ) : null}
    </div>
  );
}

function TaskRows({ items }: { items: SessionStatusPanelModel["tasks"] }) {
  return (
    <>
      {(items ?? []).map((item, index) => (
        <li
          key={item.id ?? `${index}:${item.text}`}
          className="flex min-w-0 items-start gap-2 px-2 py-1"
        >
          <TaskState status={item.status} />
          <span
            className={`min-w-0 flex-1 text-[12px] leading-4 ${
              item.status === "completed" || item.status === "cancelled"
                ? "text-content/40 line-through decoration-content/25"
                : item.status === "in_progress"
                  ? "text-content/85"
                  : "text-content/60"
            }`}
          >
            {item.text}
          </span>
        </li>
      ))}
    </>
  );
}

function Section({
  icon: Icon,
  title,
  meta,
  onClick,
  children,
}: {
  icon: typeof GitCompare;
  title: string;
  meta?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}) {
  const heading = (
    <>
      <Icon className="size-3.5 shrink-0 text-content/45" />
      <h3 className="min-w-0 flex-1 truncate text-left text-[11.5px] font-medium text-content/70">
        {title}
      </h3>
      {meta ? (
        typeof meta === "string" ? (
          <span className="shrink-0 rounded-full bg-content/7 px-2 py-0.5 font-mono text-[10px] text-content/50">
            {meta}
          </span>
        ) : (
          meta
        )
      ) : null}
      {onClick ? (
        <ChevronRight className="size-3 shrink-0 text-content/35" />
      ) : null}
    </>
  );
  return (
    <section className="rounded-[10px] border border-content/8 bg-content/[0.035] py-1">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex w-full items-center gap-1.5 px-2 pt-0.5 pb-1 hover:bg-content/7"
        >
          {heading}
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-2 pt-0.5 pb-1">
          {heading}
        </div>
      )}
      {children}
    </section>
  );
}

function RowButton({
  onClick,
  disabled,
  children,
  ...rest
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-expanded" | "aria-haspopup"
>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] text-content/70 enabled:hover:bg-content/7 enabled:hover:text-content disabled:opacity-40"
      {...rest}
    >
      {children}
    </button>
  );
}
