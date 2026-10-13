import { type ReactNode, useSyncExternalStore } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { basename } from "../../../platform/tauri/fs";
import { projectKey } from "../../../shared/lib/paths";
import { looksLikeProject } from "../../projects/model/recents";
import { isChatFolder } from "../../projects/model/chatFolderPath";
import {
  loadTabGroupLabels,
  resolveTabGroupLabel,
  subscribeTabGroupLabels,
} from "../../workspace/model/tabGroups";
import {
  loadGridArcadeEnabled,
  subscribeGridArcadeEnabled,
} from "../../settings/model/settings";
import { useLockOverscroll } from "../../../shared/hooks/useLockOverscroll";
import { TerminalGridBackground } from "../../terminal/ui/TerminalGridBackground";

type Props = {
  cwd: string;
  visible?: boolean;
  composer?: ReactNode;
  hasChatBackground?: boolean;
};

export function EmptySession({
  cwd,
  visible = true,
  composer,
  hasChatBackground,
}: Props) {
  const { t } = useTranslation();
  const lockOverscroll = useLockOverscroll<HTMLDivElement>();
  const arcadeEnabled = useSyncExternalStore(
    subscribeGridArcadeEnabled,
    loadGridArcadeEnabled,
    () => true,
  );
  const getProjectLabel = () =>
    looksLikeProject(cwd) && !isChatFolder(cwd)
      ? resolveTabGroupLabel(
          projectKey(cwd),
          loadTabGroupLabels(),
          basename(cwd),
        )
      : null;
  const project = useSyncExternalStore(
    subscribeTabGroupLabels,
    getProjectLabel,
    getProjectLabel,
  );
  const title = project
    ? t("What should we work on in {project}?", { project })
    : t("What should we work on?");

  return (
    <div
      ref={lockOverscroll}
      className="desktop-empty-session relative flex h-full min-h-0 overflow-y-auto overscroll-none"
    >
      {arcadeEnabled && !hasChatBackground ? (
        <TerminalGridBackground visible={visible} />
      ) : null}
      {composer ? (
        // Desktop geometry shares the docked composer width, so sending the
        // first message does not change the input card’s horizontal position.
        <div className="desktop-empty-content pointer-events-none relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-1.5 py-12">
          <div className="desktop-empty-greeting pointer-events-auto mb-4 px-2.5">
            <img
              src="/monocode.png"
              alt=""
              aria-hidden
              draggable={false}
              className="desktop-greeting-mark hidden size-8 shrink-0 invert dark:invert-0"
            />
            <h1
              data-empty-title
              className="desktop-page-heading truncate text-lg text-content"
              title={project ? cwd : undefined}
            >
              {title}
            </h1>
          </div>

          <div className="pointer-events-auto w-full">{composer}</div>
        </div>
      ) : null}
    </div>
  );
}
