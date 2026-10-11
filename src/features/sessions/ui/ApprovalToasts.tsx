import { useTranslation } from "../../../shared/i18n/useTranslation";
import { CircleAlert, X } from "../../../shared/ui/icons";
import { useEffect, useState } from "react";
import { AnimatedCollapse } from "../../../shared/ui/AnimatedCollapse";
import { createPortal } from "react-dom";
import { allowsProjectNotification } from "../../notifications/model/notificationPreferences";
import { knownNotificationProject } from "../../notifications/model/notificationProjects";
import { useProjectNotificationPreferences } from "../../notifications/hooks/useProjectNotificationPreferences";
import type { ApprovalDecision } from "../../../integrations/harness";
import type { PendingApprovalNotice } from "../../notifications/model/approvalToast";
import { LAYER } from "../../../shared/lib/layers";
import {
  HARNESS_TITLE,
  sessionDisplayTitle,
  type Session,
} from "../model/session";
import { HarnessIcon } from "./HarnessIcon";

type Notice = PendingApprovalNotice & { session: Session };

type Props = {
  notices: Notice[];
  focusedSessionId?: string;
  topOffset?: number;
  onFocusSession: (sessionId: string) => void;
  onApproval: (
    sessionId: string,
    requestId: number,
    decision: ApprovalDecision,
  ) => void;
};

export function ApprovalToasts({
  notices,
  focusedSessionId,
  onFocusSession,
  onApproval,
  topOffset = 12,
}: Props) {
  useProjectNotificationPreferences();
  if (notices.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      style={{ zIndex: LAYER.toast, top: topOffset }}
      className="pointer-events-none fixed right-3 flex w-[min(360px,calc(100vw-24px))] flex-col gap-2"
    >
      {notices.map((notice) => (
        <ProjectApprovalToast
          key={`${notice.sessionId}:${notice.kind}:${notice.requestId}`}
          notice={notice}
          focused={notice.sessionId === focusedSessionId}
          onFocusSession={onFocusSession}
          onApproval={onApproval}
        />
      ))}
    </div>,
    document.body,
  );
}

function ProjectApprovalToast(props: {
  notice: Notice;
  focused: boolean;
  onFocusSession: Props["onFocusSession"];
  onApproval: Props["onApproval"];
}) {
  const path = props.notice.session.cwd;
  // The keyed gate stays mounted even while hidden. Resuming notifications
  // must not turn a pending request into a new popup.
  const [occurredAt] = useState(Date.now);
  const [dismissed, setDismissed] = useState(props.focused);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const project = knownNotificationProject(path);
  const allowed = Boolean(
    project &&
    allowsProjectNotification({
      projectId: project.id,
      category: "agentInput",
      occurredAt,
    }),
  );
  const expanded = allowed && !props.focused && !dismissed;
  useEffect(() => {
    if (props.focused) setDismissed(true);
  }, [props.focused]);
  useEffect(() => {
    if (!expanded || hovered || focusWithin) return;
    const timer = window.setTimeout(() => setDismissed(true), 8000);
    return () => window.clearTimeout(timer);
  }, [expanded, hovered, focusWithin]);

  return (
    <AnimatedCollapse expanded={expanded}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocusWithin(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setFocusWithin(false);
        }}
      >
        <ApprovalToastCard
          {...props}
          onDismiss={() => setDismissed(true)}
          onFocusSession={(id) => {
            setDismissed(true);
            props.onFocusSession(id);
          }}
        />
      </div>
    </AnimatedCollapse>
  );
}

function ApprovalToastCard({
  notice,
  onFocusSession,
  onApproval,
  onDismiss,
}: {
  notice: Notice;
  onFocusSession: (sessionId: string) => void;
  onApproval: Props["onApproval"];
  onDismiss: () => void;
}) {
  const { t: uiT } = useTranslation();
  const { session, label, requestId } = notice;
  const title = sessionDisplayTitle(session.title, session.harness);
  const harness = HARNESS_TITLE[session.harness];

  const openSession = () => onFocusSession(session.id);

  return (
    <article
      className="approval-toast pointer-events-auto relative overflow-hidden rounded-xl border border-content/20 border-dashed bg-content/10 shadow-xl backdrop-blur-xl"
      role="status"
    >
      <button
        type="button"
        onClick={openSession}
        className="flex w-full flex-col gap-2 py-3 pl-3.5 pr-9 text-left hover:bg-content/5"
      >
        <span className="flex items-center gap-2">
          <HarnessIcon harness={session.harness} className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-snug text-content">
            {title}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-amber-400">
            <CircleAlert className="size-3.5" />
            <span>
              {notice.kind === "question" ? uiT("Question") : uiT("Approval")}
            </span>
          </span>
        </span>
        <span className="line-clamp-3 text-[12px] leading-relaxed text-content/70">
          {label}
        </span>
        <span className="text-[11px] text-content/40">{harness}</span>
      </button>
      <button
        type="button"
        aria-label={uiT("Close")}
        title={uiT("Close")}
        onClick={onDismiss}
        className="absolute right-1.5 top-2 rounded p-1 text-content/50 hover:bg-content/10 hover:text-content"
      >
        <X className="size-3.5" />
      </button>
      {notice.kind === "question" ? null : (
        <div className="flex gap-2 border-t border-stroke px-3.5 py-2.5">
          <button
            type="button"
            className="flex-1 rounded-md bg-content px-2.5 py-1 text-[11px] font-medium text-background-base hover:bg-content/80"
            onClick={() => onApproval(session.id, requestId, "allow")}
          >
            {uiT("Allow")}
          </button>
          <button
            type="button"
            className="flex-1 rounded-md bg-content/10 px-2.5 py-1 text-[11px] font-medium text-content/70 hover:bg-content/20"
            onClick={() => onApproval(session.id, requestId, "deny")}
          >
            {uiT("Deny")}
          </button>
        </div>
      )}
    </article>
  );
}
