import { message } from "@tauri-apps/plugin-dialog";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useCallback } from "react";
import { releaseOrchestrationWorker } from "../../features/orchestration/model/orchestrationWorkspace";
import type { ProjectTerminalDock } from "../../features/projects/model/projectTerminal";
import type { RecentProject } from "../../features/projects/model/recents";
import { rememberProject } from "../../features/projects/model/recents";
import { rememberLoadedSession } from "../../features/sessions/data/sessionCache";
import {
  mergeHistorySummary,
  mergeProjectHistorySummary,
  summaryFromSession,
} from "../../features/sessions/data/sessionHistory";
import {
  flushSessionWrites,
  getSession,
  persistFingerprint,
  persistManualSessionTitle,
  setSessionArchived,
  setSessionLinkedWorkItem,
  setSessionPinned,
  shouldPersistSession,
  upsertSession,
  type SessionSummary,
} from "../../features/sessions/data/sessionStore";
import { archiveFocusedSession } from "../../features/sessions/model/archiveShortcut";
import {
  flushSessionCheckpoint,
  notifyReviewChanged,
} from "../../features/sessions/model/checkpoint";
import { sessionChildHarnesses } from "../../features/sessions/model/handoff";
import {
  formatSessionTitle,
  sessionDisplayTitle,
  sessionWorkCwd,
  type LinkedWorkItem,
  type Session,
} from "../../features/sessions/model/session";
import { createSessionRemover } from "../../features/sessions/model/sessionRemoval";
import { manualSessionTitle } from "../../features/sessions/model/titlePolicy";
import { type SessionDeleteChoice } from "../../features/sessions/ui/DeleteSessionDialog";
import {
  assertWorktreeFilesClosed,
  checkWorktreeRemoval,
  detachSessionWorktree,
  listWorktrees,
  removeWorktree,
  worktreeSessionIds,
} from "../../features/source-control/model/worktrees";
import { confirmCloseTerminals } from "../../features/terminal/model/terminalClose";
import {
  isFilesystemTab,
  type WorkspaceTab,
} from "../../features/workspace/model/layout";
import {
  bindHarnessSession,
  forgetHarnessSession,
  stopStreaming,
} from "../../integrations/harness";
import { SessionTitleCoordinator } from "../../integrations/harness/core/titleCoordinator";
import { isEqualOrInside, pathKey } from "../../shared/lib/paths";
import { bindResumedSessions } from "../model/appLifecycle";
import { confirmDiscardUnsaved } from "../model/confirmDiscardUnsaved";
import { filesInWorkspaceTabs } from "../model/workspaceSelectors";
import type { LinkedWorkItemPanelState } from "./workspaceTypes";

type Options = {
  sessionsRef: RefObject<Session[]>;
  history: SessionSummary[];
  sidebarCwd: string;
  titleCoordinator: RefObject<SessionTitleCoordinator | null>;
  invalidateLoadedSession: (sessionId: string) => void;
  setSessions: Dispatch<SetStateAction<Session[]>>;
  loadedSessionCache: RefObject<Map<string, Session>>;
  refreshHistory: (cwd: string, force?: boolean) => Promise<void>;
  lastPersisted: RefObject<Map<string, string>>;
  persistSession: (session: Session | undefined) => void;
  tabsRef: RefObject<WorkspaceTab[]>;
  projectTerminalsRef: RefObject<ProjectTerminalDock[]>;
  removingWorktreePaths: RefObject<Set<string>>;
  switchingWorktrees: RefObject<Map<string, string>>;
  removingSessionIds: RefObject<Set<string>>;
  pendingPersist: RefObject<Map<string, Session>>;
  stopSessionForRemoval: (sessionId: string) => Promise<Session | undefined>;
  projectCwdRef: RefObject<string>;
  setProjectCwd: Dispatch<SetStateAction<string>>;
  setRecents: Dispatch<SetStateAction<RecentProject[]>>;
  setHistory: Dispatch<SetStateAction<SessionSummary[]>>;
  setStoredLinkedSessions: Dispatch<SetStateAction<SessionSummary[]>>;
  deleteConfirmationPending: RefObject<boolean>;
  setSessionDeleteDialog: Dispatch<
    SetStateAction<
      | {
          title: string;
          unusedWorktree: string;
          resolve: (choice: SessionDeleteChoice) => void;
        }
      | undefined
    >
  >;
  tabCloseScope: "project";
  activeTabIdRef: RefObject<string>;
  dirtyFilesRef: RefObject<Set<string>>;
  sessionLoads: RefObject<Map<string, Promise<Session | null>>>;
  setDirtyFiles: Dispatch<SetStateAction<Set<string>>>;
  setTabs: Dispatch<SetStateAction<WorkspaceTab[]>>;
  activateTab: (
    id: string,
    paneId?: string | undefined,
    reason?: "session" | "workspace",
  ) => void;
  setComposerFocused: Dispatch<SetStateAction<boolean>>;
  projectTerminalFocusedRef: RefObject<boolean>;
  appViewFocusedRef: RefObject<
    | "settings"
    | "search"
    | "inbox"
    | "notes"
    | "automations"
    | "workflows"
    | "assistant"
    | "projects"
    | undefined
  >;
  paletteOpenRef: RefObject<boolean>;
  whatsNewVersionRef: RefObject<string | null>;
  setLinkedWorkItemPanels: Dispatch<
    SetStateAction<ReadonlyMap<string, LinkedWorkItemPanelState>>
  >;
};

export function useSessionHistoryActions({
  sessionsRef,
  history,
  sidebarCwd,
  titleCoordinator,
  invalidateLoadedSession,
  setSessions,
  loadedSessionCache,
  refreshHistory,
  lastPersisted,
  persistSession,
  tabsRef,
  projectTerminalsRef,
  removingWorktreePaths,
  switchingWorktrees,
  removingSessionIds,
  pendingPersist,
  stopSessionForRemoval,
  projectCwdRef,
  setProjectCwd,
  setRecents,
  setHistory,
  setStoredLinkedSessions,
  deleteConfirmationPending,
  setSessionDeleteDialog,
  tabCloseScope,
  activeTabIdRef,
  dirtyFilesRef,
  sessionLoads,
  setDirtyFiles,
  setTabs,
  activateTab,
  setComposerFocused,
  projectTerminalFocusedRef,
  appViewFocusedRef,
  paletteOpenRef,
  whatsNewVersionRef,
  setLinkedWorkItemPanels,
}: Options) {
  const onRenameHistorySession = useCallback(
    async (sessionId: string, displayTitle: string) => {
      const editedCwd =
        sessionsRef.current.find((session) => session.id === sessionId)?.cwd ??
        history.find((entry) => entry.id === sessionId)?.cwd ??
        sidebarCwd;
      const trimmed = displayTitle.trim();
      if (!trimmed) return;
      titleCoordinator.current!.cancel(sessionId);
      invalidateLoadedSession(sessionId);

      const open = sessionsRef.current.find(
        (session) => session.id === sessionId,
      );
      if (open) {
        const title = formatSessionTitle(open.harness, trimmed);
        const updated = manualSessionTitle(open, title);
        setSessions((prev) =>
          prev.map((session) => (session.id === sessionId ? updated : session)),
        );
        loadedSessionCache.current.delete(sessionId);
        await persistManualSessionTitle(updated, title).catch(() => undefined);
      } else {
        const restored = await getSession(sessionId).catch(() => null);
        if (!restored) {
          void refreshHistory(editedCwd, true);
          return;
        }
        const updated = {
          ...restored,
          ...manualSessionTitle(
            restored,
            formatSessionTitle(restored.harness, trimmed),
          ),
        };
        await persistManualSessionTitle(updated, updated.title).catch(
          () => undefined,
        );
        const saved = await upsertSession(updated).catch(() => null);
        if (saved) {
          rememberLoadedSession(loadedSessionCache.current, updated);
          lastPersisted.current.set(sessionId, persistFingerprint(updated));
        }
      }
      void refreshHistory(editedCwd, true);
    },
    [
      history,
      invalidateLoadedSession,
      persistSession,
      refreshHistory,
      sidebarCwd,
    ],
  );

  const checkOpenWorktreeFiles = useCallback((path: string) => {
    assertWorktreeFilesClosed(path, [
      ...filesInWorkspaceTabs(tabsRef.current),
      ...projectTerminalsRef.current.flatMap((dock) => dock.pane.files),
    ]);
  }, []);

  const onCheckWorktreeRemoval = useCallback(
    async (cwd: string, path: string, force: boolean) => {
      checkOpenWorktreeFiles(path);
      await checkWorktreeRemoval(cwd, path, force);
      // Re-read UI state after the native check, before deleting sessions.
      checkOpenWorktreeFiles(path);
    },
    [checkOpenWorktreeFiles],
  );

  const onRemoveWorktree = useCallback(
    async (cwd: string, path: string, force: boolean, keepSessions = false) => {
      if (removingWorktreePaths.current.has(path)) {
        throw new Error("This worktree is already being deleted.");
      }
      removingWorktreePaths.current.add(path);
      const lockedIds = new Set<string>();
      const forgottenIds = new Set<string>();
      try {
        if (
          [...switchingWorktrees.current.values()].some((target) =>
            isEqualOrInside(target, path),
          )
        ) {
          throw new Error(
            "A session is selecting this worktree. Try deleting it again once selection finishes.",
          );
        }
        await onCheckWorktreeRemoval(cwd, path, force);
        const listed = await listWorktrees(cwd);
        const tree = listed.worktrees.find(
          (entry) => pathKey(entry.path) === pathKey(path),
        );
        if (!tree) throw new Error("This worktree is no longer available.");
        const ids = worktreeSessionIds(tree, sessionsRef.current);
        if (!keepSessions && ids.length) {
          throw new Error(
            "Move or delete the sessions using this worktree first.",
          );
        }
        if (
          ids.some(
            (id) =>
              removingSessionIds.current.has(id) ||
              switchingWorktrees.current.has(id),
          )
        ) {
          throw new Error(
            "Wait for these sessions to finish changing before deleting the worktree.",
          );
        }
        for (const id of ids) {
          removingSessionIds.current.add(id);
          lockedIds.add(id);
          pendingPersist.current.delete(id);
          invalidateLoadedSession(id);
        }
        for (const id of ids) {
          await stopSessionForRemoval(id);
          const session = sessionsRef.current.find((entry) => entry.id === id);
          if (!session) continue;
          await flushSessionCheckpoint(id);
          forgottenIds.add(id);
          for (const harness of sessionChildHarnesses(session)) {
            await forgetHarnessSession(harness, id);
          }
          const latest = sessionsRef.current.find((entry) => entry.id === id);
          if (!latest) continue;
          const stopped = {
            ...stopStreaming(latest),
            busy: false,
            queueStatus: "paused" as const,
            pendingQuestion: undefined,
          };
          sessionsRef.current = sessionsRef.current.map((entry) =>
            entry.id === id ? stopped : entry,
          );
          setSessions(sessionsRef.current);
          if (shouldPersistSession(stopped)) await upsertSession(stopped);
        }
        await flushSessionWrites();
        checkOpenWorktreeFiles(path);
        const removed = await removeWorktree(cwd, path, force, keepSessions);
        const affected = new Set([...ids, ...removed.sessionIds]);
        if (isEqualOrInside(projectCwdRef.current, path)) {
          setProjectCwd(removed.projectCwd);
          setRecents(rememberProject(removed.projectCwd));
        }
        for (const id of affected) {
          invalidateLoadedSession(id);
          pendingPersist.current.delete(id);
          lastPersisted.current.delete(id);
        }
        sessionsRef.current = sessionsRef.current.map((session) =>
          affected.has(session.id)
            ? detachSessionWorktree(session, removed.projectCwd, path)
            : session,
        );
        setSessions(sessionsRef.current);
        const patchSummary = (entry: SessionSummary) =>
          affected.has(entry.id)
            ? detachSessionWorktree(entry, removed.projectCwd, path)
            : entry;
        setHistory((current) => current.map(patchSummary));
        setStoredLinkedSessions((current) => current.map(patchSummary));
        for (const id of affected) notifyReviewChanged(id);
      } catch (error) {
        // Removal may fail after idle agent processes were stopped. Rebind
        // their saved threads so the unchanged working copy can still resume.
        const kept = sessionsRef.current.filter(
          (session) => forgottenIds.has(session.id) && !session.worktreeRemoved,
        );
        bindResumedSessions(kept);
        for (const session of kept) {
          const pending = session.pendingSwitch;
          if (pending?.fromProviderSessionId) {
            bindHarnessSession(
              pending.from,
              session.id,
              pending.fromProviderSessionId,
              sessionWorkCwd(session),
              pending.fromProviderAccountId,
              session.blocks,
            );
          }
        }
        throw error;
      } finally {
        removingWorktreePaths.current.delete(path);
        for (const id of lockedIds) removingSessionIds.current.delete(id);
      }
    },
    [
      checkOpenWorktreeFiles,
      invalidateLoadedSession,
      onCheckWorktreeRemoval,
      stopSessionForRemoval,
    ],
  );

  const onRemoveHistorySession = useCallback(
    async (
      sessionId: string,
      mode: "archive" | "delete",
      skipDeleteConfirm = false,
    ): Promise<boolean> => {
      if (
        removingSessionIds.current.has(sessionId) ||
        switchingWorktrees.current.has(sessionId) ||
        deleteConfirmationPending.current
      )
        return false;
      const open = sessionsRef.current.find(
        (session) => session.id === sessionId,
      );
      const summary = history.find((entry) => entry.id === sessionId);
      const seed = open ?? summary;
      const label = seed
        ? sessionDisplayTitle(seed.title, seed.harness)
        : "this session";
      removingSessionIds.current.add(sessionId);
      let deleteWorktreePath: string | undefined;
      if (mode === "delete" && !skipDeleteConfirm) {
        deleteConfirmationPending.current = true;
        let unusedWorktree: string | undefined;
        if (seed?.worktreeCwd) {
          try {
            const { worktrees } = await listWorktrees(seed.cwd);
            const tree = worktrees.find(
              (entry) => pathKey(entry.path) === pathKey(seed.worktreeCwd!),
            );
            if (
              tree &&
              !tree.isMain &&
              !tree.locked &&
              tree.branch &&
              worktreeSessionIds(tree, sessionsRef.current).every(
                (id) => id === sessionId,
              )
            )
              unusedWorktree = tree.path;
          } catch {
            // A failed lookup must never offer filesystem cleanup.
          }
        }
        if (!unusedWorktree) {
          deleteConfirmationPending.current = false;
        } else {
          const choice = await new Promise<SessionDeleteChoice>((resolve) => {
            setSessionDeleteDialog({ title: label, unusedWorktree, resolve });
          });
          deleteConfirmationPending.current = false;
          if (!choice.confirmed) {
            removingSessionIds.current.delete(sessionId);
            return false;
          }
          if (choice.deleteWorktree) deleteWorktreePath = unusedWorktree;
        }
      }
      invalidateLoadedSession(sessionId);
      pendingPersist.current.delete(sessionId);
      try {
        const remover = createSessionRemover({
          mode,
          scope: tabCloseScope,
          replacement: {
            harness: seed?.harness ?? "cursor",
            cwd: seed?.cwd ?? sidebarCwd,
            model: seed?.model,
            runtimeMode: seed?.runtimeMode,
            modelSettings: open?.modelSettings,
          },
          workspace: {
            snapshot: () => ({
              tabs: tabsRef.current,
              sessions: sessionsRef.current,
              activeTabId: activeTabIdRef.current,
              dirtyFiles: dirtyFilesRef.current,
            }),
            apply: (change) => {
              if (change.type === "stopped") {
                const next = sessionsRef.current.map((session) =>
                  session.id === sessionId ? change.session : session,
                );
                sessionsRef.current = next;
                setSessions(next);
                return;
              }

              if (change.type === "orchestrationReleased") {
                const released = sessionsRef.current.map((session) =>
                  releaseOrchestrationWorker(session, change.leadId),
                );
                sessionsRef.current = released;
                setSessions(released);
                for (const [id, cached] of loadedSessionCache.current) {
                  if (
                    releaseOrchestrationWorker(cached, change.leadId) !== cached
                  )
                    invalidateLoadedSession(id);
                }
                // Pending reads may still carry the deleted lead's ownership.
                for (const id of sessionLoads.current.keys()) {
                  invalidateLoadedSession(id);
                }
                for (const [id, pending] of pendingPersist.current) {
                  pendingPersist.current.set(
                    id,
                    releaseOrchestrationWorker(pending, change.leadId),
                  );
                }
                const releaseSummary = (entry: SessionSummary) =>
                  entry.orchestrationLeadId === change.leadId
                    ? { ...entry, orchestrationLeadId: undefined }
                    : entry;
                setHistory((current) => current.map(releaseSummary));
                setStoredLinkedSessions((current) =>
                  current.map(releaseSummary),
                );
                return;
              }

              const { removal } = change;
              lastPersisted.current.delete(sessionId);
              pendingPersist.current.delete(sessionId);
              const closingFiles = filesInWorkspaceTabs(removal.closedTabs);
              setDirtyFiles((current) => {
                const next = new Set(current);
                for (const file of closingFiles) next.delete(file.id);
                return next;
              });
              sessionsRef.current = removal.sessions;
              tabsRef.current = removal.tabs;
              setSessions(removal.sessions);
              setTabs(removal.tabs);
              if (removal.activeTabId !== activeTabIdRef.current) {
                activateTab(removal.activeTabId);
              }
              const activeTab = removal.tabs.find(
                (tab) => tab.id === removal.activeTabId,
              );
              setComposerFocused(
                removal.sessions.some(
                  (session) => session.id === activeTab?.focusedId,
                ),
              );
              if (change.mode === "archive") {
                if (change.session && shouldPersistSession(change.session)) {
                  rememberLoadedSession(
                    loadedSessionCache.current,
                    change.session,
                  );
                }
                const archived =
                  change.savedSummary ??
                  summary ??
                  (change.session && summaryFromSession(change.session));
                if (archived) {
                  setHistory((current) =>
                    mergeHistorySummary(current, {
                      ...archived,
                      archived: true,
                    }),
                  );
                }
              } else {
                setHistory((current) =>
                  current.filter((entry) => entry.id !== sessionId),
                );
                void refreshHistory(seed?.cwd ?? sidebarCwd, true);
              }
            },
          },
          confirm: async (closedTabs, removalMode) => {
            const files = filesInWorkspaceTabs(closedTabs);
            const unsaved = files.some(
              (file) =>
                isFilesystemTab(file) && dirtyFilesRef.current.has(file.id),
            );
            if (
              unsaved &&
              !(await confirmDiscardUnsaved(
                `${removalMode === "archive" ? "Archive" : "Delete"} this conversation with unsaved files?`,
              ))
            )
              return false;
            const terminals = files.filter((file) => file.terminal);
            return (
              terminals.length === 0 || (await confirmCloseTerminals(terminals))
            );
          },
          stop: stopSessionForRemoval,
        });
        const removed = await remover.remove(sessionId);
        if (removed && deleteWorktreePath && seed) {
          try {
            await onRemoveWorktree(seed.cwd, deleteWorktreePath, false);
          } catch (error) {
            void message(
              `The session was deleted. Its worktree was kept.\n\n${String(error)}\n\nYou can manage it in Settings → Worktrees.`,
              { title: "MonoCode", kind: "warning" },
            );
          }
        }
        return removed;
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        void message(`Could not ${mode} this conversation.\n\n${detail}`, {
          title: "MonoCode",
          kind: "error",
        });
        return false;
      } finally {
        removingSessionIds.current.delete(sessionId);
      }
    },
    [
      activateTab,
      history,
      invalidateLoadedSession,
      refreshHistory,
      sidebarCwd,
      stopSessionForRemoval,
      tabCloseScope,
      onRemoveWorktree,
    ],
  );

  const onArchiveHistorySession = useCallback(
    async (sessionId: string, archived: boolean) => {
      if (archived) return onRemoveHistorySession(sessionId, "archive");
      if (removingSessionIds.current.has(sessionId)) return false;
      try {
        await setSessionArchived(sessionId, false);
        setHistory((current) =>
          current.map((entry) =>
            entry.id === sessionId ? { ...entry, archived: false } : entry,
          ),
        );
        return true;
      } catch (error) {
        void message(
          `Could not unarchive this conversation.\n\n${String(error)}`,
          {
            title: "MonoCode",
            kind: "error",
          },
        );
        return false;
      }
    },
    [onRemoveHistorySession],
  );

  const onArchiveFocusedSession = useCallback(
    (event: KeyboardEvent) => {
      archiveFocusedSession(
        event,
        {
          activeTabId: activeTabIdRef.current,
          tabs: tabsRef.current,
          sessions: sessionsRef.current,
          projectTerminalFocused: projectTerminalFocusedRef.current,
          surfaceOpen: Boolean(
            appViewFocusedRef.current ||
            paletteOpenRef.current ||
            whatsNewVersionRef.current,
          ),
        },
        (sessionId) => {
          void onArchiveHistorySession(sessionId, true);
        },
      );
    },
    [onArchiveHistorySession],
  );

  const onPinHistorySession = useCallback(
    async (sessionId: string, pinned: boolean) => {
      const open = sessionsRef.current.find(
        (session) => session.id === sessionId,
      );
      setHistory((current) => {
        const existing = current.find((entry) => entry.id === sessionId);
        if (existing) {
          return mergeProjectHistorySummary(current, { ...existing, pinned });
        }
        if (!open) return current;
        return mergeProjectHistorySummary(current, {
          ...summaryFromSession(open),
          pinned,
        });
      });
      if (open && shouldPersistSession(open)) {
        await upsertSession(open).catch(() => undefined);
      }
      await setSessionPinned(sessionId, pinned).catch(() => undefined);
    },
    [],
  );

  const onSetHistorySessionLinkedWorkItem = useCallback(
    (sessionId: string, linkedWorkItem: LinkedWorkItem | undefined) => {
      const editedCwd =
        sessionsRef.current.find((session) => session.id === sessionId)?.cwd ??
        history.find((entry) => entry.id === sessionId)?.cwd ??
        sidebarCwd;
      const previousLinkedWorkItem =
        sessionsRef.current.find((session) => session.id === sessionId)
          ?.linkedWorkItem ??
        history.find((session) => session.id === sessionId)?.linkedWorkItem;
      invalidateLoadedSession(sessionId);
      loadedSessionCache.current.delete(sessionId);

      const nextSessions = sessionsRef.current.map((session) =>
        session.id === sessionId ? { ...session, linkedWorkItem } : session,
      );
      sessionsRef.current = nextSessions;
      setSessions(nextSessions);
      setHistory((current) =>
        current.map((session) =>
          session.id === sessionId ? { ...session, linkedWorkItem } : session,
        ),
      );
      setStoredLinkedSessions((current) =>
        linkedWorkItem
          ? current.map((session) =>
              session.id === sessionId
                ? { ...session, linkedWorkItem }
                : session,
            )
          : current.filter((session) => session.id !== sessionId),
      );
      setLinkedWorkItemPanels((current) => {
        if (!current.has(sessionId)) return current;
        const next = new Map(current);
        next.delete(sessionId);
        return next;
      });

      void setSessionLinkedWorkItem(sessionId, linkedWorkItem).catch(
        (error) => {
          const rolledBackSessions = sessionsRef.current.map((session) =>
            session.id === sessionId &&
            session.linkedWorkItem === linkedWorkItem
              ? { ...session, linkedWorkItem: previousLinkedWorkItem }
              : session,
          );
          sessionsRef.current = rolledBackSessions;
          setSessions(rolledBackSessions);
          setHistory((current) =>
            current.map((session) =>
              session.id === sessionId &&
              session.linkedWorkItem === linkedWorkItem
                ? { ...session, linkedWorkItem: previousLinkedWorkItem }
                : session,
            ),
          );
          setStoredLinkedSessions((current) =>
            previousLinkedWorkItem
              ? current.map((session) =>
                  session.id === sessionId
                    ? {
                        ...session,
                        linkedWorkItem: previousLinkedWorkItem,
                      }
                    : session,
                )
              : current.filter((session) => session.id !== sessionId),
          );
          void refreshHistory(editedCwd, true);
          void message(
            `Could not update this conversation's GitHub link.\n\n${String(error)}`,
            { title: "MonoCode", kind: "error" },
          );
        },
      );
    },
    [history, invalidateLoadedSession, refreshHistory, sidebarCwd],
  );

  const onArchiveHistorySessions = useCallback(
    async (sessionIds: readonly string[], archived: boolean) => {
      for (const sessionId of sessionIds) {
        if (!(await onArchiveHistorySession(sessionId, archived))) break;
      }
    },
    [onArchiveHistorySession],
  );

  const onPinHistorySessions = useCallback(
    async (sessionIds: readonly string[], pinned: boolean) => {
      await Promise.all(
        sessionIds.map((sessionId) => onPinHistorySession(sessionId, pinned)),
      );
    },
    [onPinHistorySession],
  );

  const onDeleteWorktreeSessions = useCallback(
    async (sessionIds: readonly string[]): Promise<boolean> => {
      for (const sessionId of sessionIds) {
        if (!(await onRemoveHistorySession(sessionId, "delete", true))) {
          return false;
        }
      }
      return true;
    },
    [onRemoveHistorySession],
  );

  const onDeleteHistorySession = useCallback(
    (sessionId: string) => onRemoveHistorySession(sessionId, "delete"),
    [onRemoveHistorySession],
  );

  const onDeleteHistorySessions = useCallback(
    async (sessionIds: readonly string[]) => {
      if (sessionIds.length === 0) return;
      if (
        !window.confirm(
          `Delete ${sessionIds.length} selected conversations? This can’t be undone.`,
        )
      )
        return;
      for (const sessionId of sessionIds) {
        if (!(await onRemoveHistorySession(sessionId, "delete", true))) break;
      }
    },
    [onRemoveHistorySession],
  );
  return {
    checkOpenWorktreeFiles,
    onArchiveFocusedSession,
    onArchiveHistorySession,
    onDeleteHistorySession,
    onRenameHistorySession,
    onRemoveWorktree,
    onCheckWorktreeRemoval,
    onDeleteWorktreeSessions,
    onArchiveHistorySessions,
    onDeleteHistorySessions,
    onPinHistorySession,
    onPinHistorySessions,
    onSetHistorySessionLinkedWorkItem,
  };
}
