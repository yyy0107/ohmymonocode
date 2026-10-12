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

## 实施与验证记录（2026-10-12）

本次完成第 0、1、2 阶段。第 4 阶段 Host 新字段和分享模板不在范围内。
设计文档从主仓库下的设计 worktree 导入；移动端仅调整 import 路径、导入别名和 mock 导出名。

提交顺序：

1. `27d7f992 refactor(bots): move assistant dirs`：移动前端目录和 Host 线程引擎、eval；同步 import、mock、脚本排除规则、测试路径和文档链接。
2. `3f8b94b5 refactor(bots): rename assistant identifiers`：文件与导出标识符改为 Bot；冲突名称分别使用 `botView.ts`、`botRpc.ts`、`DesktopBotsLegacyChrome.tsx`；Host 引擎改为 `BotThreadRuntime`，未合并逻辑。
3. `6e2fa209 style(bots): redesign desktop messenger layout`：会话侧栏、线程选择器、SVG 头像、桌面消息气泡与附件、胶囊输入框、阅读提示、设置子页面及动画。
4. `feat(bots): add pinned bots and recipient picker`：按环境保存有序置顶列表；会话菜单和设置入口；键盘收件人选择、多选房间创建及发送重试；补充旧 Host 头像编辑降级。

实际检查结果：

| 检查 | 结果 |
| --- | --- |
| 第 0a、0b 阶段分别运行 `npm run check:web` | 每次 7284 通过、13 断言失败、15 跳过；另有 2 个测试文件加载失败。失败已在未修改的 `5d42f204` 上定向复现，并经用户接受为基线例外。 |
| 第 0a、0b 阶段分别运行下述 Host 命令 | 每次 783 通过、5 断言失败、5 跳过，另有 13 个会话清理期间的异步错误。断言失败及同类清理错误在基线复现，用户接受例外。 |
| 第 0a、0b 阶段分别运行 `node --test scripts/production-inputs.test.mjs scripts/desktop-task-publish.test.mjs` | 每次 21/21 通过。 |
| 第 0a、0b 阶段分别运行 `tsc --noEmit`、`tsc --noEmit -p host/tsconfig.json` | 均通过。由于 Web 测试失败会中断 `check:web`，类型检查单独执行。 |
| 第 1 阶段相关 Vitest | 7 个文件、82 项通过。全量运行中暴露的旧线程选择器测试已更新，随后定向验证通过。 |
| 第 2 阶段 `npm run check:web` | 7292 通过、13 断言失败、15 跳过，另有相同的 2 个文件加载失败；未新增失败。 |
| 最后一次相关 Vitest | `DesktopBotsWorkspace.test.ts`、`botPins.test.ts`、`DesktopBotDetails.test.ts`、`BotAvatar.test.ts`、`BotChat.test.ts`：66/66 通过，包含刷新后保留已选非默认线程及 Esc 焦点恢复。 |
| UI 阶段单独 `tsc --noEmit` | 通过，包括最后一次收件人选择修正后。 |
| `git diff --check`、旧路径检查 | 通过；`src`、`host`、`tests`、`scripts` 内无 `features/assistant` / `host/assistant` 引用。 |

Host 命令为：

```sh
npm --ignore-scripts run test:host -- \
  --exclude host/cli.test.ts \
  --exclude host/desktop.test.ts \
  --exclude host/desktop-upgrade.test.ts \
  --exclude host/im-service/package.test.ts
```

`pretest:host` 会构建 Host，因此禁用生命周期脚本。上述 4 个文件依赖当前 worktree 不存在的打包产物，已获用户许可跳过；没有运行构建、发布、push 或 merge。

保留的基线问题：Web 的 `MobileFileSheet.images/repro` 缺少 Capacitor `registerPlugin` mock；`MobileGitReview`、`MobileSessionProgress`、`activitySheet`、`transcript`、`FilePane.agent`、`AgentTranscript.firstPaint/interjection` 共 13 个断言失败。Host 的 `large-sync`（2）、`server`（2）、`bots/thread/chatSearch`（1）断言失败；`native/manager` 和 `legacy-orchestration` 有 workflow-skill 临时目录清理期间的异步错误。未在本任务中修复这些无关问题。

浏览器验证使用 `.claude/launch.json` 的 `npm run dev` 启动方式。原配置端口已占用，使用独立的 `127.0.0.1:1436`；通过真实组件与模拟 RPC 数据验证，未连接实际 Host 执行模型任务。Chrome/Playwright 验证了亮色、暗色、680px 和 540px 窗口、置顶刷新保留、搜索隐藏网格、线程切换、设置宽度与快速反向切换、收件人键盘操作、房间发送、减少动态效果，以及阅读位置保持、新消息数量和回到底部。未观察到浏览器页面异常。

截图保存在当前 worktree 的 `.claude/bots-ui-{light,dark,settings,narrow,compact,recipient,recipients,threads,new-messages}.png`。相关命令日志保存在 `.claude/bots-verification/`。这些预览和日志是被 Git 忽略的本地验证附件，未提交到仓库。

保留的 assistant 命名兼容例外：RPC `assistant.*`；Host capability 与事件名；协议字段（例如 `assistant`、`assistantId`、`assistantName`）；SQLite 表/列；磁盘路径；既有 localStorage/缓存键（含 `monocode.assistant-*`）；通知 target；原有英文 i18n key；Android `AssistantNotificationState`；移动端组件名及导入别名；既有 `assistant-*` CSS 类；模型输出协议标记。目录和导出 API 的重命名没有改变这些值。
