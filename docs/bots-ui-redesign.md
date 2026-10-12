# Desktop Bots UI redesign (IM style)

Goal: restyle the desktop Bots page from the current "navigator + nested threads +
dense header" layout into a messenger-style layout (reference screenshots 1/3/4
supplied by the user). Desktop only; the mobile assistant stays frozen
(see `docs/bot-refactor.md`). Behaviour, RPCs, caches and capability fallbacks stay
unchanged unless a phase below says otherwise.

## Reference design (what the screenshots show)

1. **Sidebar (~330px, light grey background)**
   - Top row: right-aligned `+` (new conversation). Host picker moves here (left).
   - Rounded search field (`搜索`).
   - **Pinned bots grid**: large avatars (~72px) with name below, 3–4 per row.
   - **Conversation list**: one row per bot — 40px avatar, name, right-aligned
     time (`6:05`), one-line muted preview, blue unread dot on the right.
     Selected row = rounded grey fill; no borders, no chevrons.
   - Footer: plain icon rows (`插件` / user in the reference → in Monocode:
     团队, 房间, 已归档的 Bot 和线程).
2. **Chat area**
   - Header: small avatar + bot name only; minimal chrome. Right side: icon
     buttons (settings/inspector toggle) — no text-heavy status row.
   - Messages: user = dark bubble (black/near-black, white text, large radius),
     assistant = light grey bubble; consecutive assistant messages stacked as
     separate bubbles with small gaps; no timestamp/copy row under every message
     (show on hover). Hover actions to the side: reaction, reply, more (`…`).
   - Attachments: bordered card (file-type icon tile, filename, size, download icon).
   - Floating round "scroll to bottom" button above the composer; top pill
     "↑ 31 条新消息 ×" when unread messages are above the viewport.
   - Composer: full-width pill, `+` on the left, placeholder `给 {bot} 发消息`,
     round dark mic/send button on the right.
3. **New conversation** (`+`): main area header becomes `收件人：搜索或创建 Bot`
   with a dropdown card: `+ 创建新 Bot`, then all bots (avatar + name), keyboard
   highlight, footer hints `Tab 添加` / `↵ 打开`. Sidebar shows a temporary
   `新建` row at the top while drafting.
4. **Settings inspector** (right panel): header `‹  设置  »` (back / collapse);
   large centered avatar; fields 名称, 标签（可选）, 描述; a 通知 toggle card;
   bottom full-width `分享为模板` button.

## Mapping onto Monocode

| Reference | Monocode source of truth |
| --- | --- |
| Conversation row | `BotView` + newest thread activity (`useBotUnread`) |
| Avatar | `bot.avatar` (≤8 code points). When empty, a generated avatar |
| Threads (not in reference) | Header thread switcher + inspector, not sidebar nesting |
| Pinned grid | New per-host local preference (Phase 2) |
| 标签 / 描述 | Not in `AssistantView`; needs Host field (Phase 4, optional) |
| 通知 toggle | Reuse an existing per-bot setting if present; otherwise Phase 4 |
| 分享为模板 | Out of scope (no feature behind it) |
| 插件 / user row | Replaced by 团队 / 房间 / 归档 entries |

## Phases

### Phase 0 — Unify the `assistant` folders under Bots (pure rename, no behaviour change)
Done first, in its own commits, so the UI work lands on the new paths.

- Frontend: `git mv src/features/assistant src/features/bots`. Then rename files
  and exported identifiers `Assistant*`/`assistant*` → `Bot*`/`bot*` inside it
  (e.g. `AssistantChat` → `BotChat`, `assistant.css` → `bots.css`,
  `assistantClient.ts` → `botRpc.ts`, `DesktopAssistant*` → `DesktopBots*`).
  Resolve collisions with existing `bot*` files by merging only when trivial,
  otherwise pick a distinct name (e.g. `assistant.ts` → `botView.ts`).
- Host: `host/assistant` is the per-Thread engine used by `BotManager`; move it to
  `host/bots/thread/` (avoids collisions with `host/bots/store.ts`, `memory.ts`),
  and `host/assistant/eval` → `host/bots/eval`. Update `host/tsconfig.json`
  exclude, `scripts/production-inputs.mjs` eval regex and their tests
  (`scripts/production-inputs.test.mjs`, `scripts/desktop-task-publish.test.mjs`),
  plus `host/assistant-image-read.test.ts` → `host/bot-image-read.test.ts`.
- Update every importer (`src/**`, `src/mobile/**` import paths only, `host/**`,
  `tests/**`), docs that link the old paths, and `vi.mock` path strings.
- **Must stay unchanged** (wire/persisted compatibility): RPC methods
  `assistant.*`, Host capability names, event names, protocol field names,
  SQLite tables/columns, files on disk, localStorage/cache keys, notification
  targets, i18n keys' English text, Android `AssistantNotificationState`, and
  mobile component names/styles (mobile is frozen; only its imports change).
  CSS class names may stay `assistant-*` in this phase; renaming them is optional
  and only together with all selectors and tests.
- Commits: (a) directory moves + import fixes only, (b) file/identifier renames.
  Verify each with `npx tsc` via `npm run check:web` and `npm run test:host`
  (Host paths moved), plus the two script tests.

### Phase 1 — Layout and visual restyle (no data changes)
- `BotNavigation` in `DesktopBotsWorkspace.tsx`: flat conversation list (one row
  per bot) with avatar, name, time of newest activity, one-line preview, unread
  dot (keep numeric count in `aria-label`). Remove the nested thread list from the
  sidebar. Keep team grouping only when teams exist (collapsible heading using
  `AnimatedCollapse`). Rooms stay as rows in the list (room icon avatar).
- Sidebar header: host picker left, `+` right; search below.
- Footer: 团队 / 房间 / 归档 as icon rows.
- New `BotAvatar` component (`src/features/bots/ui/BotAvatar.tsx`): renders
  `bot.avatar` text/emoji when set; otherwise a deterministic inline-SVG blob
  (shape + colour picked from a hash of `bot.id`, two eye dots). Sizes: 24/40/72/96.
  Use it in sidebar, header, recipient picker, archive and inspector.
- `DesktopBotsHeader` (`DesktopBotsChrome.tsx`): avatar + name, thread title as a
  compact switcher button (`HarnessIcon` + `sessionDisplayTitle`) opening a
  popover listing the bot's active threads + `新建对话`. Lifecycle status shown
  only when not idle/ok (small dot + text); pause/stop/settings move to icon
  buttons and an overflow menu.
- Messages (desktop bots layout only, gated by `botsLayout` / scoped CSS under
  `.desktop-bots-workspace`): dark user bubble, light grey assistant bubbles,
  timestamps + copy shown on hover, attachment cards restyled as above.
  Do not change the mobile or legacy assistant chat.
- Composer: pill style with `+` left and round send/mic right; placeholder
  `Message {bot}` → zh `给 {bot} 发消息`.
- Scroll-to-bottom button and "N new messages" pill: reuse existing jump/unread
  logic if present in `BotChat` (ex-`AssistantChat`); only restyle. If missing, add minimal
  versions driven by existing read positions.
- Error banners (e.g. `database is locked` + 继续): compact inline card that
  matches the new bubble radius.
- Inspector (`DesktopBotsSettingsPanel`): header `‹ 设置 »`; root page shows large
  avatar, name/avatar fields and rows linking to existing sub-pages (运行时,
  记忆, 活动, 自动化, 委派, 线程设置). Sub-pages slide in; `‹` returns. Width
  ~380px; keep `useCollapseMotion` + stable zero-width track.

### Phase 2 — Pinned bots and recipient picker
- Pinned bots: store ordered bot IDs per `environmentId` (localStorage with
  try/catch, same pattern as other desktop bot prefs). Pin/unpin from a row
  context menu and from the inspector. Grid hidden when empty; hidden while
  searching. Archived bots are dropped from the grid.
- Recipient picker replaces the current "New bot" entry: `+` opens the draft
  surface with `收件人` input + dropdown (`创建新 Bot` first, then filtered bots).
  ↑/↓ moves highlight, Enter opens the bot's last/default thread, `创建新 Bot`
  opens the existing `BotSettings` (ex-`AssistantSettings`) create form. Tab adds a recipient chip;
  with ≥2 chips and `roomsSupported`, sending creates a room with those members
  (otherwise Tab is hidden). Escape closes the picker. Temporary `新建` row at
  the top of the sidebar while the draft is open.

### Phase 3 — Polish
- Hover action bar on messages (reply / copy / more) reusing existing handlers.
- Dark theme tuned via Monocode theme variables (no hard-coded colours except
  generated avatar palette).
- Narrow windows: close inspector first, then collapse sidebar (existing rule).

### Phase 4 — Optional Host fields (only if the user confirms)
- `description?: string`, `tags?: string[]`, `notify?: boolean` on Bot +
  `AssistantPatch`, Host validation, migration-free defaults, capability flag.
  The inspector shows these fields only when the capability is advertised.

## Constraints (from AGENTS.md and bot-refactor.md)
- All new labels go through `t()` with zh-CN entries in `src/shared/i18n/zh-CN.json`.
- Thread rows anywhere (switcher, archive) keep `HarnessIcon` + `sessionDisplayTitle`.
- Every disclosure animates both ways via `AnimatedCollapse` / `useCollapseMotion`;
  respect reduced motion; keep hidden surfaces mounted (terminals, chats).
- Styles scoped under `.desktop-bots-host` / `.desktop-bots-workspace`.
- Do not touch mobile components or `assistant.*` legacy behaviour.

## Verification
- Update `DesktopBotsWorkspace.test.ts` / `DesktopBotDetails.test.ts` for changed
  structure; add tests only for new behaviour (pin persistence, picker keyboard,
  avatar determinism).
- `npm run check:web`; focused vitest files. Visual check in the dev preview,
  light and dark. No builds or publication.
