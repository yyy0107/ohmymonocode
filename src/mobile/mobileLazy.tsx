import { lazy, Suspense, useEffect, useRef, type ComponentProps, type ComponentType } from "react";
import { useTranslation } from "../shared/i18n/useTranslation";
import { useCollapseMotion } from "../shared/ui/AnimatedCollapse";
import { MobileSheet } from "./MobileSheet";
import { SHEET_CLOSE_MS } from "./sheetDrag";

function MobileLoading() {
  const { t } = useTranslation();
  return <div className="mobile-loading" role="status">{t("Loading…")}</div>;
}

type MobileModule = () => Promise<{ default: ComponentType<any> }>;
type MobileProps<Load extends MobileModule> = ComponentProps<Awaited<ReturnType<Load>>["default"]>;

/** Keep the Suspense boundary inside the retained page/overlay lifetime. */
export function lazyMobilePage<Load extends MobileModule>(load: Load) {
  const Component = lazy(load);
  return function LazyMobilePage(props: MobileProps<Load>) {
    return <Suspense fallback={<MobileLoading />}><Component {...props} /></Suspense>;
  };
}

type SheetLifetime = { open?: boolean; onExited?: () => void; onClose: () => void };

/** A loading sheet can still close and finish its presence lifetime, even if
 * its chunk has not arrived. The loaded sheet receives the latest open state. */
export function lazyMobileSheet<Load extends MobileModule>(load: Load) {
  const Component = lazy(load);
  return function LazyMobileSheet(props: MobileProps<Load> & SheetLifetime) {
    const { t } = useTranslation();
    const open = props.open ?? true;
    // The fallback may be replaced midway through closing. Own the exit
    // lifetime above Suspense so that swap cannot lose the completion callback.
    const { foldState, finish } = useCollapseMotion(open, SHEET_CLOSE_MS);
    const wasOpen = useRef(open);
    useEffect(() => {
      if (open) wasOpen.current = true;
      else if (foldState === "closed" && wasOpen.current) {
        wasOpen.current = false;
        props.onExited?.();
      }
    }, [open, foldState, props.onExited]);
    return <Suspense fallback={
      <MobileSheet open={open} onExited={finish}
        onClose={props.onClose} title="Loading…" header={{ title: t("Loading…") }}>
        <MobileLoading />
      </MobileSheet>
    }><Component {...props} onExited={finish} /></Suspense>;
  };
}
