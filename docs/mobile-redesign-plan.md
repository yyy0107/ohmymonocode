# 移动端 UI 重构计划（OpenMausBot 风格，数据流不变）

## Context
当前移动端 `src/mobile/` 是 Capacitor + React + Tailwind，视觉层由 5191 行 `mobile.css`、1045 行 `assistant.css`、
liquid glass 渲染（`liquidGlass*.ts`、`glassMotion.ts`）和一批自制 Sheet/Drawer 组成，样式与结构耦合严重，
`MobileApp.tsx`（2809 行）同时承载状态、副作用和整页 JSX。用户希望**整体替换 UI 层和样式**，
仿照 OpenMausBot 手机端（Messages 风格、22pt Composer、44pt 触控、9 套 Skin、玻璃态 Sheet），
但 **Host 客户端、store、hooks、路由/视图状态、偏好持久化等数据流保持不变**。

已确认的决策：
- 保留 Capacitor + React（不换 RN / 原生），只重写 UI 层：新 token 体系 + 新 primitives 组件库 + 各页面视图。
- 一次实现全部 9 套 Skin：Midnight、Atelier、Foundry、Lagoon、Graphite、Linen、Dusk、Daylight、Meadow。
- 信息架构（Home/Drawer/Chat/Settings 路由、Sheet 列表）不变，只换外观与布局；不新增功能（如麦克风、Call、Mascot）。

## 不动的部分（数据流边界）
以下文件只允许为适配新视图做**导出层面的**最小调整，逻辑不改：
- Host/数据：`client.ts`、`sessionListStore.ts`、`sessionSnapshotStore.ts`、`sessionCache.ts`、`sessionPreviewCache.ts`、
  `hostWorkspace.ts`、`activity.ts`、`nativeActivitySync.ts`、`notifications.ts`、`updates.ts`、`agentDefaults.ts`、
  `mobileGit.ts`、`mobileSessionChanges.ts`、`messageQueue`/`queuedDraft.ts`、`skillCommands.ts`、`storage.ts`、`pairing.ts`。
- Hooks：`useMobileActivity`、`useHostConnectionStatus`、`useMobileHostDirectory`、`useMobileGitIndex`、`useMobileSkills`、
  `useMobileAssistantUnread`、`useProbedHostStatus`、`useQueueDrag`、`useMobileTextareaAutosize` 等。
- 交互逻辑（可复用、只换样式钩子）：`sheetDrag.ts`、`drawerGesture.ts`、`keyboardMotion.ts`、`inputFocus.ts`、`haptics.ts`、
  `mobilePageState.ts`、`mobileSettingsRoutes.ts`、`lastLocation.ts`。
- 共享桌面渲染器继续复用：`AgentTranscript`、`AgentMarkdown`、`QuestionForm`、`HarnessIcon`、`sessionDisplayTitle`、
  `AnimatedCollapse`/`useCollapseMotion`、`shared/ui/icons`、`ImageLightbox`、`FilePreview`。
- 现有逻辑测试（`client.test.ts`、`*Store.test.ts`、`sheetDrag.test.ts` 等）必须继续通过且不改断言。

## 实施阶段

### 阶段 0：分离控制器与视图（无可见变化）
- 把 `MobileApp.tsx` 中全部 state/effect/handler **原样搬到** `src/mobile/app/useMobileAppController.ts`，返回一个 view-model 对象；
  `MobileApp.tsx` 变成 `const vm = useMobileAppController(); return <MobileAppView vm={vm} />`。
- 测试依赖的导出（10 个测试文件 import `./MobileApp`）保持从 `MobileApp.tsx` re-export。
- 对其它带状态的大组件（`MobileComposer`、`MobileDrawer`、`MobileHome`、`MobileSettings`、`MobileAssistant`）同样处理：
  逻辑抽到 `use*Controller`，视图只接收 props。
- 验证：`tsc --noEmit` + `vitest run src/mobile`，行为与截图不变。此阶段单独提交，便于回滚。

### 阶段 1：设计 Token 与 9 套 Skin
新目录 `src/mobile/theme/`：
- `tokens.css`：Tailwind v4 `@theme` 声明移动端语义 token（命名空间 `--m-*` 避免与桌面 `--color-accent` 冲突）：
  `app / panel / raised / raised-hover / card / composer / inset / control / hairline / ink / ink-secondary / ink-tertiary /
  accent / accent-border / focus / bubble-user / success / danger / warning`；
  尺寸：`--m-radius-lg / --m-radius-xl`（随 Skin）、`--m-radius-composer: 22px`、`--m-hit: 44px`、
  间距 8/12/16/20；字号 17/15/13/12/11；动画 `msg-in 0.18s`、`pop-in 0.2s`、`panel-in 0.24s`，曲线 `cubic-bezier(0.22,1,0.36,1)`。
- `skins.css`：`.mobile-root[data-skin="midnight"|…]` 9 套取值（Midnight 用报告中给出的值；其余 8 套实现时从 OpenMausBot
  公开仓库 `src/styles.css` 抓取对应值，缺失则按同语义推导，并跑 WCAG AA 对比度校验）。圆角按报告的 Skin 对照表。
- **桥接共享 token**：每个 Skin 同时设置桌面变量（`--window-color`、`--panel-color`、`--card-color`、`--accent-color`、
  `--color-background-base`/content、`theme-light` class），让 `AgentTranscript`/`AgentMarkdown` 自动适配，不改共享组件。
- `skin.ts`：`MobileSkin` 类型、`loadMobileSkin/saveMobileSkin/applyMobileSkin`（localStorage 键 `monocode.mobile.skin`，
  try/catch 降级）；`System` 选项 → Midnight/Daylight 按系统明暗切换。迁移：旧 `ThemePreference` dark/light/system 映射为
  Midnight/Daylight/System；用户自定义强调色仍可覆盖 `--m-accent`。
- `applyMobileSkin` 同步 `StatusBar.setStyle/BackgroundColor` 与 `<meta name="theme-color">`（复用 `MobileApp` 现有 StatusBar 逻辑位置）。
- `main.tsx`：用 `applyMobileSkin` 替换 `installLiquidGlass/installGlassMotion`；`glassSettings` 保留读取，`liquid` 规范化为 `frosted`
  （frosted = `backdrop-filter: blur(20px) saturate(1.4)` + 半透明 raised；solid = 实色）。

### 阶段 2：Primitives 组件库 `src/mobile/ui/`
每个组件纯展示、只吃 props，统一 44pt 最小点击区、`active:scale-[0.97]` 反馈、`prefers-reduced-motion` 降级：
- `Button`（primary 填充 accent / secondary 描边 hairline / ghost；高 ≥44，圆角胶囊或 12–16）、`IconButton`（40–44 圆）、
  `Pill`/`Chip`（28px、13px 字体，用于确认药丸、队列芯片、Threads 胶囊 32–36）。
- `Avatar`：圆形容器 36/44，内部放 `HarnessIcon`（遵守 AGENTS.md：会话列表图标在标题前，标题走 `sessionDisplayTitle`）。
- `ListRow`（舒适 64–72 / 紧凑行高，名字 15 semibold + 预览 13 单行省略 + 时间 12–13 + 8–10pt 未读点，选中 raised+圆角）、
  `SectionHeader`（11–12 全大写 tertiary）、`SearchField`（36–40 高，圆角 10，inset 背景）。
- `TopBar`：返回按钮 36–40 圆 + 头像 32–36 + 标题 + 右侧胶囊/图标。
- `Sheet`：顶部圆角 20、最大 90vh、grabber、Done 按钮；**内部复用 `sheetDrag.ts` + `MobileSheetPresence` 的开合/拖拽状态**，
  只替换外观；`useMobileSheetFocus` 保持。
- `Card`（radius 12–16、padding 12–16）、`SegmentedControl`（36 高）、`Bubble`（user 右对齐 accent/bubble-user、右下尖角；
  bot 左对齐 card；max-width 80%；padding 12–14 × 8–10；圆角 18–20；15–16 字号 / 22–24 行高）、
  `TypingDots`（3×8pt、跳动 3pt、间隔 0.15s）、`ImageAttachment`（max-h 300、比例裁剪 3:4–4:1、文件名 12–13）。
- 折叠一律使用 `AnimatedCollapse` / `useCollapseMotion`，不自建计时器。

### 阶段 3：逐页替换视图（每页一次提交，props/handler 不变）
按使用频率排序，每页只改 JSX 结构与 className，删掉对应 `mobile.css` 段落：
1. **Chat**：`MobileAppView` 的 chat 区 → `TopBar`；`MobileTranscript`/`MobileSessionViews` 外包 bubble 样式（通过
   `transcriptPlatform` 已有的扩展点 + 作用域 CSS 覆盖共享 transcript 的用户/助手消息为气泡），审批卡片（短标题 + 折叠 Details +
   Allow/Deny ≥40 并排）、提问卡片（选项行 44–48，圆角 12）、发送后 `TypingDots`（复用 `sendingBubble` 逻辑）。
2. **Composer**：`MobileComposer`/`MobileDraftComposer` → 22px 圆角容器，单行 44 高、多行增长；左 `+` 44 圆（附件），右侧
   36–40 accent 圆形发送箭头（禁用灰）；`composerResizeMotion`、`useMobileTextareaAutosize`、队列 `MobileMessageQueue` 保留逻辑，换芯片样式。
3. **Home / Roster**：`MobileHome`、`MobileSessionRow`、`MobileDeviceChips`、`MobileHeaderSearch`、`MobileListPreview`、
   `MobileListSkeleton` → 顶部连接状态 + 设置；分组标题；`ListRow`+`Avatar`；底部浮动栏（现有入口重新排布，不加新功能）。
4. **Drawer**：`MobileDrawer` 保留 `drawerGesture`，换成 panel 背景 + `ListRow`。
5. **Sheets**：`MobileSessionActions`、`MobileSessionStatus`、`MobileModelControls`、`MobileHostPicker`、`MobileProjectPicker`、
   `MobileConnectionSheet`、`MobileFileSheet`、`MobileToolSheet`、`MobileGitReviewSheet`、`MobileActivitySheet`、`MobileAgentSheet`、
   `MobileHomeMenu`、`MobileSelect` → 统一 `Sheet` + `ListRow`/`SegmentedControl`。
6. **二级页面**：`MobileSettings`（新增 Skin 选择器：9 宫格预览卡 + System）、`MobileConnections`、`MobileSharedConnections`、
   `MobileArchive`（同样 HarnessIcon + sessionDisplayTitle）、`MobileAgentDefaults`、`MobileProviderAccounts`、`MobileNotes`、
   `MobileAssistant`（替换 `assistant.css`）、`MobileAppUpdates`、`MobileHostUnavailable`、`MobileEmpty`。
7. **页面转场**：`MobilePageTransition`/`pageMotion.css`/`motion.css` 改用 `panel-in` 曲线；Sheet 用 spring 近似曲线；全部尊重 reduced-motion。

新增文案均用英文 key + `src/shared/i18n/zh-CN.json`（按 `docs/localization.md`），Skin 名称属于应用文案需翻译。

### 阶段 4：清理
- 删除 `mobile.css` 中所有已迁移段落直至文件删除；删除 `assistant.css`、`mobileSessionProgress.css` 等旧样式文件。
- 删除 `liquidGlass.ts`、`liquidGlassRaster`、`glassMotion.ts` 及其测试（模块整体移除）；`glassSettings` 仅保留 frosted/solid。
- `mobile.html` 的 `theme-color` 改为由 `applyMobileSkin` 动态设置；Android `mobile/android` 的 splash/窗口背景色、iOS
  `LaunchScreen` 背景改为 Midnight `#070707`。
- 搜索确认无残留 `mobile-` 旧 className 引用。

## 关键文件
- 新增：`src/mobile/app/useMobileAppController.ts`、`src/mobile/app/MobileAppView.tsx`、`src/mobile/theme/{tokens.css,skins.css,skin.ts}`、
  `src/mobile/ui/*`。
- 修改：`src/mobile/main.tsx`、`src/mobile/MobileApp.tsx` 及阶段 3 列出的视图组件、`src/shared/i18n/zh-CN.json`、`mobile.html`。
- 删除：`src/mobile/mobile.css`、`assistant.css`、`liquidGlass*.ts`、`glassMotion.ts`。
- 不改：上文"不动的部分"及 `src/features/**`、`src/styles/index.css`（桌面）。

## 验证
- 每阶段：`npx tsc --noEmit`、`npx vitest run src/mobile`（逻辑测试不改断言即通过 = 数据流未变）。
- 新增少量有意义的测试：`skin.test.ts`（偏好读写/旧主题迁移/System 映射）、Skin 对比度校验脚本（9 套 ink/背景、accent/白字 ≥ AA）。
- 视觉：`MONOCODE_MOBILE_HOST_URL=… npm run mobile:dev`，用 Playwright（`/opt/pw-browsers/chromium`）在 390×844 下对 Home、Chat
  （含审批/提问/图片/队列）、Composer 多行、各 Sheet、Settings 截图，Midnight/Daylight 全覆盖，其余 Skin 抽查 Home+Chat；
  另开 reduced-motion 检查动画降级。
- 最后一次跑 `npm run mobile:build` 确认构建通过；APK/发布（`mobile:publish`）由用户手动执行，不由我运行。
- 提交到分支 `claude/mobile-redesign-plan-opn9z3`，按阶段分提交；不自动创建 PR。
