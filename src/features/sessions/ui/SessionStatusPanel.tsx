import {
  useEffect,
  useLayoutEffect,
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
  Check,
  CircleAlert,
  ChevronRight,
  FileScript,
  FoldVertical,
  Gauge,
  GitCompare,
  ListEnd,
  Maximize2,
  Terminal,
} from "../../../shared/ui/icons";
import { GlassBackdrop } from "../../../app/shell/GlassBackdrop";
import { useSessionHeaderActions } from "../../workspace/ui/SessionHeaderActions";
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
    () => reducedMotionQuery().matches,
    () => false,
  );
}

export function SessionStatusPanel({
  sessionId,
  blocks,
  backgroundTasks,
  busy,
  git,
  scope,
  onNavigate,
  onOpenAgent,
}: {
  sessionId: string;
  blocks: Block[];
  backgroundTasks?: string[];
  busy: boolean;
  git: SessionStatusGit | null;
  scope: RefObject<HTMLElement | null>;
  onNavigate: (blockId: string) => void;
  onOpenAgent?: (block: Block) => void;
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
  const summaryRef = useRef<HTMLButtonElement>(null);
  const [summaryWidth, setSummaryWidth] = useState<number>();
  useLayoutEffect(() => {
    const summary = summaryRef.current;
    if (!summary || summaryKind !== "git") return;
    // Measure the summary independently of the details retained during closing.
    // Both width endpoints must be lengths: max-content cannot transition.
    const measure = () =>
      setSummaryWidth(summary.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(summary);
    return () => observer.disconnect();
  }, [model.hasContent, summaryKind]);
  const reduced = useReducedMotion();
  const { t: uiT } = useTranslation();
  const toggle = (next: boolean) => {
    overrides.set(sessionId, next);
    setOverride(next);
  };
  if (!model.hasContent) return null;
  return (
    <div className="pointer-events-none absolute top-2 right-3 z-30 flex w-[min(32rem,calc(100%_-_24px))] flex-col items-end gap-2">
      {model.hasContent ? (
        <aside
          aria-label={uiT("Status")}
          data-session-status
          data-state={expanded ? "expanded" : "collapsed"}
          className={`pointer-events-auto relative isolate max-w-full overflow-hidden border border-content/10 text-content shadow-xl ${
            expanded ? "rounded-2xl" : "rounded-[17px]"
          }`}
          style={{
            width: expanded
              ? "20rem"
              : summaryKind === "git" && summaryWidth !== undefined
                ? `calc(${summaryWidth}px + 2px)`
                : "15rem",
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
              summaryRef={summaryRef}
              onToggle={() => toggle(!expanded)}
            />
            <AnimatedCollapse
              expanded={expanded}
              motion="height"
              durationMs={MOTION_MS}
              className="min-h-0"
            >
              <div data-status-scroll className="max-h-[calc(min(64dvh,32rem)_-_34px)] overflow-x-hidden overflow-y-auto px-1.5 pb-1.5">
                <PanelSections
                  model={model}
                  onNavigate={onNavigate}
                  onOpenAgent={
                    onOpenAgent
                      ? (blockId) => {
                          const block = blocks.find(
                            (entry) => entry.id === blockId,
                          );
                          if (block) onOpenAgent(block);
                        }
                      : undefined
                  }
                />
              </div>
            </AnimatedCollapse>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function PanelHeader({
  model,
  expanded,
  summaryRef,
  onToggle,
}: {
  model: SessionStatusPanelModel;
  expanded: boolean;
  summaryRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  const { t: uiT } = useTranslation();
  return (
    <div data-status-header className="relative h-8 shrink-0">
      <button
        ref={summaryRef}
        type="button"
        title={uiT("Show status")}
        aria-label={uiT("Show status")}
        aria-expanded={false}
        aria-hidden={expanded || undefined}
        inert={expanded}
        onClick={onToggle}
        className={`group/status-summary flex h-8 min-w-0 items-center gap-2 px-3 text-left text-[12px] text-content/75 hover:text-content ${
          sessionStatusSummary(model)?.kind === "git" ? "w-max" : "w-full"
        }${expanded ? " invisible" : ""}`}
      >
        <SummaryContent model={model} />
      </button>
      {expanded ? (
        <div className="absolute inset-0 flex items-center justify-between gap-2 pr-1 pl-3">
          <span className="text-[12px] font-semibold text-content/80">
            {uiT("Status")}
          </span>
          <button
            type="button"
            title={uiT("Collapse")}
            aria-label={uiT("Collapse")}
            aria-expanded
            onClick={onToggle}
            className="grid size-6 place-items-center rounded-md text-content/45 hover:bg-content/6 hover:text-content"
          >
            <FoldVertical className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SummaryContent({ model }: { model: SessionStatusPanelModel }) {
  const { t: uiT } = useTranslation();
  const summary = sessionStatusSummary(model);
  if (!summary) return null;
  const icon = (node: ReactNode) => (
    <span className="grid size-4 shrink-0 place-items-center text-content/55">
      <span className="col-start-1 row-start-1 grid size-4 place-items-center transition-opacity duration-150 group-hover/status-summary:opacity-0 group-focus-visible/status-summary:opacity-0 motion-reduce:transition-none [&>span]:mt-0">
        {node}
      </span>
      <Maximize2 className="col-start-1 row-start-1 size-3.5 opacity-0 transition-opacity duration-150 group-hover/status-summary:opacity-100 group-focus-visible/status-summary:opacity-100 motion-reduce:transition-none" />
    </span>
  );
  switch (summary.kind) {
    case "task":
      return (
        <>
          {icon(
            <TaskState
              status={
                summary.status === "current" ? "in_progress" : "completed"
              }
            />,
          )}
          <span className="min-w-0 flex-1 truncate">{summary.text}</span>
        </>
      );
    case "git": {
      const agents = model.subagents.length;
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
          {agents > 0 ? (
            <span className="ml-auto flex shrink-0 items-center gap-1 text-content/45">
              <Bot className="size-3" />
              <span className="font-mono text-[10px] tabular-nums">
                {agents}
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
    case "agents":
      return (
        <>
          {icon(<Bot className="size-3.5" />)}
          <span className="min-w-0 flex-1 truncate">
            {uiT(summary.count === 1 ? "{count} subagent" : "{count} subagents", { count: summary.count })}
          </span>
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
    <span className="inline-flex shrink-0 items-baseline gap-1.5 font-mono text-[11px] leading-4 font-medium tabular-nums">
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
  onNavigate,
  onOpenAgent,
}: {
  model: SessionStatusPanelModel;
  onNavigate: (blockId: string) => void;
  onOpenAgent?: (blockId: string) => void;
}) {
  const { t: uiT } = useTranslation();
  const actions = useSessionHeaderActions();
  const [moreTasks, setMoreTasks] = useState(false);
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const tasks = model.tasks;
  const span = tasks ? focusedTaskWindow(tasks) : null;
  const folded = tasks && span ? tasks.length - (span.end - span.start) : 0;
  const openChanges = () => {
    if (actions && !actions.changesOpen) actions.toggleChanges();
  };
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
        />
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
                    className="w-full rounded-md py-1 pr-2 pl-8 text-left font-mono text-[11px] text-content/45 hover:bg-content/4 hover:text-content/70"
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
            <RowButton
              key={plan.blockId}
              onClick={() => onNavigate(plan.blockId)}
            >
              <span className="min-w-0 flex-1 truncate pl-6">{plan.title}</span>
            </RowButton>
          ))}
        </Section>
      ) : null}
      {model.subagents.length ? (
        <Section
          icon={Bot}
          title={uiT(model.subagents.length === 1 ? "{count} subagent" : "{count} subagents", { count: model.subagents.length })}
          expanded={agentsExpanded}
          onClick={() => setAgentsExpanded((value) => !value)}
        >
          {model.subagents.map((agent) => (
            <RowButton
              key={agent.blockId}
              disabled={!onOpenAgent}
              title={uiT("Open subagent conversation")}
              onClick={() => onOpenAgent?.(agent.blockId)}
            >
              <span
                className="grid size-4 shrink-0 place-items-center"
                title={uiT(
                  agent.state === "pending"
                    ? "Running"
                    : agent.state === "rejected"
                      ? "Failed"
                      : "Completed",
                )}
              >
                {agent.state === "pending" ? (
                  <TerminalSpinner className="grid size-4 shrink-0 place-items-center text-[11px] leading-none select-none" />
                ) : agent.state === "rejected" ? (
                  <CircleAlert className="size-4 text-red-400" />
                ) : (
                  <Check className="size-4 text-content/45" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{agent.name}</span>
              {agent.model ? (
                <span className="min-w-0 max-w-[35%] truncate font-mono text-[10px] text-content/40" title={agent.model}>
                  {agent.model}
                </span>
              ) : null}
              <span className="shrink-0 whitespace-nowrap font-mono text-[10px] tabular-nums text-content/40">
                {uiT(agent.steps === 1 ? "{count} step" : "{count} steps", { count: agent.steps })}
              </span>
            </RowButton>
          ))}
        </Section>
      ) : null}
      {model.background.length ? (
        <Section icon={Terminal} title={uiT("Background")}>
          {model.background.map((description, index) => (
            <div
              key={`${index}:${description}`}
              className="flex min-w-0 items-center gap-2 px-2 py-1 text-[12px] leading-4 text-content/70"
            >
              <TerminalSpinner className="grid size-4 shrink-0 place-items-center text-[11px] leading-none select-none" />
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
          data-status-task
          className="flex min-w-0 items-start gap-2 px-2 py-1"
        >
          <span className="grid size-4 shrink-0 place-items-center [&>span]:mt-0">
            <TaskState status={item.status} />
          </span>
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
  expanded,
  children,
}: {
  icon: typeof GitCompare;
  title: string;
  meta?: ReactNode;
  onClick?: () => void;
  expanded?: boolean;
  children?: ReactNode;
}) {
  const hasBody = children != null;
  const headingClassName = `flex items-center gap-2 px-2 ${
    hasBody && !onClick ? "py-1" : "py-2"
  }`;
  const body = hasBody && onClick ? <div className="pb-1">{children}</div> : children;
  const HoverIcon = onClick && expanded !== undefined
    ? expanded ? FoldVertical : Maximize2
    : null;
  const heading = (
    <>
      <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center text-content/45">
        <Icon className={`col-start-1 row-start-1 size-4${HoverIcon ? " transition-opacity duration-150 group-hover/status-section:opacity-0 group-focus-visible/status-section:opacity-0 motion-reduce:transition-none" : ""}`} />
        {HoverIcon ? (
          <HoverIcon className="col-start-1 row-start-1 size-3.5 text-content/75 opacity-0 transition-opacity duration-150 group-hover/status-section:opacity-100 group-focus-visible/status-section:opacity-100 motion-reduce:transition-none" />
        ) : null}
      </span>
      <h3 className="desktop-pane-heading min-w-0 flex-1 truncate text-left text-[11.5px] leading-4 font-medium text-content/70">
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
        <ChevronRight className={`zen-disclosure-chevron size-3 shrink-0 text-content/35${expanded ? " rotate-90" : ""}`} />
      ) : null}
    </>
  );
  return (
    <section
      data-status-section
      className={`overflow-hidden rounded-[10px] border border-content/8 bg-content/[0.035]${hasBody && !onClick ? " py-1" : ""}`}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-expanded={expanded}
          className={`group/status-section ${headingClassName} w-full rounded-[9px] hover:bg-content/4`}
        >
          {heading}
        </button>
      ) : (
        <div className={headingClassName}>{heading}</div>
      )}
      {expanded === undefined ? body : (
        <AnimatedCollapse expanded={expanded} motion="height">
          {body}
        </AnimatedCollapse>
      )}
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
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "title">) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] leading-4 text-content/70 enabled:hover:bg-content/4 enabled:hover:text-content disabled:opacity-40"
      {...rest}
    >
      {children}
    </button>
  );
}
