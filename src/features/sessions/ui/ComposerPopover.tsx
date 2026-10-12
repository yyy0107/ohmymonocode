import { PresenceBoundary } from "../../../shared/ui/PresenceBoundary";
import { useRef, type ComponentProps, type ReactNode } from "react";
import { Popover } from "../../../shared/ui/Popover";
import { SurfaceVisibilityContext, useSurfaceVisibility } from "../../../shared/ui/SurfaceVisibility";
/** Composer menus retain their children while the shared popover closes. */
export function ComposerPopover({ open, enabled = true, children, className, autoFocus, onDismiss, ...props }: ComponentProps<typeof Popover> & { open: boolean; enabled?: boolean }) {
  const visible = useSurfaceVisibility();
  const retainedChildren = useRef(children);
  if (open) retainedChildren.current = children;
  if (!enabled) return <PresenceBoundary propagate>{visible && open ? <Popover {...props} className={className} autoFocus={autoFocus} onDismiss={onDismiss}>{children}</Popover> : null}</PresenceBoundary>;
  return <Popover {...props} open={open && visible} bare={enabled || props.bare}
    className={enabled ? `composer-popover ${className ?? ""}` : className}
    inert={!open || !visible} aria-hidden={!open || !visible || undefined}
    autoFocus={open && autoFocus} onDismiss={open && visible ? onDismiss : undefined}>
    <ComposerPopoverContent open={open}>{open ? children : retainedChildren.current}</ComposerPopoverContent>
  </Popover>;
}

function ComposerPopoverContent({ open, children }: { open: boolean; children: ReactNode }) {
  const visible = useSurfaceVisibility();
  return <SurfaceVisibilityContext.Provider value={visible && open}>{children}</SurfaceVisibilityContext.Provider>;
}
