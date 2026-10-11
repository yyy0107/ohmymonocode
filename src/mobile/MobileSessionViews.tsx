import { memo, useCallback, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type ComponentProps } from "react";
import type { HostModelCatalog, HostSession } from "../features/connections/model/protocol";
import { withOutgoing, type OutgoingMessage } from "../features/connections/model/outgoing";
import { MeterRing } from "../features/sessions/ui/ContextMeter";
import { contextRatio } from "../features/sessions/model/contextUsage";
import { Computer } from "../shared/ui/icons";
import { useSurfaceVisibility } from "../shared/ui/SurfaceVisibility";
import { MobileTranscript } from "./MobileTranscript";
import { mobileContextUsage } from "./contextUsage";
import { useSessionSnapshot, type SessionSnapshotStore } from "./sessionSnapshotStore";
import { lazyMobileSheet } from "./mobileLazy";

const MobileSessionActions = lazyMobileSheet(async () => ({ default: (await import("./MobileSessionActions")).MobileSessionActions }));
const MobileSessionStatus = lazyMobileSheet(async () => ({ default: (await import("./MobileSessionStatus")).MobileSessionStatus }));

const identity = (snapshot: HostSession | undefined) => snapshot;

export const MobileSessionTranscript = memo(function MobileSessionTranscript({
  store, sessionId, initialSnapshot, placeholder, outgoing, ...props
}: Omit<ComponentProps<typeof MobileTranscript>, "snapshot"> & {
  store: SessionSnapshotStore;
  sessionId: string;
  initialSnapshot?: HostSession;
  placeholder?: HostSession;
  outgoing?: OutgoingMessage;
}) {
  const visible = useSurfaceVisibility() && props.active !== false;
  const retained = useRef(initialSnapshot);
  const subscribe = useCallback((listener: () => void) =>
    visible ? store.subscribe(listener) : () => {}, [store, visible]);
  const get = useCallback(() => {
    const current = store.get();
    return visible && current?.session.id === sessionId ? current : retained.current;
  }, [store, visible, sessionId]);
  const snapshot = useSyncExternalStore(subscribe, get, get);
  useLayoutEffect(() => {
    if (visible && snapshot?.session.id === sessionId) {
      retained.current = snapshot;
      store.markRendered(snapshot);
    }
  }, [store, snapshot, visible, sessionId]);
  const view = useMemo(() => snapshot?.session.id === sessionId
    ? withOutgoing(snapshot, outgoing) : placeholder, [snapshot, sessionId, outgoing, placeholder]);
  return view ? <MobileTranscript {...props} snapshot={view} /> : null;
});

export const MobileSessionContextRing = memo(function MobileSessionContextRing({
  store, catalog, loading,
}: { store: SessionSnapshotStore; catalog?: HostModelCatalog; loading: boolean }) {
  const select = useCallback((snapshot: HostSession | undefined) => loading
    ? null : contextRatio(mobileContextUsage(snapshot?.session, catalog)), [catalog, loading]);
  const ratio = useSessionSnapshot(store, select);
  return ratio === null ? <Computer size={24} /> : <MeterRing ratio={ratio} size={20} stroke={2.25} />;
});

export function MobileSnapshotActions({ store, currentSession, ...props }: Omit<
  ComponentProps<typeof MobileSessionActions>, "snapshot"
> & { store: SessionSnapshotStore; currentSession: boolean }) {
  const snapshot = useSessionSnapshot(store, identity);
  return <MobileSessionActions {...props} snapshot={currentSession ? snapshot : undefined} />;
}

export function MobileSnapshotStatus({ store, ...props }: Omit<
  ComponentProps<typeof MobileSessionStatus>, "snapshot"
> & { store: SessionSnapshotStore }) {
  const snapshot = useSessionSnapshot(store, identity);
  return snapshot ? <MobileSessionStatus {...props} snapshot={snapshot} /> : null;
}
