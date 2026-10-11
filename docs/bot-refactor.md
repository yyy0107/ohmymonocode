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
stored file. Surface budgets and truncation. Bound the topic-name index (initial
limit 40 topics/2,000 characters); load topic bodies, archive and logs on demand.

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
| 0 | Roadmap recorded | This document's creation commit (see git log) | Baseline, branch and unrelated-file inspection; documentation requires no tests |
| 1–8 | Not started | — | None |

Each subsequent stage records the preceding commit SHA here and its own checks
before committing. Its own SHA is resolved by the named commit in git log, then
recorded by the next stage; this avoids rewriting a commit to embed its own hash.
