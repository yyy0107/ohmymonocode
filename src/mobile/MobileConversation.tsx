import {
  useCallback,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from "react";
import { AgentTranscript } from "../features/sessions/ui/AgentTranscript";
import { useTranscriptLayout } from "../features/sessions/hooks/useTranscriptLayout";
import { useTranslation } from "../shared/i18n/useTranslation";
import { ArrowDownCircle } from "../shared/ui/icons";

/** The phone conversation surface, shared by chats and subagent sheet pages. */
export function MobileConversation({
  active = true,
  containerRef,
  progress = false,
  embedded = false,
  notice,
  ...transcript
}: Omit<
  ComponentProps<typeof AgentTranscript>,
  "onJumpToBottomChange" | "onJumpToBottomReady"
> & {
  active?: boolean;
  containerRef?: Ref<HTMLDivElement>;
  progress?: boolean;
  embedded?: boolean;
  notice?: ReactNode;
}) {
  const { t } = useTranslation();
  const layout = useTranscriptLayout();
  const [jump, setJump] = useState<(() => void) | undefined>();
  const [showJump, setShowJump] = useState(false);
  const onJumpReady = useCallback(
    (callback: () => void) => setJump(() => callback),
    [],
  );
  return (
    <div
      ref={containerRef}
      className="mobile-desktop-transcript"
      data-layout={layout}
      data-progress={progress}
      data-embedded={embedded || undefined}
      role="log"
      aria-label={t("Conversation")}
      aria-live={active ? "polite" : "off"}
      aria-hidden={!active || undefined}
      inert={!active}
    >
      {notice}
      <AgentTranscript
        touchScroll
        promptMotion="mobile"
        {...transcript}
        onJumpToBottomChange={setShowJump}
        onJumpToBottomReady={onJumpReady}
      />
      {showJump && (
        <button
          className="mobile-jump"
          type="button"
          aria-label={t("Jump to latest")}
          // Keep focus in the composer so tapping does not collapse it first.
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            jump?.();
          }}
        >
          <ArrowDownCircle size={22} />
        </button>
      )}
    </div>
  );
}
