import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { Modal } from "../../../shared/ui/Modal";
import { Button } from "../../../shared/ui/forms/Button";
import { SearchableSelect } from "../../../shared/ui/SearchableSelect";
import { listWslDistributions, pickWslFolder } from "../../../platform/tauri/wsl";
import { connectWslMachine, remoteRequest } from "../model/connections";
import { rememberRemoteProject } from "../model/remoteProjects";
import type { HostProject } from "../model/protocol";

export function WslConnectionDialog({ onCancel, onOpen, initialDistribution }: {
  initialDistribution?: string;
  onCancel: () => void;
  onOpen: (key: string) => void;
}) {
  const { t } = useTranslation();
  const [distributions, setDistributions] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const submitting = useRef(false);
  const cancel = () => { alive.current = false; onCancel(); };
  useEffect(() => {
    alive.current = true;
    let disposed = false;
    void listWslDistributions().then((names) => {
      if (disposed) return;
      setDistributions(names);
      setSelected(initialDistribution && names.includes(initialDistribution) ? initialDistribution : names[0] ?? "");
    }, (reason) => { if (!disposed) setError(String(reason).replace(/^Error: /, "")); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; alive.current = false; };
  }, [initialDistribution]);
  const connect = async () => {
    if (!selected || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const machine = await connectWslMachine(selected);
      if (!alive.current) return;
      const cwd = await pickWslFolder(selected, t("Open a WSL project"));
      if (!alive.current || !cwd) return;
      const project = await remoteRequest<HostProject>(machine.id, "projects.open", { cwd });
      if (alive.current) onOpen(rememberRemoteProject(machine.environmentId, project).key);
    } catch (reason) {
      if (alive.current) setError(String(reason).replace(/^Error: /, ""));
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return <Modal title={t("Open a WSL project")} onClose={cancel} size="sm">
    <div className="flex flex-col gap-3">
      <p className="text-ui-base text-content/60">{t("Choose a Linux distribution, then select a folder in the Windows system dialog. Agents run inside WSL using its installed providers and sign-ins.")}</p>
      {loading ? <p role="status">{t("Loading WSL distributions…")}</p> : distributions.length ?
        <SearchableSelect label={t("WSL distribution")} value={selected} onChange={setSelected}
          options={distributions.map((name) => ({ value: name, label: name }))} disabled={busy}
          searchPlaceholder={t("Search distributions…")} /> :
        !error ? <p>{t("No WSL distributions found. Install a Linux distribution in WSL, then try again.")}</p> : null}
      {busy ? <p role="status" className="text-ui-base text-content/60">{t("Preparing WSL… The first connection copies the MonoCode runtime into the distribution.")}</p> : null}
      {error ? <p role="alert" className="text-ui-base text-red-400">{t(error)}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={cancel}>{t("Cancel")}</Button>
        <Button disabled={loading || busy || !selected} onClick={() => void connect()}>{t("Continue")}</Button>
      </div>
    </div>
  </Modal>;
}
