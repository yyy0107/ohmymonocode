import { useState, type ReactNode } from "react";
import type { BotConfiguration, BotPatch } from "../model/botView";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { BotAvatar } from "./BotAvatar";

export function BotIdentitySettings({ bot, busy, onSave, children }: {
  bot: BotConfiguration; busy: boolean; onSave: (patch: BotPatch) => Promise<void>; children?: ReactNode;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(bot.name), [avatar, setAvatar] = useState(bot.avatar ?? "");
  const changed = name.trim() !== bot.name || avatar !== (bot.avatar ?? "");
  return <form className="desktop-bot-identity" onSubmit={event => {
    event.preventDefault();
    if (changed && name.trim() && [...avatar].length <= 8 && !busy) void onSave({ name: name.trim(), avatar });
  }}>
    <BotAvatar bot={{ id: bot.id, avatar }} size={96} />
    <label>{t("Name")}<input value={name} maxLength={100} required disabled={busy} onChange={event => setName(event.target.value)} /></label>
    <label>{t("Avatar")}<input value={avatar} disabled={busy} onChange={event => setAvatar(event.target.value)} aria-invalid={[...avatar].length > 8 || undefined} /></label>
    <small>{t("Up to 8 characters or emoji. Leave empty for a generated avatar.")}</small>
    <button type="submit" disabled={busy || !changed || !name.trim() || [...avatar].length > 8}>{t("Save")}</button>
    {children}
  </form>;
}
