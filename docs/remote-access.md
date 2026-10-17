# Remote access (experimental)

MonoCode can run Claude Code, Codex, Cursor, Grok Build, OpenCode, Pi, OMP, fx, Hermes Agent, and Antigravity sessions on a separate Windows, Linux, or macOS host. The host owns the provider processes and session database. Closing the desktop, closing a session tab, or losing the SSH tunnel does not stop a host session.

A folder on a connected machine is a project in the rail, marked with a globe. Every session in it runs on that machine, in the same session view and composer as a local session. The Sessions sidebar lists that machine's sessions for the project.

## WSL projects on Windows

The shared WSL path is available on Windows without an environment-variable
opt-in. Provider authentication compatibility is still being validated; see
[WSL provider support](wsl-provider-support.md) for the tested scope and limitations.
The old independent WSL session Host path has been removed. Existing history
remains available when the distribution is stopped.

Choose **WSL** in the composer's environment menu and select a distribution.
This only selects the environment. Then use the project picker to choose its
project folder. The folder dialog can browse
`\\wsl.localhost\<distribution>\` (or the older `\\wsl$` form); this is
only a picker. Project files and Git operations run inside Linux through the
execution service, without using UNC filesystem access for workspace operations.
The project appears with a WSL marker and uses the same Windows shared Host,
provider selection, account list, settings and conversation database as local
projects. Its stored project path is a Linux path plus a distribution identity.
The desktop's `wsl://<encoded-distribution>/<linux-path>` value is a UI identity,
not a filesystem path passed to Windows tools.

The Windows shared Host owns WSL sessions and exposes them to paired phones
while the desktop is running. Closing a session tab leaves its process running;
quitting the desktop stops the shared Host and interrupts its WSL provider
processes. A broken execution connection ends that connection's processes.
Continuing a running turn across desktop shutdown is not implemented. SSH hosts
retain their independent session lifecycle described below.

### Execution runtime and provider versions

WSL setup uses `wsl.exe` and the distribution's default user. Bash, `wslpath`,
`flock` and `sha256sum` must be available. Windows packages include Linux Node
and an execution-only service; WSL does not need another session Host, Node
installation, SSH service or administrator privileges. Setup serializes copies
with `run/setup.lock`, verifies every file against the runtime manifest, and
publishes immutable directories under `~/.monocode/remote/host/<version>-<hash>`.
Unused runtime versions are removed during setup. The directory retains its
historical name, but new runtime packages contain no Host or session database.

The Windows Host keeps one `wsl.exe` stdio connection per distribution. Requests,
responses and process/network events share that pipe. Filesystem operations,
provider subprocesses, loopback HTTP/SSE, Git and shells run in Linux. The
service uses the private `~/.monocode/remote/run/exec.sock`; the previous Host's
`run/rpc.sock` is left untouched during migration. Application control endpoints
use connection-owned Linux loopback listeners forwarded over the same pipe to
the explicitly granted Windows loopback ports, including with WSL NAT. The Linux
control client (including `agents` and `agents-mcp`) talks to the Windows Host;
it does not own a session engine.
Children are recorded under `run/children` with their Linux process start time
and boot identity so restart cleanup cannot kill an unrelated reused PID.
Append operations retain open file handles instead of reopening a Windows-mounted
file for every line.

Claude Code, Codex and OpenCode have managed native Windows/Linux artifacts. Pi has a
managed JavaScript artifact with its dependency tree and uses the bundled Node.
The desktop
selects a configured CLI first, then an installed CLI, then its managed runtime.
The selected CLI's version determines the exact Linux version. Downloads are
checked against official npm `dist.integrity`; a mirror may supply bytes but
cannot replace that integrity metadata. Managed Windows artifacts live under
`~/.monocode-host/providers/`; verified Linux artifacts are copied once into
`~/.monocode/remote/providers/<provider>/<version>-<hash>` and checked per file.

For providers with verified shared account and session paths, an unavailable
transferable artifact can use an explicitly reported WSL-installed binary;
that fallback version is not guaranteed to match the desktop. OMP, Cursor, Grok,
fx, Hermes and Antigravity are currently blocked before runtime discovery or
execution because their desktop account/session sharing is not established.
Installing or logging into those providers inside WSL does not bypass this limit.
See the [provider distribution audit](wsl-provider-support.md) for official Linux
package sources, account-sharing restrictions and remaining verification gaps.

### Shared account directories

Claude and Codex receive the desktop account's Data Home translated through
`wslpath`, with `CLAUDE_CONFIG_DIR` or `CODEX_HOME` set explicitly. Named managed
accounts therefore share their existing account directory and file credentials.
Codex requires usable `auth.json` file storage; a system-keyring or ephemeral
account must be imported into a managed file-backed account first. Pi receives
its desktop agent directory; OpenCode receives shared desktop data, config and
state paths. Pi/OpenCode's known provider credential environment variables come
from the desktop or are explicitly cleared. SDK credential file overrides are
translated to desktop paths, including default AWS and Google ADC files, so
they cannot silently select the WSL user's default account. `HOME` and `PATH`
still belong to Linux. Catalog commands use the shared environment too;
Claude/Codex version queries do not require an `auth.json` or trigger refresh.

For Claude's default account, setting `CLAUDE_CONFIG_DIR` means Linux reads
`<Data Home>/.claude.json`, while the default Windows CLI may read
`~/.claude.json`. The first version accepts this global-configuration split;
authentication still uses the shared account directory. Named accounts do not
have that split.

Windows-only MCP commands and hooks are filtered from the Linux launch and the
session reports which entries were excluded. Claude receives an explicit strict
MCP configuration and filtered settings. Codex receives per-server disable
overrides and removes a Windows-only notification command. Linux-capable provider
and user values are preserved.

An account lock serializes application-controlled starts. It cannot coordinate
refreshes initiated internally by already-running provider processes. Codex's
app-server provides a non-inference account refresh request. Before a Codex WSL
start, an OAuth access token expiring within ten minutes triggers that request
through the desktop CLI under the same account lock. CLI login status alone does
not demonstrate refresh, and Claude auth status has no documented refresh
guarantee. Default-account authentication and one real WSL conversation have
passed for Claude Code 2.1.302, Codex 0.163.0 and Pi 1.3.0, including a Linux
`uname` tool call and Windows-readable history. All three also completed
simultaneous Windows/WSL tool rounds, followed by successful authentication checks
on both sides. Their credential files did not change during those checks, so
real refresh writeback remains unverified. No published named accounts were
available for the real-account checks; named-account behavior remains unverified.
The Codex Windows tool check used a repository directory; an earlier attempt
inside Windows Temp failed with sandbox `CreateProcessWithLogonW` error 267.

Shared native transcripts remain readable on Windows. If another application
adds messages to a WSL conversation between turns, continuing that native source
is currently blocked: ownership locks cannot yet cross Windows and Linux.
Switching agents creates a history handoff without claiming the external source.

### Existing WSL Host data and verification

Migration takes a consistent SQLite online backup of the old
`~/.monocode/remote/data/host.db` and imports it into the Windows Host. The source
database is retained. The old Host can be stopped through its authenticated
lifecycle endpoint only after its PID, command and data directory have been
verified; unknown processes are never killed by PID alone. Snapshot files use
new destinations and cannot overwrite an existing database. Legacy WSL remote
connection records are hidden from the remote-machine UI and retained until
successful import cleanup; SSH connection records are unchanged. Imported worker
conversations are detached from their old orchestration/workflow owner and
archived. Old run controls become read-only history, pending queues are paused,
and copied attachments are rewritten to their Windows Host locations. The next
turn starts with a history handoff using the desktop account.

The execution-service tests cover Windows named-pipe transport, multiplexed
output, binary file IO, persistent appends, ownership cleanup, timeouts, output
limits, loopback HTTP/SSE, bounded TCP relay, retry boundaries, PID reuse, SQLite
WAL snapshots and read-only Cursor subagent queries.
A real Ubuntu-26.04 smoke test verified 9 MB of UTF-8 output, process termination,
daemon crash/orphan recovery, connection-loss cleanup, safe bounded no-follow
reads and authenticated legacy-Host shutdown. A Linux TCP client also reached a
Windows-only loopback fixture through the mux and received all 300,000 bytes.
Windows/Linux CLI versions matched for Claude Code 2.1.302, Codex 0.163.0,
Pi 1.3.0 and OpenCode 1.19.3;
repeated verified transfers reused their cached files. The execution-service
smoke checks use temporary directories and no provider account; the separate
default-account conversation checks above use the actual shared credentials.
Pi's complete npm dependency tree was verified against official metadata and
transferred as one checksum-verified archive. Its default desktop API-key account
completed the Linux tool round and both-platform concurrent round. OpenCode's
version and transfer cache are verified; its authentication, conversation and
token refresh behavior still require validation.
Run `host/machines/wsl-smoke.mjs` with the bundled Linux Node to repeat the
isolated execution check.

For development, `npm run host:wsl-runtime` prepares the execution runtime in
`build/wsl-host`; packaged Windows desktops use their bundled `wsl` directory.
Builds and LAN publication remain explicit manual operations. These execution
checks do not establish refresh compatibility, named-account behavior, native
terminal presentation latency, or full per-provider end-to-end acceptance.

## Connect through SSH

In **Settings → Connections → Add machine**, enter an SSH address (`user@my-mac-mini`) or an alias from your SSH config and click **Connect**. The machine picker also links to this Settings page. An optional name and SSH port are available.

MonoCode downloads the host package matching the desktop release and remote architecture, verifies its checksum, installs a background service, pairs this desktop, and opens a private SSH forward. Node is included in the host package; users do not build the host, install Node, copy tokens, or run a tunnel command. Existing running hosts are reused without interrupting their agents.

Prerequisites:

- SSH must already be enabled and reachable on the host. MonoCode uses the desktop's OpenSSH client and normal SSH config, keys, and agent. Windows clients need the OpenSSH Client feature installed.
- Hosts: Windows 10/11 or Server 2019+, Linux, or macOS, on x64 or arm64. Mac/Linux need `curl` or `wget`, `tar`, and `shasum` or `sha256sum`. Windows needs Windows PowerShell 5.1, OpenSSH Server, and Task Scheduler; no WSL or Unix shell is required. Setup detects the remote platform through SSH.
- Install and authenticate each provider you want to use on the host under the connecting OS account. The host must be able to find its CLI on PATH or in its standard install directory. Antigravity's ACP server is available only on macOS and Linux.
- Linux needs systemd user services. Setup runs `loginctl enable-linger` for the SSH account so the host survives logout. Lingering applies to all of that account's user services, and `service uninstall` leaves it enabled. If enabling it requires administrator access, Settings displays the recovery command. macOS needs an active desktop login; keep that Mac signed in and awake.
- Windows uses a per-user Task Scheduler task, with no time limit, under the connecting user's normal permissions. Sign in to that same account at the Windows desktop and keep it signed in and awake. Locking the desktop and disconnecting SSH are fine; signing out or rebooting interrupts agents. The task starts again at the next login. No Windows password is stored for scheduling. This uses an interactive logon token because S4U tasks cannot access network or encrypted files. [Microsoft task logon documentation](https://learn.microsoft.com/en-us/windows/win32/taskschd/principal-logontype).
- Windows provider discovery supports native `.exe` installations for supported providers other than Antigravity, and standard npm installations of `@openai/codex` and `@anthropic-ai/claude-code`. Those npm entry points run with the bundled Node runtime; arbitrary custom `.cmd` wrappers are not supported. SSH aliases can supply Windows domain/user names through the normal SSH config.

SSH host verification and password/passphrase prompts appear in Settings. Changed host keys are rejected by OpenSSH. Passwords/passphrases are used only for the current authentication, not saved. When key/agent authentication is available, opening the remote view restores a lost tunnel automatically. If SSH needs another prompt, use **Reconnect** in Settings. Reconnecting uses the saved device credential and checks the host's identity.

The forward binds to a temporary port on the laptop's loopback interface. Quitting the desktop closes only that forward. It does not stop the host service or its agent sessions.

**Remove** in Settings asks for confirmation and offers two choices. **Remove from this desktop only** deletes the saved connection and closes its forward. The host keeps running, and this desktop's device credential stays valid on it. **Revoke access and remove** first asks the host to revoke the credential this desktop is using, then removes the connection. It needs the machine to be reachable, and if revocation fails the connection is kept. Neither option stops the host, affects other desktops' credentials, or deletes sessions. Adding the same machine again reconnects its projects, tabs, and history.

## Start a session

1. In the project rail, click **+** next to Projects and choose **Open folder on a machine…**.
2. Choose the machine, browse to an existing checkout (or type its absolute path, such as `/home/me/code/my-app`), and click **Open**.
3. Send a message. The first message creates the session on the host with the model, reasoning effort, and permission mode shown in the composer.

The composer's model picker lists models for the providers installed on the host. Model, provider-specific settings, and permission changes apply to the host session directly, and the next turn uses them; a change made during a running turn is applied when that turn finishes. If the host cannot load its model list, or no longer lists the session's model, the session's saved settings remain visible. The normal workspace and branch pickers use the host checkout through the shared file and Git commands. Choose an existing host worktree or create one from a branch before the first message; the session then runs in that working copy. Once the conversation starts, its worktree is fixed, as in a local session. Start a new session to use another worktree. The branch picker can search local and remote branches, create a local branch, and switch the current working copy when it is clean and the project's sessions are idle. Machine connection state appears on its project rail dot.

The **Explorer** sidebar and Go to File use the normal file views for host folders and files. Opening a text file uses the normal editor tabs. Saving writes back to the host; remote reads and edits are limited to 1 MiB text files. File creation, rename, deletion, and project search use the same controls as local projects. The **Changes** sidebar and Git history graph use the normal Git views, including file diffs, staging, discarding, commits, pushing, and pull request creation through `gh` on the host. Remote pull requests use the host's commit list and diff summary for their title and body. An ordinary folder outside Git shows an empty Changes state. Git changes are refreshed every few seconds. Generated commit messages are not available remotely yet.

The composer’s **+** menu supports file and image attachments, Plan mode, and saved drafts when the host advertises these capabilities. Attachments are copied to the host’s private data directory before the turn or draft is recorded; each file is limited to 20 MiB. Image previews are restored from the host when you reopen a conversation. A draft can be sent or removed from its transcript card. Plan mode uses the host provider and produces a reviewable plan card whose Build action continues on the host with the session’s current model. Update older hosts to enable these menu actions.

Features that read or run on this computer are not available in these projects: `@` file mentions, skills and slash commands other than `/plan` and `/compact`, operator mode, and terminals. Worktree deletion and the local worktree settings page are not available remotely yet. Plans from the transcript open normal read-only plan tabs. Source files stay on the host; this feature shares host-owned sessions, not working-directory synchronization.

## Manual connection (advanced / development)

Use Node.js 24 or newer on the host. Install and sign in to the providers you want under the same OS account that runs the host. The host uses that account's default provider credentials and searches its PATH and common per-user and system installation directories.

From a checkout of this version of MonoCode on the host:

```sh
npm ci
npm run host:build
node build/host/monocode-host.mjs start
node build/host/monocode-host.mjs pair --name "My laptop"
```

`start` launches the host independently of the terminal. `pair` prints a device ID and a device token; copy the token to the receiving desktop. Create a separate credential for each desktop. Tokens grant control of the host as its OS user, including provider execution and workspace reads.

The host binds only to `127.0.0.1:3774`. State and logs live in `~/.monocode-host` (`%USERPROFILE%\.monocode-host` on Windows). Unix permissions restrict access to the owner; Windows ACLs restrict it to the current user, SYSTEM, and Administrators. Use `--data-dir` and `--port` to override them. `serve` runs in the foreground for debugging.

Open an SSH tunnel from your laptop:

```sh
ssh -N -L 3774:127.0.0.1:3774 user@your-host
```

Under **Settings → Connections → Connect to an existing host by URL**, enter `http://127.0.0.1:3774` and the device token.

When the laptop wakes, restore the SSH tunnel. The remote view reconnects automatically and loads the host's latest persisted snapshot. An uncertain request retains its original command ID, including creation of a new session and its first message. **Retry** asks the host for that same command’s receipt, so a lost response does not create another conversation or submit the prompt again. Pending requests survive restarting the desktop and belong to the tab that created them.

HTTPS endpoints can also be entered if you operate a reverse proxy to the loopback host. Plain HTTP is accepted only for loopback endpoints. Native desktop HTTP carries the saved credential; it is not exposed to the renderer or browser storage. The native connection store is `remote-machines.json` in the desktop app's data directory, with mode 0600 on Unix. This initial implementation does not use the OS keychain.

## Manage the host

```sh
node build/host/monocode-host.mjs status
node build/host/monocode-host.mjs devices
node build/host/monocode-host.mjs revoke DEVICE_ID
node build/host/monocode-host.mjs stop
node build/host/monocode-host.mjs service uninstall
```

SSH setup names each device credential after the desktop's computer name. Removing a saved connection from the desktop does not stop the host. It revokes the device credential only when you choose **Revoke access and remove**. Otherwise, use `devices` and `revoke` on the host to remove access. Stopping the host interrupts active turns; restarting retains their transcripts and marks them interrupted. No uncertain provider operation is automatically replayed after a host crash.

`service uninstall` is the cleanup path for a host you no longer want running. It removes the systemd user service, the LaunchAgent, or this user's scheduled task. It then stops the host, including a manually started one, and interrupts any running turns. It never deletes the data directory. Sessions, logs, and device credentials stay in `~/.monocode-host` until you delete that directory yourself. To remove access without stopping the host, use `revoke` instead. On Linux, the command prints how to turn off lingering if nothing else needs it.

The machine must remain awake. Manual `start` launches a detached process. `service install` installs a user service; SSH setup runs it automatically. Only one host may own a data directory. Restart the host after changing its provider installation or PATH. Service installs preserve an already-running host, including one previously started manually.

SSH-installed hosts have a launcher at `~/.monocode-host/bin/monocode-host`; use it in place of `node build/host/monocode-host.mjs` in management commands. Linux services are named `monocode-host.service`; macOS uses `com.monocode.host`. A service manager can restart a stopped process, so use `service uninstall` rather than `stop` to keep the host stopped.

On Windows, the launcher is `%USERPROFILE%\.monocode-host\bin\monocode-host.cmd`. The scheduled task is named `MonoCode Host-<user SID>`; `service uninstall` unregisters it and stops the host. Normal cancellation and shutdown stop the provider's process tree. A plain manual `start` is detached, but use `service install` for SSH-hosted Windows sessions so Task Scheduler owns the process independently of the SSH login.

## Release packaging

`npm run host:package` builds a self-contained package for the current Windows/Mac/Linux architecture. `npm run host:package -- --all` builds all six archives, using pinned official Node binaries and checksums. Archives contain the host bundle, runtime, launcher, and licenses. `host/package.mjs` pins the runtime version. Cross-packaging Windows on Unix requires `zip` and `unzip`; native Windows packaging uses PowerShell.

Host archive names are `monocode-host-{darwin,linux}-{arm64,x64}.tar.gz` and `monocode-host-win32-{arm64,x64}.zip`, with matching `.sha256` files. SSH setup needs these assets in the exact desktop version's GitHub release, then installs under `~/.monocode-host/runtime`. Check that release's assets: publishing desktop installers alone does not provide standalone Host archives.

**Unreleased development builds:** automatic first-time installation and **Update Host** require host archives published for the desktop version. A personal-fork release or an unreleased checkout may not include them. Until the matching release is available, use the manual development connection above. A missing archive produces an explicit error in Settings. No fallback to an arbitrary latest release or unverified download is used. Connecting does not automatically upgrade a running host. When an SSH host lacks Explorer or Changes, Settings → Connections offers **Update Host**. This downloads and verifies the matching package, restarts the host service, and reconnects using the existing device credential. The restart interrupts active agent turns; sessions and history remain on the host. URL connections must be updated on the host manually.

## Scope of this first version

Supported: persistent remote text conversations with all ten local provider adapters, follow-up turns, approvals, questions where the provider offers them, cancellation, per-device revocation, reconnect, remote file browsing and text editing, Git status, file diffs, and history, staging and commits, branch selection and creation, worktree selection and creation, and a tracked Git diff against HEAD. OpenCode's server and event stream stay on the host's loopback interface. Cursor's optional enrichment from its native session database is not available on the headless host; basic transcript and subagent events still work. The desktop polls the host and downloads only transcript blocks that changed since its last update (every 0.75 s while a session runs, 3 s otherwise). The desktop rejects any single host response over 16 MiB. A sync above 4 MiB, such as reopening a very long transcript or one very large tool output, is sent as a series of bounded pieces of one consistent revision. Transcript size is therefore not limited by the response cap. The host writes streamed output in 120 ms batches and keeps a bounded event journal.

Remote history appears in the Sessions sidebar of each project on a machine. Host snapshots also populate the app's normal session state while the tab is open; they are not written to the local session store. Remote `/compact` uses the provider's context compaction, and `/plan` selects the host provider's plan mode. Queued follow-ups and editing the last message still need host commands. Other local slash commands and skill expansion are not yet available remotely. Worktree deletion, terminals, generated image output, named provider accounts, `/operator`, automations, LAN discovery, and account-based tunnels are not implemented yet. Other remote prompts are sent directly to the provider.

Hosts advertising orchestration capability version 1 support desktop assignment
generation, reviewed confirmation, parallel workers, worker details, task
cancellation, stopping and manual resume. Execution and persistence stay on that
Host, including when desktop closes. Host restart pauses unfinished runs instead
of redispatching them. Worker histories are inspected through their lead and are
protected from independent writes. Older Hosts expose no orchestration controls.
Phone clients receive orchestration status and history without new controls.

The headless Host runs the shared TypeScript adapters on Node. Provider process trees use the bundled Rust supervisor when present, with the Node guard as a fallback. `MONOCODE_PROVIDER_SUPERVISOR=node` explicitly selects that fallback. Packaging includes the supervisor for the current machine or the desktop Tauri target; other cross-packaged targets keep the Node guard. Node is included in both Host release archives and desktop bundles. Local desktop projects now connect to the same background service automatically; see [shared desktop and mobile conversations](shared-sessions.md) for migration and current feature limits. Imported named Codex/Claude accounts use the local desktop's existing account directories; standalone remote Hosts retain their separate account limitations.

## Verify

```sh
npm run host:build
npm run test:host
npm run check:web
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test
```

Host tests use fake provider executables and temporary loopback servers. They do not contact paid models. They cover the Codex and Claude transports, Pi/OMP RPC, ACP providers, OpenCode HTTP and event streaming, cross-client reattachment, duplicate sends, approval races, interruption recovery, device revocation, path checks, and detached host lifecycle. On Node 26, use `NODE_OPTIONS=--no-experimental-webstorage npm run check:web` to avoid its experimental global storage interfering with the existing happy-dom tests.

For the real OpenSSH transport and native askpass smoke test on Linux/macOS, build with `npm run host:package` and `cargo build --bin monocode`, then run `python3 scripts/test-remote-ssh.py`. It uses a disposable loopback sshd, temporary keys and known-hosts file, and an isolated packaged host. It leaves personal SSH configuration, provider credentials, and OS services untouched.

Host CI runs on Windows, macOS, and Linux. Windows-specific tests cover ACL inheritance, Task Scheduler definitions, bootstrap parsing/installation, and provider child-process cleanup. They use temporary data and mocked task registration so normal test runs do not install or replace a real user's background task. Full SSH-to-Task-Scheduler setup must also be validated on a signed-in Windows host before a supported release.


## Personal assistant

Hosts advertising `assistant.v1` provide one persistent personal assistant. Open
**Assistant** in the desktop sidebar or phone drawer and select an existing
provider/model. Each Host keeps its own chat, settings and drafts. Older Hosts
show an unavailable notice until upgraded. Restart the development Host after
building this feature to load the new runtime.

The assistant can discover providers, projects and conversations, create and
message conversations, and manage their inputs, queues, files, Git and reviewed
orchestration through the existing Host owners. Platform permissions start
enabled and can be restricted by action and project. Agent execution mode is a
separate provider setting. These API permissions do not sandbox a provider's
operating-system access.

Manual input, important Host session events and interval checks run without a
connected client. Pausing stops the assistant brain and new actions; delegated
work continues. Disabling retains history. Restart interrupts an active brain
turn and requires **Continue** after reviewing its effects. Known receipts are
reused; uncertain external effects are not replayed automatically. Interval
checks use UTC durations, coalesce missed periods, and stay quiet when unchanged.

The public chat contains replies, session cards and necessary user input. Full
brain execution stays private. Target messages retain the user role and show an
**Assistant** badge. Cards identify the exact Host/project/session; worker cards
open read-only details. Removing read permission or project scope disables the
card's navigation.

For the separate assistant evaluation tools and their scope, see the
[assistant evaluation guide](../host/bots/eval/README.md). Historical local
`specs/` verification notes are not included in this repository.
