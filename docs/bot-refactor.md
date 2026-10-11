# Host-scoped Bots refactor

## Baseline and scope

- Baseline: `341b65058f1351744e25a6b6e692c1c8ec580335`.
- Branch: `codex/bot-refactor`; reuse the already isolated task worktree.
- Preserve unrelated `HANDOFF-turn-checkpoints.md` and `release-out/`.
- Implement Host → Bot → Thread, followed by bounded delegation, teams and Rooms.
- Freeze mobile assistant components, layout and styles. Serve existing clients
  through the default Bot/Thread compatibility facade.
- Keep Harness adapters and CLI execution. No new direct-model inference loop.
- Markdown is authoritative for memory; Host SQLite owns conversations, runs,
  configuration, revisions, receipts and rebuildable indexes.
- No builds, LAN publication, push or merge are authorized by this implementation.

## References and desktop design

- Visual reference: https://mausbot.com/demo (scripted demonstration).
- Bot/Thread structure: https://docs.openmausbot.com/docs/features/bots-and-tasks.
- Memory: https://github.com/milind-soni/OpenMausBot/blob/main/docs/memory.md.

Keep the Monocode application frame and internal assistant view identity. Label
the desktop entry Bots. Use a contact navigator (initially about 260px), flexible
chat area and optional inspector (about 320px, closed initially). The navigator
contains Host selection, search, draft creation, teams, Bot contacts, nested
threads and archives. The chat preserves attachments, replies, approvals,
questions and session cards, with a compact header and rounded composer.
Inspector pages are settings, memory, activity and automation. On narrower
desktop windows close the inspector before collapsing navigation.

Use Monocode theme variables and scope all new styles under the desktop Bots
root. Preserve user titles; use HarnessIcon and sessionDisplayTitle for thread
and archived rows. Use AnimatedCollapse for disclosure lists and
useCollapseMotion with stable zero-sized grid tracks for panels. Preserve closing
content, prevent hidden interaction/portals, support reversals and reduced motion,
and keep hidden terminals mounted. Disable size transitions during direct resize.

New Bot creation is a local editable draft until explicit save. Persist desktop
drafts, reply targets, attachments, outbox, history/revision cursors, scroll anchors,
read positions and inspector drafts by environmentId + botId + threadId. Keep
environmentId separate from the cache key because it is also a routing identity.
Application labels follow docs/localization.md; provider and user values do not.

## Ownership and compatibility

BotManager is the single Host callback owner, event router, scheduler and lifecycle
entry. Do not instantiate multiple HostAssistant objects: their constructors
overwrite engine.authorizeAssistantQueued and store.onSessionSave. Preserve the
transactional source-event journal when distributing Host events.

Bot owns defaults, Soul, memory, permissions, tools, working directory and
automation. Thread owns transcript, revision, queue, approvals/questions, model
override and provider binding. BotRun owns immutable effective configuration,
origin, run status, cancellation and generation fences. Include explicit scope in
all records and validate Bot → Thread → Run → Request relationships; use composite
foreign/unique keys. New receipts are scoped, parameter-signed and idempotent.

Add bots.*, botThreads.*, botMemory.*, botTeams.*, botRooms.* and
botDelegations.* capabilities incrementally, advertising only implemented
features. New desktop falls back to the old assistant view on old Hosts.
assistant.* remains the complete default Bot/Thread projection, including memory
and expectedRevision edits. Legacy stop cancels only the default Thread; pause
and disable affect its Bot. Preserve old message unions, pagination and revisions.
Legacy IM bindings retain their IDs, cursors and deduplication; distinguish the
platform threadId from the new local botThreadId. Attachment reads validate
message ownership; legacy unscoped reads resolve only the default Thread.

## Migration and rollback

Run migrations before schedulers, IM delivery and write RPCs start. Create a
consistent SQLite backup (including WAL state), attachment/file manifest and
persistent migration ID, phase, source hashes and stable default-ID mapping.
Reuse the old assistant ID as botId. The old public chat has no Thread ID: create
defaultThreadId once. Preserve all existing message/action/receipt IDs, message
revisions, attachment paths, reminders, habits, watch rules and provider references.
The rotating brainSessionId is a replaceable provider binding, never Thread ID.

Stage 2 copies memory/playbooks into Bot-scoped transitional storage as part of
the database migration, then freezes old tables. Stage 3 separately prepares and
checks Markdown staging files, atomically promotes them, and records workspace
cutover. Never infer completion just from table/file existence. Keep schema and
workspace completion markers separate; replay recovery must not overwrite later
user edits. Old tables remain read-only backups; no ongoing dual writes.

File writes and SQLite cannot share a transaction: persist intent, replace file,
commit revision/index, then mark complete. Recover from observed file hashes;
rebuild indexes from files rather than overwriting authoritative files with SQL.
Rollback requires stopping Host and restoring the matching database/files;
checking out old code alone is not a data rollback.

## Memory

Each Bot has `bots/<botId>/workspace/SOUL.md`, `MEMORY.md`, `memory/<topic>.md`,
`memory/archive.md`, `memory/log/YYYY-MM-DD.md` and migrated `playbooks/*.md`.
History/intent journals are outside workspace. Project execution cwd is separate;
without an assigned project each Thread receives its own working directory.

Read Soul and memory at every turn boundary. Resident loading is capped at 200
lines or 24 KiB UTF-8, whichever comes first, without silently truncating the
stored file. Surface budgets and truncation. Bound the topic-name index (100
topics/8,000 characters); load topic bodies, archive and logs on demand.

For user input of at least eight Unicode characters, recall at most four topic
notes and four passages from other direct Threads of the same Bot, at most 1,000
characters each and 6,000 overall including provenance. Exclude the current
Thread, resident memory, archive and logs. Room, delegation and automation recall
topics only. Keep Chinese tokenization and BM25. Inject recall as sourced
reference material in the current turn, not system instructions.

Serialize managed writes per Bot; compare hash/revision and atomically replace
same-directory temporary files. Keep editor drafts on conflict. Undo creates a
new journaled revision. Reconcile external edits at reads/turn boundaries; file
watching is an accelerator, not correctness. External editors do not join Host
locks, so managed-write serialization is not a strict CAS against arbitrary
external processes. Validate logical paths and reject traversal/symlink escapes.

Reuse existing redaction and budget archiving. Existing until dates currently
prioritize expired entries during budget eviction; automatic expiry filtering or
cleanup is additional behavior. Preserve existing daily summarization, but
classify legacy chat-days as diary/log so Rooms cannot recall private transcript
summaries as topics. Preserve playbook metadata and dispatched body snapshots.
No new model-driven memory capture or organization in this scope.

## Execution and collaboration

Persist input → schedule → assemble context → Harness adapter → CLI → persist
events → revision sync. Extend optional shared contracts in harness/core; keep
protocol details in providers. Declare native-system/context-block and
native-MCP/control-CLI/unavailable capabilities for both desktop and Host.
Do not claim prompt instructions enforce permissions. Keep Pi/OMP shared changes
covered together and retain separate desktop/headless generated-image persistence.

Stage 2 runs one slot per Bot. Stage 4 defaults to three (configurable 1–10),
shared by direct, automatic, delegated and Room runs. At most one active run per
Thread. Approval/question waits occupy slots. Atomically claim slot and Thread;
ordinary excess input queues fairly, steering only when supported. Configuration
is resolved at run start and changes take effect next turn; revocations are
checked immediately at action/dispatch boundaries. Late events are fenced by
run/generation. Cancellation does not affect sibling Threads. Release resources
only after stop/cleanup, not just a user-visible cancellation timestamp.

Provider sessions are replaceable caches. Recover from Host history on resume
failure, engine or context-configuration changes; never replay historical tool
actions. Dynamic recall alone must not invalidate the session cache. On restart,
retain pending queues, mark uncertain active runs interrupted and unknown external
actions unknown. Managed project/computer resources require actual occupancy
leases, including parent/child conflicts.

One DelegationService backs agents MCP and control CLI. Host-issued run grants
determine source, root and depth; caller parameters cannot impersonate them.
list_bots exposes only allowed same-Host targets. Target policy/approvals apply.
Atomic target-slot admission returns busy immediately if full. Idempotency is
sourceRunId + requestId with a parameter signature, including terminal failures.
Self-call and depth >= 1 cannot delegate. ask_bot has an absolute 240-second
deadline including approvals. Existing control sockets time out at 32/35 seconds,
so submit persistently and wait in <=25-second requests; reconnects do not reset
the deadline. Cancel only the corresponding target run. Share delegation IDs and
public results, never target private history or credentials.

Each team has at most one Chief, who is a member; role changes are transactional.
Chief uses the same single-hop service; coordinate_bots aggregates sibling results
including busy/failure. No extra permission or depth privilege and no new model
API loop. Rooms own their shared transcript; each member has a dedicated provider
binding. Snapshot ordered members per user message; each speaks once, seeing prior
completed room replies. Fail/timeout one member and continue. Initial per-member
deadline is 240 seconds including slot wait. Stop cancels current/remaining
speakers; restart does not replay the interrupted round. No private Thread,
recovery brief or legacy diary is automatically included in Room context.

## Stages and acceptance

Complete and verify each stage, commit it independently, then start the next.

| Stage | Deliverable / exit criteria | Commit |
| --- | --- | --- |
| 0 | Dedicated branch, baseline, reference/design/migration/acceptance record | docs(bots): record refactor roadmap |
| 1 | Desktop shell with working single-assistant chat, attachments, approvals and settings; mobile unchanged | feat(bots): redesign desktop assistant shell |
| 2 | Scoped Store/Manager, recoverable migration, RPC, legacy/attachment/IM compatibility, basic Bot/Thread switching; one slot/Bot | feat(bots): add isolated bots and threads |
| 3 | Markdown authority, Soul, bounded recall, conflicts/journal/recovery, old memory/playbooks accessible | feat(bots): add file-backed memory workspaces |
| 4 | Harness contracts/tools, slots, approval/cancel isolation, session/restart/resource recovery | feat(bots): add scoped concurrent runtime |
| 5 | Settings/archive/memory/automation/unread/activity and IM management complete | feat(bots): complete desktop bot management |
| 6 | Agents MCP/CLI, allowlists, busy/deadline/cancel, idempotency and records | feat(bots): add bounded bot delegation |
| 7 | Chief uniqueness, aggregation, sequential Rooms and desktop entry | feat(bots): add teams chiefs and rooms |
| 8 | Actual regression fixes, recovery guide, capability matrix and acceptance evidence | test(bots): verify migration and compatibility |

Acceptance covers empty/existing/repeated/interrupted migration; preserved IDs,
attachments, receipts and IM cursors; two Bots and multiple Threads with forged
scope rejection; memory boundary/multibyte/external edit/conflict/index rebuild;
fourth-run queue, approval slot, isolated cancel, next-turn config and restart;
busy/240-second deadline/depth/revocation/idempotency/Chief conflict/Room failure;
new desktop with old/new Host and old mobile with new Host; history/unread/images,
light/dark/narrow/keyboard and bidirectional/reversed/reduced-motion disclosure.

Use targeted existing Vitest files and add tests for meaningful new behavior.
Call Vitest directly: npm run test:host has a build pre-hook, and check:web runs
the full suite. Use `tsc --noEmit` for changed TypeScript scopes; check:rust if Rust
changes. Never mark an unrun real-CLI scenario compatible. Record actual versions,
commands/results and deferred checks, including manual visual checks.

## Execution record

| Stage | Status | Commit | Checks actually run |
| --- | --- | --- | --- |
| 0 | Roadmap recorded | `6f1e17c0` | Baseline, branch and unrelated-file inspection; documentation requires no tests |
| 1 | Desktop shell complete | `df30c960` | Targeted UI/Host tests, TypeScript and local browser checks below |
| 2 | Isolated Bots/Threads complete | `cf4e906e` | Scoped persistence, RPC, desktop and compatibility checks below |
| 3 | File-backed memory complete | `5159556a` | File durability, recall, UI and compatibility checks below |
| 4 | Concurrent runtime complete | `bf095e1c` | Runtime, resource, provider and compatibility checks below |
| 5 | Desktop management complete | `76ca64ce` | Management, compatibility and browser checks below |
| 6 | Single-hop delegation complete | Recorded in the following stage | Delegation, MCP, UI and compatibility checks below |
| 7–8 | Not started | — | None |

Stage 1 verification (Node 24.16.0, Vitest 3.2.7, Vite 7.3.6):

- Direct Vitest: `DesktopAssistantButton.test.ts` + `App.appViews.test.ts`
  focused selection: 8 passed; remaining read-state test: 1 passed.
- Direct Host Vitest: `host/server.test.ts -t 'advertises assistant RPC'`:
  1 passed. Initial collection required the ignored workflow library snapshot;
  generated it with `node src/integrations/workflow/generate-libs.mjs`, then passed.
- Direct UI Vitest: `DesktopAssistant.test.ts`, `AssistantChat.test.ts`,
  `AssistantChat.attachments.test.ts`, `MobileAssistant.test.ts`: 74 passed.
  Subsequent animation refinement: AssistantChat + MobileAssistant 63 passed;
  final focus refinement: three targeted Bots cases passed.
- `tsc --noEmit`: passed; `git diff --check`: passed.
- Browser against a local isolated RPC fixture: dark 1280px and light 680px,
  details opening/closing/reversal, retained draft, Escape/focus restoration,
  delayed panel focus, and narrowed contact rail inspected. No production data.
- No mobile component/CSS edits; no build, publication or real CLI run.


Each subsequent stage records the preceding commit SHA here and its own checks
before committing. Its own SHA is resolved by the named commit in git log, then
recorded by the next stage; this avoids rewriting a commit to embed its own hash.


Stage 2 implementation notes:

- `BotStore` owns relational Bot/Thread metadata and the migration checkpoint.
  `AssistantStore` now uses explicit `(bot_id, thread_id)` predicates. Bot
  configuration/memory is shared; messages, receipts, wakeups, source cursors,
  action ledgers and provider-session state belong to Threads. Thread model
  overrides never write back to Bot defaults. The first Bot on an empty Host
  becomes the compatibility default.
- `BotManager` owns the Host callbacks, catalog routing and execution leases.
  This stage limits each Bot to one executing Thread. Only its default Thread
  produces existing schedule/event wakeups. Host-signed tool origins carry
  optional Bot/Thread IDs while old origins stay readable.
- The default assistant facade, IM binding/cursors and unscoped attachment reads
  target the default Thread. New attachment reads require matching Bot/Thread
  ownership. The desktop uses a separate composite cache key while retaining
  the actual Host environment for connection/session routing.

Migration recovery and rollback:

1. Startup records stable default IDs, takes a SQLite `VACUUM INTO` snapshot
   (including committed WAL contents) at `<databasePath>.pre-bots-v1.sqlite`,
   prepares the workspace/manifest, copies all legacy rows transactionally, then
   marks completion. Each checkpoint can be retried; old assistant tables become
   read-only once copied. Existing attachments and brain directories stay put.
2. On interruption, restart the new Host against the same database. Do not delete
   the new tables or checkpoint metadata to retry.
3. To roll back, stop the Host first. Preserve the current database **and** its
   WAL/SHM files as a separate recovery copy. Restore the pre-Bots snapshot at
   the original database path without the newer WAL/SHM, then start the matching
   old version. Checking out an old commit alone is not a database rollback.
4. A restored old Host may receive new writes. Before migrating that restored
   installation again, archive the earlier `.pre-bots-v1.sqlite` under another
   name so the next migration takes a fresh pre-migration snapshot. Never discard
   the post-migration copy if its newer conversations may still be needed.

Stage 2 checks:

- `host/bots/store.test.ts` and `host/assistant/store.test.ts`: 28 passed;
  a later targeted public-state projection check passed.
- Host attachment scope tests: 2 passed. RPC/IM focused selection: 8 passed
  after fixing initial empty-Host default runtime initialization. Additional
  publication rollback and resolved-input/IM checks: 4 passed.
- Host TypeScript `tsc --noEmit -p host/tsconfig.json`: passed after linking the
  existing ignored `host/im/node_modules` dependencies into this worktree.
- Browser fixture: dark desktop and light 680px layout; independent Bot drafts,
  Thread switching, named Thread creation, Bot draft-before-save creation,
  default-title accessibility and details focus verified.

- Manager regression file: 6 passed (serial sibling/cross-Bot execution, independent
  approvals/cancellation, Bot pause and new Threads, next-turn model changes,
  default-model overrides, archive failure/retry). Final model boundary selection:
  2 passed. Existing Assistant index: 56/58 initially passed; two old-semantic
  fixtures were updated for next-turn configuration and scoped storage, then both
  passed. No failing scenario remains in those executed checks.
- Existing desktop/AssistantChat/Mobile selection: 75 passed. Final client,
  scoped RPC adapter, desktop notification and workspace selection: 29 passed;
  unread-hook tests: 2 passed. Web `tsc --noEmit`: passed.
- Final RPC compatibility/scope selection: 2 passed; final Host TypeScript and
  `git diff --check`: passed. No Mobile component/style change and no real CLI,
  build, publication, push or merge was performed.

- Final native-path review caught the desktop Rust RPC allowlist missing the new
  Bot methods. Added the exact methods and allowlist assertions to this stage.
  `CARGO_TARGET_DIR=/projects/monocode/target npm run check:rust`: passed (format,
  Clippy with warnings denied, 602 tests passed / 1 ignored). The first attempt
  needed the existing packaged Host resource directory; linked the ignored
  `build/desktop-host` to the existing resource, then reran successfully. This
  was test compilation; no application build/package or publication was run.


Stage 3 implementation notes:

- `FileMemoryService` provides a Host-cached service per Bot. `SOUL.md`,
  `MEMORY.md`, topic/archive Markdown, dated logs and `playbooks/*.md` live in
  the stable Bot workspace. The existing persona remains the base identity;
  a new empty Soul adds user-authored instructions without overriding phone
  persona settings. Legacy `chat-days` content maps to dated log files.
- File writes participate in the outer Host SQLite transaction: prepare a durable
  journal, atomically replace files, commit the revision/command receipt, then
  move the journal to history. Startup/read recovery uses the SQLite commit
  marker to finish or roll back interrupted file work. Newer external edits are
  preserved. Journals/history remain outside the workspace.
- File APIs require matching revision and SHA-256 hash; conflicts retain desktop
  drafts. Reads/turn boundaries reconcile external edits. Rebuild reconstructs
  projections from Markdown plus durable history without copying stale SQL bodies.
- Every turn loads current Soul, bounded resident memory and at most 100 topic
  names (8,000 characters). Resident memory keeps the full editable file but loads
  only 200 lines / 24 KiB. A 1 MiB per-file and 2,000-file workspace bound protects
  file operations. Paths are canonical and symlinks are rejected.
- Automatic recall uses Chinese tokenization/BM25, an eight-code-point input
  minimum, at most four notes and four excerpts from other direct Threads of the
  current Bot. Each excerpt is at most 1,000 code points; the complete annotated
  reference block is at most 6,000. Current Thread, archive, logs and resident
  memory are excluded. Automatic/non-direct inputs recall only topic notes.
- The desktop memory tab is gated by `botMemory.v1`. Host/Bot/file drafts survive
  Thread switching and panel closure. Explicit conflict choices precede retry;
  saving after an unknown response reuses its command ID. Undo requires a clean
  draft and uses the same revision/hash checks. The phone uses existing APIs.

Stage 3 checks:

- Host RPC file-memory/CAS/legacy-mobile integration: 1 passed.
- Localization selection: 6 passed.
- Rust RPC whitelist: `CARGO_TARGET_DIR=/projects/monocode/target npm run check:rust`
  passed (format, Clippy, 602 tests passed / 1 ignored).

- Runtime/manager/recall/prompt selection: 72 passed. Unicode topic/control
  compatibility selection: 5 passed.
- Desktop workspace/memory/AssistantChat/MobileAssistant selection: 71 passed;
  no mobile component or style changes.
- Browser fixture: light 680px layout verified conflict draft preservation,
  explicit conflict resolution, save, undo and rapid history collapse reversal;
  dark 1280px memory editor layout inspected. The previous Vite process had
  exited; restarted the local fixture before these checks. No production data.
- Web and Host TypeScript checks passed. No real CLI inference, application
  build, publication, push or merge was run in this stage.

- Final file service: 13 passed; existing scoped/Assistant stores: 28 passed.
  These cover exact Unicode/byte budgets, external edit and deletion/undo,
  deferred SQLite COMMIT failure, committed/uncommitted journal recovery,
  external-write races, rebuild, path/symlink/UTF-8/size rejection and topic bounds.
- Final historical-name/Unicode control selection: 3 passed; final Host TypeScript
  and `git diff --check` passed.

Additional migration recovery details:

- Portable filename aliases (including old names such as `CON`, trailing dots,
  repeated extensions, and case-fold collisions) are persisted in
  `bots/<botId>/memory-aliases.json`, outside the workspace. Legacy controls and
  the context topic index retain the original name. Existing Markdown wins on
  migration; the original SQL document bodies are preserved separately in
  `memory-sql-backup.json` with owner-only permissions.
- Back up the complete `bots/<botId>` directory along with SQLite: workspace,
  aliases, journals and history form the recoverable file-memory state. Do not
  delete pending journals to clear an error. Restart/read retries settle them
  using the SQLite commit marker. The service preserves a newer external edit.


Stage 4 checks:

- Initial runtime HTTP RPC selection: 1 passed (default three slots, invalid
  limits, run state transition, scoped lookup and pagination bound).
- Native RPC allowlist plus native writes honoring Host execution leases:
  `CARGO_TARGET_DIR=/projects/monocode/target npm run check:rust` passed
  (format, Clippy, 603 tests passed / 1 ignored). Mounted read buffers and
  unrelated paths remain available; parent/child writes and integrations wait
  for the Host turn. No application package/build was run.

Stage 4 runtime and adapter verification:

- Assistant runtime: 60 passed. BotManager: 13 passed (three slots, fourth
  queued, approval occupancy, scoped cancellation, next-turn configuration,
  shared-directory admission, restart and failed native-cache recovery).
  New scoped run-history Store selection: 1 passed.
- Provider/core protocol and adapter selections: 352 passed, covering native
  system instructions and both Pi/OMP attachment and generated-image paths.
  Host engine context/spoof/cancellation/image selection: 7 passed.
- Resource/checkout/control selection: 40 passed; existing orchestration review
  and workspace capture selections: 4 passed. Dynamic workflow parent awaiting
  its own child: 1 passed. Resource reentry requires Host-owned lineage and the
  same process; unrelated owners, overlapping directories and native writes
  remain excluded. External unmanaged programs are outside these guards.
- Final runtime HTTP selection including forged public botContext: 1 passed.
  Localization: 5 passed. Web and Host TypeScript and diff checks passed.
- Bot turns stop their CLI process after settlement, retain native conversation
  identity, and issue a fresh control grant at the next turn. The grant tests use
  real subprocess/socket I/O with a Node RPC fixture, not model inference.

Installed CLI evidence (read-only commands, no model turns):

| CLI | Observed version | Configuration evidence |
| --- | --- | --- |
| Codex | codex-cli 0.159.2 | Generated experimental app-server schema: ThreadStartParams and ThreadResumeParams support developerInstructions |
| Claude | 2.1.296 (Claude Code) | Help lists --append-system-prompt |
| Pi | 1.1.0 | Help lists --append-system-prompt |
| OMP | omp/18.6.0 | Help lists --append-system-prompt |
| OpenCode | Unavailable | --version failed because its postinstall had not run; environment was not modified |

Stage 4 capability boundary: Codex/Claude/Pi/OMP use native system instruction
channels. Cursor/Grok/OpenCode/FX/Hermes/Antigravity receive a marked context
block. Host tools use the scoped control CLI; the Host MCP bridge is not yet
configured, so every adapter reports MCP unavailable. Host action permissions do
not restrict a CLI's built-in tools or separately configured user MCP servers.
Actual model inference, real CLI conversations, and unlisted adapters remain
unverified. No application build, publication, push or merge was run.

- Final Pi/OMP subprocess grant/history and requested-configuration selections:
  4 passed. A discovered Pi regression was fixed: compare the persisted requested
  model configuration, not the provider-normalized model name. Genuine model
  changes still rotate the cache on the next turn. Host TypeScript passed again
  after this fix.

Stage 5 checks and management behavior:

- Desktop navigation/Thread settings: 11 passed (archive/restore, protected
  defaults, retained drafts/scroll, avatars, model override/reset, revision
  conflicts, capability fallback and Escape/focus restoration).
- Existing chat/attachments/mobile/scoped-client selection: 72 passed, including
  retrying an uncertain desktop configuration save with the same command ID.
  The mobile directories are unchanged from the implementation baseline.
- Backend management/IM/declared-action selections: 7 passed. Avatar validation
  counts Unicode code points; configuration normalization now copies its input
  so idempotent create retries retain their original request signature.
- Bot and Thread archives retire pending/backoff work without relabeling historic
  interruptions. Restored Threads become usable under the Bot's existing gates;
  restored Bots remain paused until Resume. Restoring a currently active,
  non-archived Thread does not interrupt its run.
- Existing IM settings gain an explicit default Bot/Thread scope in place;
  binding IDs, channel thread IDs, cursors and deduplication journals stay intact.
  Public IM requests cannot redirect the binding to a different Bot.
- Runtime/management HTTP capability and scoped run selection: 1 passed.
  New desktop management uses bots.management.v1; activity uses bots.runtime.v1.
- Browser fixture (no production data): dark 1280px archive list, Thread model
  override, archive/restore retaining draft, activity expansion; light 680px
  layout, avatar/concurrency/empty-directory save and schedule configuration
  save. Identity/model settings remain first, with runtime/Thread details folded.
- New detail panels: 5 passed, covering uncertain-save retries, empty directory
  clearing, conflict drafts, updates to older paginated activity, hidden polling,
  keyboard tabs and automation-only configuration patches. Existing persona and
  reasoning settings: 6 passed. Final Web/Host TypeScript and diff checks passed.
  No Rust files changed in this stage; no builds, publication, push or merge.

Stage 6 checks and delegation behavior:

- Desktop delegation/management/workspace selection: 24 passed. Cards refresh on
  chat revisions, provide source/target navigation, preserve retry command IDs,
  filter foreign records and disable hidden interaction. Loaded history keeps its
  actual oldest record when a final page omits `next`. Selection events are
  normalized to Bot/Thread IDs before issuing strictly scoped RPCs.
- Shared message/mobile fallback and localization: 16 passed. Desktop receives
  the optional delegation card; mobile keeps the original status-message path.
- Authenticated delegation HTTP routing: 1 passed, covering list/get/cancel scope
  validation, forged caller fields, bounds and revoked device credentials.
- `CARGO_TARGET_DIR=/projects/monocode/target npm run check:rust`: passed
  (603 tests passed, 1 ignored). New delegation RPCs are in the native allowlist.
- Browser fixture: expanded a delegation card, opened the target Thread,
  cancelled from the target, returned to the source and verified the updated
  status and retained draft. Dark 1280px layout inspected. This used mock data;
  it did not start a real provider or contact another person.
- MCP/CLI bridge and existing socket controls: 10 passed; the expanded real Node
  stdio/TCP case passed again after adding multi-poll completion, notification
  cancellation and EOF cleanup. A logical request keeps one request ID and the
  Host's original deadline across short (at most 25-second) authenticated polls.
  Credentials are inherited by child processes and absent from protocol output.
- Codex/Claude/core selections: 265 passed; Pi/OMP protocol selection: 59 passed;
  collaboration prompt/permissions: 2 passed; final MCP name-length/Claude
  timeout refinements: 2 passed. TypeScript passed for Web and Host.
- Native MCP is configured for Codex and Claude only when a Host launcher exists.
  A per-Thread server entry preserves other user MCP entries. Codex uses dotted
  `-c` overrides and environment-variable forwarding; Claude uses non-strict
  `--mcp-config`, environment references and a 250-second server timeout.
  Pi/OMP retain the explicitly described control-CLI fallback. The same service
  verifies identity and permissions for both transports.
- Read-only local CLI evidence: Codex 0.159.2 help/schema, Claude 2.1.296 help,
  Pi 1.1.0 help, OMP 18.6.0 help. Claude environment expansion and timeout use
  its [official MCP documentation](https://code.claude.com/docs/en/mcp) plus
  protocol tests. Actual provider model inference and real native MCP connections
  were not run; user CLI configuration was not modified.
- Delegation Threads remain visible so their approval/question cards are reachable.
  Ordinary sends are rejected and the desktop composer explains that new messages
  need a direct Thread; Bot resume/enable cannot enqueue an orphan delegation.
  The browser fixture confirmed the localized explanation and disabled composer
  and attachment controls while retaining the delegation cancellation control.
- Final read-only delegation UI selection: `AssistantChat.test.ts` and
  `DesktopBotsWorkspace.test.ts`, 47 passed. Approvals and questions still submit
  their exact run/request/generation; a read-only reason is ignored by the old
  desktop shell. Normal direct Threads keep their existing composer behavior.

Stage 6 command scopes: direct Host Vitest for `host/bots/agents-mcp.test.ts` and
`host/control.test.ts`; direct Web Vitest for `core/botContext.test.ts`, the
Codex/Claude `Protocol` and `Live` files, and both Pi/OMP `Live` files. Focused
Host prompt/permission cases used `-t 'describes bounded Bot|denies every declared'`.
The existing permission-matrix test initially expected ordinary policy checks for
these new operations; it now leaves their independent callable-list checks to
`host/bots/delegations.test.ts`, and its rerun passed. No failed check is treated
as completed verification.

- Delegation runtime: all 7 new tests passed. Final scope/short-wait/deadline/
  restart refinements passed their 4-case selection; 4 existing manager slot,
  approval, cancellation and restart cases passed. Normal close and crash recovery
  retire reserved-but-unstarted tasks and stale queued work without overwriting
  a confirmed completed run. Web/Host TypeScript and final diff checks passed.
  No application build, publication, push or merge was run.
