import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type WslMachine = {
  id: string;
  name: string;
  endpoint: string;
  environmentId: string;
  wsl: { distribution: string };
};

export const listWslDistributions = () => invoke<string[]>("wsl_distributions");
export const connectWslDistribution = (distribution: string) =>
  invoke<WslMachine>("remote_wsl_connect", { distribution });

/** Keep the Linux path's case; only the Windows server/share names ignore case. */
export function wslFolderPath(path: string, distribution: string): string {
  const match = /^\/\/(?:wsl\.localhost|wsl\$)\/([^/]+)(\/.*)?$/i.exec(path.replace(/\\/g, "/"));
  if (!match || match[1].toLowerCase() !== distribution.toLowerCase()) {
    throw new Error("Choose a folder inside the selected WSL distribution.");
  }
  return match[2]?.replace(/\/+$/, "") || "/";
}

export async function pickWslFolder(distribution: string, title: string): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath: `\\\\wsl.localhost\\${distribution}\\`,
    title,
  });
  return selected ? wslFolderPath(selected, distribution) : null;
}
