import { useEffect, useRef, useState } from "react";
import type { AssistantRpc } from "../model/assistantClient";
import type { BotView } from "../model/bots";
import { ASSISTANT_ACTIONS } from "../model/assistantActions";
import { assistantErrorMessage } from "../model/assistantErrors";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { AnimatedCollapse } from "../../../shared/ui/AnimatedCollapse";
import "./desktop-bot-details.css";

type Fields = { avatar: string; workingDirectory: string; slots: string; custom: boolean; actions: string[]; computer: boolean };
const fields = (bot: BotView): Fields => ({ avatar: bot.avatar ?? "", workingDirectory: bot.workingDirectory ?? "", slots: String(bot.maxConcurrentRuns ?? 3), custom: bot.tools?.enabledActions !== undefined, actions: [...(bot.tools?.enabledActions ?? ASSISTANT_ACTIONS)], computer: bot.tools?.computer ?? false });

type Props = { bot: BotView; rpc: AssistantRpc; onSaved: () => void };
export function DesktopBotRuntimeSettings(props: Props) {
  return <RuntimeSettings key={props.bot.id} {...props} />;
}
function RuntimeSettings({ bot, rpc, onSaved }: Props) {
  const { t } = useTranslation();
  const [base, setBase] = useState(() => ({ revision: bot.revision, fields: fields(bot) }));
  const [draft, setDraft] = useState(base.fields);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [conflict, setConflict] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const command = useRef<{ signature: string; id: string } | undefined>(undefined);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base.fields);
  useEffect(() => {
    if (!dirty && !busy && !command.current && bot.revision > base.revision) {
      const next = fields(bot); setBase({ revision: bot.revision, fields: next }); setDraft(next);
    }
  }, [bot, base.revision, dirty, busy]);
  const update = (patch: Partial<Fields>) => setDraft(value => ({ ...value, ...patch }));
  const validAvatar = [...draft.avatar.trim()].length <= 8 && !/[\u0000-\u001f\u007f-\u009f]/u.test(draft.avatar);
  const slots = Number(draft.slots), validSlots = Number.isInteger(slots) && slots >= 1 && slots <= 10;
  const save = async () => {
    if (busy || !dirty || conflict || !validAvatar || !validSlots) return;
    const patch = { avatar: draft.avatar.trim(), workingDirectory: draft.workingDirectory.trim() || null, maxConcurrentRuns: slots,
      tools: { computer: draft.computer, ...(draft.custom ? { enabledActions: draft.actions } : {}) } };
    const signature = JSON.stringify([bot.id, base.revision, patch]);
    if (command.current?.signature !== signature) command.current = { signature, id: crypto.randomUUID() };
    setBusy(true); setError(undefined);
    try {
      const receipt = await rpc<{ revision: number }>("bots.configure", { botId: bot.id, commandId: command.current.id, expectedRevision: base.revision, patch });
      setBase({ revision: receipt.revision, fields: draft }); command.current = undefined; onSaved();
    } catch (cause) {
      const message = assistantErrorMessage(cause); setError(message); setConflict(/changed elsewhere/i.test(message));
    } finally { setBusy(false); }
  };
  const reload = async () => {
    setBusy(true); setError(undefined);
    try {
      const latest = await rpc<BotView>("bots.get", { botId: bot.id });
      const next = fields(latest); setBase({ revision: latest.revision, fields: next }); setDraft(next); setConflict(false); command.current = undefined;
    } catch (cause) { setError(assistantErrorMessage(cause)); }
    finally { setBusy(false); }
  };
  return <form className="desktop-bot-runtime" aria-label={t("Bot runtime settings")} onSubmit={event => { event.preventDefault(); void save(); }}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{t("Runtime")}{dirty ? " •" : ""}</button>
    <AnimatedCollapse expanded={open}><div>
    <p>{t("Changes apply to the next turn. Manage permissions in Bot settings.")}</p>
    <fieldset disabled={busy}>
      <label>{t("Avatar")}<input value={draft.avatar} maxLength={32} aria-invalid={!validAvatar || undefined} onChange={event => update({ avatar: event.target.value })} placeholder={t("Emoji or initials")} /></label>
      {!validAvatar && <small role="alert">{t("Avatar must be at most 8 characters without control characters")}</small>}
      <label>{t("Working directory")}<input value={draft.workingDirectory} onChange={event => update({ workingDirectory: event.target.value })} placeholder={t("Use a separate directory for each thread")} /></label>
      <label>{t("Concurrent runs")}<input type="number" min={1} max={10} step={1} value={draft.slots} aria-invalid={!validSlots || undefined} onChange={event => update({ slots: event.target.value })} /></label>
      {!validSlots && <small role="alert">{t("Choose between 1 and 10 concurrent runs.")}</small>}
      <label className="desktop-bot-check"><input type="checkbox" checked={draft.computer} onChange={event => update({ computer: event.target.checked })} />{t("Reserve the Host computer during this Bot's runs")}</label>
      <button type="button" aria-expanded={toolsOpen} onClick={() => setToolsOpen(value => !value)}>{t("Host tools")}</button>
      <AnimatedCollapse expanded={toolsOpen}><div className="desktop-bot-tool-options">
        <p>{t("These choices restrict Host control actions. Provider tools and user MCP servers keep their own permissions.")}</p>
        <label className="desktop-bot-check"><input type="checkbox" checked={!draft.custom} onChange={event => update({ custom: !event.target.checked })} />{t("All permitted Host actions")}</label>
        <AnimatedCollapse expanded={draft.custom}><div className="desktop-bot-action-list">{[...new Set([...ASSISTANT_ACTIONS, ...draft.actions])].map(action => <label className="desktop-bot-check" key={action}><input type="checkbox" checked={draft.actions.includes(action)} onChange={event => update({ actions: event.target.checked ? [...draft.actions, action] : draft.actions.filter(item => item !== action) })} /><span>{action}</span></label>)}</div></AnimatedCollapse>
      </div></AnimatedCollapse>
    </fieldset>
    {error && <p role="alert">{t(error)}</p>}
    <footer>{dirty && <small role="status">{t("Unsaved changes")}</small>}
      <button type="button" disabled={busy} onClick={() => void reload()}>{t("Reload saved configuration")}</button>
      <button type="submit" disabled={!dirty || busy || conflict || !validAvatar || !validSlots}>{t("Save runtime settings")}</button>
    </footer>
    </div></AnimatedCollapse>
  </form>;
}
