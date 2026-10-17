# WSL provider distribution audit

Checked on 2026-10-17. Linux availability does not by itself establish shared
authentication, refresh safety or compatibility with MonoCode's adapter. Managed
downloads must match the desktop-selected version; an unavailable package must
not silently select a different version.

| Provider | Official distribution evidence | Shared Host status and remaining work |
| --- | --- | --- |
| OpenCode | `opencode-ai` 1.19.3 declares exact platform packages, including Linux x64/arm64 and Windows x64/arm64. Each package has npm SHA-512 integrity. Version 2 uses `@opencode/cli` (2.0.32 at audit time). [1.x metadata](https://registry.npmjs.org/opencode-ai/1.19.3), [2.x metadata](https://registry.npmjs.org/@opencode%2fcli/2.0.32), [official install documentation](https://opencode.ai/docs/) | Native managed descriptor implemented. Automatic installation stays on 1.x; an explicitly selected 2.x version uses its corresponding scope. The exact platform dependency is extracted directly, without npm postinstall. x64 baseline builds are preferred when declared, avoiding a Windows-to-WSL AVX2 assumption. OpenCode 2 adapter compatibility and account/conversation behavior remain unverified. |
| OMP | `@oh-my-pi/pi-coding-agent` 18.11.3 runs on Bun >=1.3.14 and has native dependencies. The official installer also supports pinned standalone builds for Linux x64/arm64, musl and Windows, using a build-service SHA-256 manifest. [npm metadata](https://registry.npmjs.org/@oh-my-pi%2fpi-coding-agent/18.11.3), [official installer](https://github.com/can1357/oh-my-pi/blob/main/scripts/install.sh), [pinned Linux build metadata](https://build.stencil.so/api/products/omp/versions/18.11.3/linux-x86_64) | Shared WSL execution blocked: native home `.env` files can override desktop account/directory selection; see below. Pi's Node tree cannot run this Bun application unchanged. A separate managed runtime remains required. Official build metadata was fetched; binaries and account behavior were not tested. |
| Cursor | The official installer publishes versioned Linux x64/arm64 tarballs from `downloads.cursor.com/lab/<version>/<os>/<arch>/agent-cli-package.tar.gz`; the inspected installer pinned `2026.10.16-e3cb207`. [official installer](https://cursor.com/install) | Shared WSL execution blocked pending verified desktop credential and native-session sharing. The documented channel is a vendor archive, not npm. The inspected installer has no independent integrity manifest; its date/hash version is outside the managed semver format. The CLI and desktop application versions are distinct. |
| Grok Build | The official installer selects Linux x86_64/aarch64 and native Windows binaries, and accepts an exact version. Stable reported 1.0.62. Artifacts use `x.ai/cli/grok-<version>-<platform>` with a Google Cloud Storage fallback. [official installer](https://x.ai/cli/install.sh), [stable pointer](https://x.ai/cli/stable) | Shared WSL execution blocked pending verified desktop credential and native-session sharing. The installer supplies neither an npm CLI package nor a SHA manifest. Unrelated community `grok`/`grok-cli` packages cannot substitute for Grok Build or reuse Pi's JavaScript installer. |
| fx | The official installer downloads `releases.fx.sh/<version>/fx-linux-{x86_64,aarch64}.tar.gz`, with an optional exact-version argument. Latest reported v0.0.14. The CLI is built with Zig; the separate npm `libfx` package is an embedding SDK. [official installer](https://fx.sh/setup.sh), [official repository](https://github.com/vercel-labs/fx), [latest pointer](https://releases.fx.sh/latest.txt) | Shared WSL execution blocked: auth and sessions use real `HOME/.fx`. There is no official CLI npm route; neither Pi's JS tree nor the npm-native descriptor applies. npm `fx` is a different project, and `libfx` cannot replace the CLI. The installer does not verify a published checksum. |
| Hermes | The official installer obtains the repository, prepares a managed Python runtime and installs its locked dependencies through Hermes's package manager. The source installer also prepares application products. [official installer](https://github.com/NousResearch/hermes-agent/blob/main/scripts/install.sh), [runtime lock](https://github.com/NousResearch/hermes-agent/blob/main/pm/lock.json) | Shared WSL execution blocked pending cross-platform profile gateway/session ownership. `HERMES_HOME` alone is insufficient evidence. Reproducing the desktop source revision, Python runtime and dependencies needs a separate managed installer. Discovery never runs its installer or product build. |
| Antigravity ACP | The ACP registry currently lists 1.4.0 archives from Google's `dl.google.com`, with Linux x64/arm64 `agy_acp_server.par` and Windows x64/arm64 `agy_acp_server.exe`. Linux also needs `--uid=`. [ACP distribution manifest](https://github.com/agentclientprotocol/registry/blob/main/antigravity-acp/agent.json) | Shared WSL execution blocked pending verified ACP credential/session root sharing. This is distinct from the `agy` CLI whose installer publishes SHA-512 manifests. ACP's manifest lacks digests. MonoCode's Windows resolver still rejects Antigravity; Windows discovery and ACP compatibility remain open work. Linux builds do exist. |

Shared WSL eligibility is checked before runtime discovery and process launch.
The six blocked providers cannot bypass account isolation by using a WSL-installed
binary or WSL login. This is an account/session-sharing restriction, not a claim
that Linux builds are unavailable.

The account-path audit found these concrete constraints:

- OMP reads real `$HOME/.env`, config-root `.env`, agent `.env` and project `.env`.
  Missing or empty launch variables can be filled from those files, and its
  directory resolver is refreshed afterward. Mapping `PI_CODING_AGENT_DIR` and
  deleting inherited auth/profile variables therefore cannot guarantee shared
  desktop state. [Official environment loader](https://github.com/can1357/oh-my-pi/blob/main/packages/utils/src/env.ts).
- fx computes profile authentication and native session paths under `HOME/.fx`;
  the audited CLI exposes no independent profile-root override. Changing HOME
  would also change the Linux tools' user environment.
  [Profile paths](https://github.com/vercel-labs/fx/blob/main/src/core/shared/profile_paths.zig),
  [HOME resolver](https://github.com/vercel-labs/fx/blob/main/src/core/shared/io.zig).
- Hermes has `HERMES_HOME`, but its current profile gateway owns session writes.
  Cross-platform gateway discovery and ownership still need verification; the
  Windows default is `%LOCALAPPDATA%/hermes`, not `~/.hermes`.
  [Session storage](https://hermes-agent.nousresearch.com/docs/developer-guide/session-storage),
  [Profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles/).
- Cursor, Grok and Antigravity have no verified mapping covering both desktop
  credentials and all native session state in this implementation.

Pi and OpenCode copy or clear the authentication environment names from the
official [Pi resolver](https://github.com/badlogic/pi-mono/blob/main/packages/ai/src/env-api-keys.ts)
and [OpenCode provider catalog](https://models.dev/api.json) (snapshot 2026-10-17).
Known path-valued credentials use desktop paths, including default
[Google ADC](https://cloud.google.com/docs/authentication/application-default-credentials)
and [AWS credentials/config files](https://docs.aws.amazon.com/sdkref/latest/guide/settings-reference.html).
Linux instance-metadata fallback is disabled. Custom plugin credential helpers,
AWS SSO caches and provider-specific external authentication commands have not
been verified. Account refresh and simultaneous use still require the provider
matrix tests; environment mapping alone does not establish compatibility.

At the start of this audit, none of these seven CLIs was found on this Windows
machine's PATH or the standard provider installation directories inspected by
MonoCode. That is a discovery result, not evidence that those providers lack
Windows or Linux builds. No existing version or authentication state was inferred
from product names, cached online pages or unrelated npm packages.

OpenCode 1.19.3 was then installed through the managed cache for Windows x64 and
Linux x64 using the official `opencode-*-x64-baseline` packages and official npm
SHA-512 metadata. Both binaries returned exactly `1.19.3` from `--version`, with
the Linux binary executed through the isolated Ubuntu-26.04 execution service.
Repeated Windows installation reused the same immutable directory; repeated WSL
transfer reused the same path and preserved the executable's modification time.
No OpenCode inference request or account test was performed.

The desktop session list uses `SessionCard` with `HarnessIcon` and
`sessionDisplayTitle`; archived desktop conversations use the same pair in
`ArchivePage`. Mobile Home uses `MobileSessionRow`, and Mobile Drawer and Archive
also render the provider icon before the normalized display title. WSL projects
reuse those renderers, so no separate WSL title prefix or session-row renderer was
introduced.
