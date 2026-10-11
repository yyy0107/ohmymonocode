import type { ComponentProps } from "react";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { MobileSheet } from "../MobileSheet";
import { Button } from "./Button";

/**
 * A bottom sheet with a grabber, title and Done. Presence, dragging, focus
 * and keyboard handling stay in MobileSheet (sheetDrag, useMobileSheetFocus);
 * this only chooses the header.
 */
export function Sheet({ title, onClose, done = true, ...props }:
  Omit<ComponentProps<typeof MobileSheet>, "header" | "placement"> & {
    /** Show a Done button that closes the sheet. */
    done?: boolean;
  }) {
  const { t } = useTranslation();
  return (
    <MobileSheet
      {...props}
      title={title}
      onClose={onClose}
      placement="bottom"
      header={{
        title: t(title),
        className: "mobile-sheet-header-done",
        action: done ? (
          <Button variant="ghost" className="min-h-9 px-3 text-m-accent-text" onClick={onClose}>
            {t("Done")}
          </Button>
        ) : undefined,
      }}
    />
  );
}
