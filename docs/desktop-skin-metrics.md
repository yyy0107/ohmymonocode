# 桌面皮肤尺寸对齐移动端（修订版）

桌面在 `html[data-skin]` 下改用移动端已落地的尺寸、间距、材质和动画。窗口仍是多栏工作区：菜单栏、可调侧栏、分栏、终端坞和右贴面板都保留。Classic（不设 `data-skin`）和手机壳不变。

本版相对初稿的修订，依据是与现有代码的核对结果：

- 主侧栏始终是 dense（`Sidebar.tsx` 以 `recents !== undefined` 判定，`AppView` 总会传入）。新会话行改为给 **dense 分支** 加皮肤样式，不改判定条件；`omb-session` 两行网格删除。
- `--radius-lg` / `--radius-xl` 是 Tailwind 主题变量，且每个皮肤取值不同。保留不动，新圆角用 `--omb-radius-*`。
- 桌面没有 `--color-m-*`，材质和焦点改用桌面语义色 `--color-hairline`、`--color-focus` 等。
- 按钮规格按现有类名重写；`.ui-icon-button` 只在窗口铬使用，保持 28px。
- 弹簧模块放在 `src/shared/lib/`，与现有 `motion.ts` 并列。
- 浮动顶栏、转录留白、进度胶囊搬位置属于结构改动，拆到第二轮，本轮只出方案。

## 范围

| 轮次 | 内容 | 性质 |
| --- | --- | --- |
| 第一轮 | 令牌、弹簧、按钮、侧栏行、作曲家、问题卡和审批、菜单、右贴面板、设置行 | CSS 为主，组件只补钩子节点 |
| 第二轮 | 浮动会话顶栏、转录上下留白、进度胶囊靠模型名 | 组件结构，先出交互方案 |

本轮不改：手机样式、终端网格算法、Tailwind `rounded-*` 主题变量、`dense` 判定、窗口铬尺寸。不发布安装包。

## 区域对应

| 移动端 | 桌面落点 | 轮次 |
| --- | --- | --- |
| Home 项目行 / 会话行 | 侧栏 dense 项目行和会话行 | 一 |
| 作曲家卡片 | 会话底部 `[data-composer-layout="desktop"]` | 一 |
| 转录问题卡、审批行 | `data-question-*`、`[data-approval-host]`、`.approval-toast` | 一 |
| 菜单、底页 | `.popover-frame`、`.composer-popover`、`.modal-frame`、`.omb-slide-panel` | 一 |
| 浮动顶栏 68px | 会话顶部 56px 浮动胶囊 | 二 |
| 进度胶囊 | `SessionStatusPanel`（现在 `absolute top-2 right-3`） | 二 |
| 抽屉、底页横滑、手势 | 不移植 | — |

## 令牌

新建 `src/styles/omb-metrics.css`，由 `src/styles/index.css` 在 `omb-skin.css` 之后引入。令牌和规则都挂在 `html[data-skin]` 下。不把 `src/mobile/styles/*` 引进桌面。

手机入口也会加载 `styles/index.css`，但 `applyDesktopSkin` 在手机上会删掉 `data-skin`，所以只要带前缀就不会影响手机。无前缀的 `:root` 令牌两端都可见。

### 现有 `:root` 令牌的处理

| 令牌 | 现状 | 处理 |
| --- | --- | --- |
| `--hit-sm/--hit/--hit-lg` | 已定义，没有任何读取 | 删除 |
| `--row-h` / `--row-h-compact` | `ListRow.tsx`、dense 规则在读 | 保留在 `:root`，皮肤下另设 `--omb-row` |
| `--radius-row: 10px` | `ListRow.tsx`、dense 行在读 | 保留；皮肤内的侧栏行改用 `--omb-radius-row` |
| `--radius-sheet: 16px` | `omb.css`、`.modal-frame` 在读 | 保留 16，右贴面板单独用 `--omb-radius-sheet` |
| `--radius-composer: 22px` | 已与移动端一致 | 保留 |

### 间距

| 令牌 | 值 |
| --- | --- |
| `--omb-space-2` … `--omb-space-28` | 2、4、6、8、10、12、16、18、20、22、28px，用途同初稿 |

皮肤规则里不写散值，例外只有窗口铬的既有数值。

### 高度

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--omb-hit` | 44px | 会话内主按钮、作曲家圆形动作列、问题翻页 |
| `--omb-control` | 36px | 搜索框、次按钮、分段控件、行头像 |
| `--omb-chrome` | 28px | 窗口铬、表格小图标（与现状一致） |
| `--omb-row` | 56px | 会话行 |
| `--omb-row-project` | 52px | 项目行 |

### 圆角

各皮肤的 `--radius-lg/xl` 不动。新令牌给默认值；圆角风格极端的皮肤（现有 4/8 那档、10/16 那档）在皮肤块里按比例覆盖。

| 令牌 | 默认 | 用途 |
| --- | --- | --- |
| `--omb-radius-field` | 10px | 搜索框 |
| `--omb-radius-row` | 12px | 侧栏行、选项、菜单行、项目图标砖 |
| `--omb-radius-card` | 16px | 问题卡、菜单、通知 |
| `--omb-radius-sheet` | 20px | 右贴面板左侧两角、独立对话框 |
| `--omb-radius-bubble` | 20px | 用户气泡 |
| `--radius-composer` | 22px | 输入卡（沿用现有） |

### 字号

固定像素，不跟 `--ui-font-size` 缩放：caption 11/14、meta 12/16、label 13/18、body 15/22、title 17/22。输入框 15/24。

### 材质

- 填充：卡片和胶囊用 `--color-raised` 78%，面板用 `--color-panel` 88%；实色模式填充 100%，模糊关闭。
- 模糊：沿用现有 `--glass-filter: blur(20px) saturate(1.4)`。
- 浮动阴影：深色 `0 8px 28px rgb(0 0 0 / 0.28), 0 1px 3px rgb(0 0 0 / 0.18)`，`html.theme-light` 改为 0.1 和 0.08。
- 发丝边：1px `--color-hairline`。
- 焦点环：2px `--color-focus`，偏移 2px。禁用透明度 0.45。

## 动画

把 `src/mobile/motion.ts` 的弹簧和时长挪到 `src/shared/lib/springs.ts`。`src/mobile/motion.ts` 改为再导出，`MobileDrawer.tsx`、`sheetDrag.ts`、`MobileSwap.tsx` 的导入不用改。`motion.test.ts` 继续锁住 CSS 和 JS 一致。

桌面在 `omb-metrics.css` 声明 `--omb-spring-*`、`--omb-motion-*`，数值和 `src/mobile/motion.css` 相同，三串 `linear()` 采样原样复制；不支持时退回 `cubic-bezier(0.22, 1, 0.36, 1)`。新增一条测试，断言桌面这组和手机那组字符串一致。

| 名 | 值 | 用途 |
| --- | --- | --- |
| snappy | 0.3s / 0.86，340ms | 开关滑块、分段前缘 |
| smooth | 0.36s / 0.9，400ms | 分段后缘 |
| release | 0.26s / 0.8，310ms | 按下松开回弹 |
| press | 120ms，缩到 0.97 | 按下 |
| feedback | 160ms | 颜色、开关轨 |
| msg | 180ms，自下 4px | 保持现有 `msg-in`，不改成 6px |
| pop | 200ms | 菜单（现有） |
| panel | 240ms | 右贴面板（现有） |
| workspace | 180ms | 工作区透明度（现有） |
| sidebar | 280ms | 侧栏轨道（现有） |
| collapse | 340ms | `useCollapseMotion`（现有） |
| send-kick | 320ms，`cubic-bezier(0.3, 1.4, 0.5, 1)` | 发送 0.86 → 1.08 → 1 |

按下反馈只挂在本轮列出的控件上，不做全局 `button:active`。`prefers-reduced-motion` 下时长为 0，不缩放、不位移。折叠继续用 `AnimatedCollapse` / `useCollapseMotion`。

## 侧栏（第一轮）

窗口铬不变：菜单栏 36、拖拽条 40、收起轨 48、`.ui-icon-button` 28×28；侧栏宽度 260–560，默认 264。

### 项目行

对齐 `.mobile-home-project`。组件里给项目行按钮加 `data-sidebar-project-row`，在皮肤下改掉 `h-8`。

| 部件 | 尺寸 |
| --- | --- |
| 行 | 最小高 52，内边距 6×8，缝 12，圆角 `--omb-radius-row` |
| 图标砖 | 36×36，内边距 8，圆角同行，底色 raised |
| 标题 | 15 / 600 |
| 副文本 | 12，tertiary（移动端实际是 12，不是 11） |
| 悬停 / 按下 | 背景 150ms 变到 raised |

### 会话行（dense 分支）

现状：`h-8` 单行，左缩进 `pl-8`（compact 为 `pl-[54px]`），14px `HarnessIcon` 放在 `[data-session-avatar]`，右侧是工作树图标和 `denseStatus`。dense 下不显示时间和未读点。

皮肤下改为移动端 Home 单行：

| 部件 | 尺寸 | 实现 |
| --- | --- | --- |
| 行 | 最小高 56，内边距 8，缝 12，圆角 `--omb-radius-row` | 覆盖 `h-8` 和缩进；层级缩进收到 8，用项目分组表达层级 |
| 头像 | 36 圆，内边距 9，底色 raised | 放大现有 `[data-session-avatar]`，不新增节点 |
| 标题 | 15 / 22 / 600，单行截断 | 覆盖 `text-ui-caption font-normal` |
| 置顶 | 14 | — |
| 运行中 / 待输入 | 18；运行中用 accent | 放大 `denseStatus` 的图标 |
| 时间 | 12，tertiary，不收缩 | 新增：皮肤下才渲染，与状态图标互斥（同手机） |
| 未读点 | 9×9，accent，行尾 | 新增：dense 下目前不渲染 |
| 选中 / 等待 | 背景 raised；等待为 1px warning 内描边 | 沿用 `data-session-*` |
| 悬停归档 | 图标 16，命中 32 圆，绝对定位，不撑高 | — |

快捷方式行（`shortcut`）和编排子项保持现有高度，不挂新规则。模型、状态句和分支留在悬停摘要里。

清理：删除 `omb-skin.css` 里的 `.omb-session` / `.omb-bot-avatar` 规则，以及组件里 `!dense` 分支的 `omb-session` 类和头像节点。非 dense 的布局本身保留。

### 搜索条

外框内边距 8、底边 1px；输入框高 40，圆角 `--omb-radius-field`，水平内边距 12，图标 16，字 15。

## 作曲家（第一轮）

作用在 `[data-composer-layout="desktop"]`。`.composer-field` 和 `.composer-highlight` 必须同步改字号、行高和内边距，否则镜像层会错位。

| 部件 | 尺寸 |
| --- | --- |
| 外框 `.composer-surface-with-workspace` | 圆角 22（去掉现在的 26），背景透明 |
| 输入面 `.composer-input-shell` | 圆角 22，1px composer ring，浮动阴影 |
| 文本 | 最小高 32，最大高 `min(168px, 25dvh)`，15 / 24 |
| 圆形动作（加号等） | 44×44，图标 20，透明底（取代现在的 32） |
| 发送盘 | 38×38，在 44 列里居中，accent 圆 |
| 停止 | 38 圆，底色 control，字色 ink |
| 禁用发送 | 底色 control，字色 tertiary，不降透明度 |
| 附件缩略图 | 72×72，圆角 12，删除钮 20 |

文字型模型切换：高 32，水平内边距 8，缝 4，字 15，图标 16，尾箭头 14。放不下时文字先截断，发送列不缩。

移动端的 `data-compact` 变体不移植。输入框长高如果现在是跳变，第二轮再接 `composerResizeMotion`，本轮不动。

## 按钮（第一轮）

按现有类名定义。会话内的大尺寸由场景选择器提供，不改通用类的全局含义。

| 选择器 | 高 | 水平内边距 | 圆角 | 字 |
| --- | --- | --- | --- | --- |
| `.ui-button` | 36 | 12 | 全圆 | 15 / 500 |
| `.ui-button-md` | 32 | 12 | 全圆 | 13 / 500 |
| `.ui-button-sm` | 28 | 8 | 全圆 | 12 / 500 |
| `.ui-button-primary` | 继承尺寸类；悬停只提亮 8% | — | — | 600 |
| `.ui-button-danger` | 同上；danger 字色，悬停 12% 红底 | — | — | — |
| `.ui-icon-button` | 28×28（窗口铬） | 0 | 8 | 图标 16 |
| `.ui-pill` | 目前没有使用，不改 | — | — | — |

现有用法有 `SecondaryButton`、`NotificationMuteDatePicker`、`InboxPrChecks`、`AgentTranscript:2505`，以及问题卡和审批行（见下节）。改完逐个目测，尤其是写死了 `h-6/h-7/h-8` 的节点：皮肤规则需要用 `height` 和 `min-height` 盖过工具类。

## 问题卡和审批（第一轮）

现有钩子：`QuestionForm.tsx`、`PlanPreview.tsx` 的 `data-question-*`，`ToolCallParts.tsx` 的 `data-approval-controls`，`ApprovalToasts.tsx` 的 `data-approval`。这些按钮现在是 `ui-button-md ui-button-pill h-6 text-[11px]`。

| 部件 | 尺寸 |
| --- | --- |
| 卡片 `[data-question-card]` | 圆角 `--omb-radius-card`，面板材质，内边距 12 10 10 |
| 标题 / 提示 | 13，tertiary |
| 题干 `[data-question-prompt]` | 15 / 600，行高 1.4 |
| 选项 `[data-question-option]` | 最小高 48，内边距 10×12，缝 12，间距 6，圆角 12，底色 inset |
| 选中选项 | 底色 raised，1.5px accent 内描边 |
| 折叠 `[data-question-collapse]` | 40 圆，图标 20 |
| 翻页 `[data-question-navigation] button` | 44 圆，图标 18 |
| 次动作 `[data-question-secondary]`、`[data-approval="deny"]` | 36，水平 12，全圆，15 / 500，accent 字 |
| 主动作 `[data-question-submit]`、`[data-approval="allow"]` | 44，水平 22，全圆，15 / 600，accent 底 |
| 页脚 | 上边距 10，左 6；Deny 在 Allow 左边 |

`.approval-toast` 宽度有限，用次动作 36 / 主动作 36 的紧凑版本，按钮保持 `flex-1`。

## 菜单、右贴面板、设置（第一轮）

弹出菜单（`.popover-frame`、`.composer-popover`）：最大宽 420，最大高 `calc(100dvh - 32px)`，内边距 8，圆角 `--omb-radius-card`，面板材质，浮动阴影。行最小高 44，内边距 8×12，缝 12，圆角 12，字 15，图标 22。危险行只用 danger 字色。共享边框加 0.5px、字号加 2px 只用于弹出层，右贴面板不加。

右贴面板（`.omb-slide-panel`）：行为保持现有，只把左侧两角换成 `--omb-radius-sheet`。Tailwind 的 `translate` 要和 `transform` 一起清掉；内层 modal 动画关掉。终端坞只在贴右时挂这个类，不改网格算法。

设置：内容列最大宽 720，居中。页标题 17 / 700；组标签 12；大组间距 28，组内 18；行最小高 52，内边距 16，标题 15 / 600，说明 13。开关轨 51×31、滑块 27，滑动用 snappy。分段控件高 36，内边距 2，只在已经是分段的地方启用前后缘拉伸。

## 第二轮：结构改动（只出方案）

动手前先交一份交互方案，至少回答下面这些问题：

1. **浮动顶栏**：取代 `renderHeader` 和分栏的 `h-9` 顶栏，还是叠在它们上面？分栏窄到 360px 时，44 圆钮加 108 动作组能不能放下，放不下怎么退化？拖拽手柄（`onPaneDragStart`）放在哪？
2. **转录留白**：顶部留白 56 取决于顶栏是否浮动；底部留白等于实测输入坞高度，需要 `ResizeObserver` 和现有滚动锚定配合。
3. **进度胶囊**：`SessionStatusPanel` 现在在右上角（`absolute top-2 right-3`），收起态 32px，宽屏默认展开。搬到模型名旁之后，宽屏默认态、`overrides` 记忆和 git 摘要宽度测量都要重新定。
4. **用户气泡**：最大宽 `min(80%, 720px)`，圆角 20，内边距 8×14，15 / 22。可以和顶栏一起做，也可以提前到第一轮末尾。

## 实施顺序（第一轮）

1. `src/shared/lib/springs.ts` 加手机再导出，并补测试锁住桌面和手机两组令牌一致。
2. `omb-metrics.css`：令牌和按钮；删除不再读取的 `--hit*`。
3. 侧栏：项目行加钩子，dense 会话行加皮肤样式、时间和未读点；删除 `omb-session`。
4. 作曲家：44 列、38 发送盘、22 圆角。
5. 问题卡、审批行、审批 toast。
6. 菜单、右贴面板、设置行。

## 验证

- 每步只跑相关的现有测试：`src/mobile/motion.test.ts`、新的令牌一致性测试，以及改到组件时对应的 `QuestionForm` / `AgentTranscript` / `SessionStatusPanel` 测试。
- 加一条 CSS 测试：`omb-metrics.css` 里每条规则都以 `html[data-skin]` 开头，并且文件里不出现 `--radius-lg`、`--radius-xl`。
- 改完在桌面窗口里实际检查：皮肤下侧栏、输入、问题卡、右贴设置；切到 Classic 确认尺寸不变；手机入口确认没有被影响。
