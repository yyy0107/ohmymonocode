import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";

export type GlassMaterial = "frosted" | "solid";

/**
 * The surface behind sheets, modals and popovers: 16px corner, skin shadow,
 * at most 85vh. Frosted blurs what is behind it over a translucent raised
 * fill; solid is an opaque menu fill. Open/close and focus stay with the
 * owning component.
 */
export function GlassPanel({
  material = "frosted",
  className,
  ...props
}: ComponentPropsWithRef<"div"> & { material?: GlassMaterial }) {
  return (
    <div
      {...props}
      data-material={material}
      className={cx("omb-glass-panel", className)}
    />
  );
}
