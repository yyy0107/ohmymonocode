# 桌面皮肤尺寸与密度

## 当前规格：收回桌面密度（2026-10-12）

本节取代后文历史方案中的手机尺寸。只调整 `html[data-skin]` 下的尺寸、间距、字号和动画幅度；现有九种皮肤的颜色、材质、阴影、弹簧曲线、动画时长与组件结构保留。Classic 不设置 `data-skin`，手机入口主动清除此属性，两者不应用这些规则。

本次没有收到 Claude Desktop 截图，采用任务给定的桌面起始值，没有声称按截图实测对齐。

### 尺寸令牌与落点

尺寸集中在 `src/styles/omb-metrics.css`，颜色继续留在 `omb-skin.css`。`--radius-lg/xl` 不重定义。

| 令牌 | 当前值 | 用途 |
| --- | --- | --- |
| `--omb-hit` | 32px | 常规按钮、圆形输入动作、菜单行、进度胶囊 |
| `--omb-control` | 28px | 中号按钮、问题/审批动作、发送/停止、选择器、分段外壳、标签 |
| `--omb-control-sm` | 24px | 小号按钮、分段选项、上下文条按钮 |
| `--omb-chrome` | 28px | 窗口图标按钮，保持原尺寸 |
| `--omb-row` / `--omb-row-project` | 32px / 32px | 默认会话行与项目行 |
| `--omb-option` / `--omb-settings-row` | 36px / 44px | 问题选项、设置行最小高度 |
| `--omb-switch-*` | 宽 32、高 18、滑块 14、内边距 2、行程 14px | Radix 两档、手写按钮、复选框加 span |
| `--omb-radius-field/row/card/sheet/bubble/composer` | 8 / 8 / 12 / 16 / 16 / 18px | 对应紧凑尺寸；气泡保留 6px 尾角 |
| `--omb-radius-capsule` | 999px | 进度胶囊；其余胶囊与圆钮继续全圆 |

| 区域 | 当前尺寸 / 字体 |
| --- | --- |
| 默认侧栏 | 行 32；图标位 20，图标 16；会话标题 13/500，项目名 13/600，行高 18；时间 11；分组/展开更多 28；每层缩进 12 |
| 紧凑侧栏 | 行 28；图标位 16，图标 14；分组/展开更多 24；其他文字与层级继承默认令牌 |
| 侧栏搜索 | 输入框 32，字 13；筛选按钮 28，图标 16 |
| 通用按钮 | `.ui-button` / `.primary-action` 32，md 28，sm 24；字 13，主按钮字重 600 |
| 输入框 | 卡片圆角 18，内边距 8×12×6；正文与镜像均为 14/22；最小高 32，最大高保持 160 |
| 输入框工具条 | 圆钮 32 / 图标 16；发送与停止 28 / 图标 16；模型、权限选择器 28 / 字 13；上下文条 32 / 字 12 |
| 问题卡 | 题干 14/600；选项最小 36 / 字 13；翻页、折叠、Skip、Back、Continue、Deny、Allow 都为 28；主动作 600 |
| 审批 toast | 两种动作均 28 / 字 13，保留现有布局与顺序 |
| 菜单 | 行最小 32，字 13，图标 16，行圆角 8，容器圆角 12，内容层内边距 4 |
| 设置 | 行最小 44，内边距 6×12；标题 14/500/20，说明 12/16；分段外壳 28、选项与指示块 24，字 13 |
| 标签条 / 进度 / 跳到最新 | 标签与工具钮 28；进度收起外框 32；跳到最新 28 |
| 用户气泡 / 空状态 | 气泡 14/22、内边距 8×12；空状态标题 18/24、说明 13 |

表中字号是在默认缩放下的目标。保留现有 `postcss-font-scale` 对字面量字号的处理，不改变用户的字号设置行为。

### 动画与实现边界

- 按压缩放 `0.98`；发送弹跳 `0.92 → 1.04 → 1`，仍为 320ms，原 easing 不变。幅度令牌放在 metrics；skin 内原有关键帧只引用它们。
- 共享 snappy/smooth/release 采样和时长不变；手机仍保留自身按压幅度。测试继续校验共享曲线、时长、桌面选择器前缀与 Tailwind 圆角隔离，移除“桌面幅度必须等于手机”的旧约束。
- 开关继续用 `translate` 覆盖 Tailwind 的位移；分段指示块保留前后缘不同弹簧。减少动态效果规则增加方向选择器的同等特异性，避免被 `forward/back` 的 transition 子属性覆盖。
- 进度胶囊头部为 30px，外框最小 32px，包含边框；没有固定外框高度，展开/收起内容仍由原 `AnimatedCollapse` 控制。
- 菜单的 4px 内边距放在 Popover 的实际内容层以及 composer-popover 上，玻璃外框不叠加 padding。列表选择器中的 `option` 保持其原有内容密度。
- 有说明或多行文字的设置行、问题选项、菜单项自然增高，表中的数值是最小高度。停止按钮颜色、输入框最大高度、进度位置、转录遮罩、缩放偏好与所有折叠逻辑均沿用原实现。

### 分步实施与检查记录

1. **尺寸与动画实现**：集中更新尺寸令牌、侧栏两档、输入框、问题/审批、菜单、设置、标签与正文；同步调整现有动画测试的幅度约束。
   - 执行 `npx vitest run src/styles/omb-metrics.test.ts src/shared/theme/desktopSkin.contrast.test.ts src/features/settings src/app/shell/ProjectSessionSection.test.ts src/app/shell/ProjectList.test.ts src/shared/theme/desktopSkin.mobile.test.ts src/mobile/motion.test.ts`：38 个文件、702 项通过（Vitest 3.2.7）。输出含 React `act(...)` 警告，无失败。
   - 随后执行 `npx tsc --noEmit`：通过，无诊断。
   - 核对真实 Popover 层级后只调整菜单 padding 落点，复跑 `npx vitest run src/styles/omb-metrics.test.ts`：3 项通过。此后仅 CSS/文档变化，不重复全组检查。
   - `git diff --check`：通过。没有构建、推送、合并或发布。
2. **双引擎样例测量与最终复核**（独立文档提交）：
   - 用组件实际类名、data 钩子及 Popover 内容层构造本地样例，套真实 Vite 样式。`tauri:stable` 不监听文件变化；每次单独请求 `/src/styles/omb-skin.css?direct&t=<时间戳>` 与 `/src/styles/omb-metrics.css?direct&t=<时间戳>`，覆盖旧 `index.css` 中的缓存。
   - 浏览器面板：Chromium **154.0.0.0**。WebKitGTK：系统包 **2.52.6-0ubuntu0.26.04.1**，通过 `xvfb-run -a /usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser http://127.0.0.1:18765/` 启动；页面将测量结果 POST 到本地 Python HTTP 服务。脚本、样例与 JSON 留在 `/tmp/monocode-desktop-density/`，不加入应用入口。
   - 覆盖全部九种皮肤 × 默认/紧凑两档，每种情形采集 99 个节点的尺寸和计算样式。39 类目标高度逐项跨引擎比较，**18 组全部一致，最终 0 项目标偏差**。菜单外框 padding 0、内容层 padding 4；输入框与镜像的字号、行高、四边 padding 一致。
   - Radix default/sm、手写 `button[role="switch"]`、checkbox + spans 都为 **32×18 / 14px 滑块**；滑块关闭距左 2、开启距左 16，实际行程 **14px**，两种引擎一致。
   - 分段块高 **24px**；前进、后退时的两个弹簧位置不同，保留拉伸；落点与按钮对齐。Chromium 最大横向差约 **0.025px**，WebKitGTK 为 0。发送关键帧实测 **0.92 / 1.04 / 1**。开启应用的减少动态效果偏好后，开关与分段 transition 为 **0s**、发送 animation 为 **none**；系统 `prefers-reduced-motion` 分支保持同样规则。
   - 九种皮肤的颜色、浮动阴影、玻璃滤镜以及 `--radius-lg/xl` 令牌前后相同。移除 `data-skin` 的 Classic 样例、设置手机标记且移除 `data-skin` 的样例，前后尺寸/字体/圆角等采集值没有差异；手机入口清除桌面属性另由 `desktopSkin.mobile.test.ts` 两项测试覆盖。
   - 首轮测量发现并修正：进度外框的边框额外撑高、带分段控件的设置行被 padding 撑高、嵌套项目图标未随图标位缩小、分段方向样式覆盖减少动态效果。"展开更多"样例最初误加了 `py-1`，按真实组件的类名修正后符合 28/24px，无需改组件。
   - **实际偏差/限制**：有说明的设置行自然增高（样例 Chromium **50.8px**、WebKitGTK **51px**），而最小高仍为 44；非固定尺寸的边框与文字布局存在亚像素差异，不强行裁剪说明。xvfb 下有 GTK 模块/DRI3 加速警告，但页面加载、POST 及尺寸检查完成；这不验证原生窗口或滚动性能。

### 真实窗口待用户确认

代码、指定测试与双引擎静态样例检查已完成；**没有启动或验收真实 Tauri 窗口，没有在实体手机上操作**。请用户重启 `tauri:stable`（其 Vite 禁用文件监听），依次检查侧栏默认/紧凑两档、输入框、问题卡/审批、设置开关与分段控件、菜单；再切到 Classic。已有的进度和折叠动画、原生玻璃及 WebKitGTK 滚动体验仍以真实窗口为准。

本次分两步提交：尺寸/动画实现（`eef4f4c6`，含规格和自动检查记录），以及本节双引擎验证记录。没有修改或提交用户已有的 `MenuBar.tsx`、`WindowChrome.tsx` 改动与未跟踪交接文件；未构建、推送、合并或发布。

## 历史方案与实施记录（已被上文尺寸取代）

以下保留上一轮的设计理由、结构决策及偏差供追溯，出现的 44/56/51×31 等手机尺寸不再是当前目标。

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

## 第一轮实施记录

与上文不同的地方：

- 停止按钮保留现有的 ink 圆盘，不改成 control 底：好几个皮肤的作曲家底色等于 raised，control 底在上面看不见。
- 输入框最大高度保持 160px，与 `COMPOSER_MAX_HEIGHT` 一致；长高已有合成器动画，不需要再改。
- 菜单只放大 `menuitem*` 行和作曲家加号菜单；选择器里的 `option` 列表只换圆角，保持原密度。弹出层内边距不动。
- 设置里的分段控件只做了 36px 外壳和选中块，没有做前后缘拉伸：现有 `Segmented` 是每个按钮各自着色，没有独立的指示块。
- `.ui-button-md` / `-sm` 的皮肤规则降为单类特异性，场景选择器（问题卡、审批）可以覆盖它们。
- 审批 toast 的按钮保持现有 `flex: none` 加排序，尺寸统一为 36px。
- 主侧栏的群组行（会话分组）高 40px，图标列与会话头像对齐；群组内的会话行左侧多缩进 20px。

## 第一轮之后的补充

- **紧凑侧栏**：外观设置里新增"紧凑侧栏"（`monocode.compactSidebar`，默认关闭，只在非 Classic 皮肤下显示）。打开后 `html.compact-sidebar` 把侧栏尺寸变量切到桌面密度：会话行和项目行 36px，头像和图标砖 24px，标题 13px，未读点 6px。布局和 56px 版本相同，只是数值不同。
- **开关统一**：皮肤下所有开关都是 51×31 轨道、27px 滑块，滑块用 snappy 弹簧。覆盖共享的 Radix `Switch`（两种 size）、`SkillsPage` / `NativeSessionsPanel` / `DeleteWorktreeDialog` / `AutomationsView` 里手写的 `button[role="switch"]`，以及 `ProjectNotificationSettings` 的复选框加 span 写法。
- **用户气泡**：提前完成。圆角 20/20/6/20，内边距 8×14，字 15/22；chat 布局最大宽 `min(80%, 720px)`。

## 第二轮交互方案

### 现状

- 会话顶部不是标题栏，是 `SessionSurfaceToolbar` 渲染的**标签条**（`SurfaceTabs`）：聊天标签、打开的文件标签、终端和变更开关、溢出菜单。它同时是窗口拖拽区（`data-tauri-drag-region="deep"`），在 `ownerTopBar` 模式下还承载窗口按钮。分栏时，每栏各有一条。
- 输入框在会话列里随文档流排布，不浮在转录上；转录已经支持滚动容器自带底部内边距（`pinToBottom` 会扣掉它），这是给手机的浮动作曲家准备的。
- `SessionStatusPanel` 浮在转录右上角（`absolute top-2 right-3`）。宽度 ≥1280px 时默认展开，展开状态按会话记在 `overrides` 里。

### 1. 浮动顶栏：建议不做，改为调整标签条样式

手机顶栏是"返回 + 标题 + 动作组"。桌面这一条承担的是多标签切换和窗口拖拽，换成浮动标题会丢掉文件标签，或者要再叠一层。建议：

- 标签条保留在文档流里，高度不变（窗口铬尺寸不动）。
- 皮肤下的聊天标签和文件标签改成 32px 胶囊：圆角 999、水平内边距 12、字 13/500，选中项用 raised 底。
- 终端、变更开关和溢出菜单改成 32px 圆形图标钮，图标 16。
- 分栏窄到放不下时沿用现有截断规则，不另做退化。

因为顶栏不浮动，原计划的"转录顶部留白 56"也一起取消。

### 2. 转录底部留白：只在输入框浮动时才需要

如果不把输入框改成浮动，就不需要实测高度。可选方案：

- **A（建议）**：保持输入框在文档流里，只给输入坞加 8px 的渐隐遮罩，让转录内容在输入框上沿柔和地消失。改动小，不碰滚动逻辑。
- **B**：输入框绝对定位浮在转录上，转录的底部内边距由 `ResizeObserver` 实测输入坞高度设置（复用 `pinToBottom` 已有的扣除逻辑）。效果最接近手机，但会影响跳到最新、搜索定位、分栏拖动，需要单独测一轮。

### 3. 进度胶囊：保留右上角，只改形态

把胶囊搬到模型名旁边要动输入框工具条的布局，而工具条在窄栏已经很挤（模型、权限、模式胶囊会横向滚动）。建议：

- 位置保持右上角，宽屏默认展开、`overrides` 记忆都不变。
- 收起态改成手机浮动胶囊：最小高 44、内边距 8×12、圆角 24、面板材质和浮动阴影，计数 11px 等宽。
- 展开态：圆角 16，组距 16，任务行最小高 48、字 13，命令摘录最多两行等宽。
- 收起和展开继续用 `AnimatedCollapse`，宽度变化沿用现有的测量方式。

### 需要确认

1. 顶栏：同意"保留标签条、只改样式"吗？
2. 输入框：选 A（流内加渐隐）还是 B（真浮动）？
3. 进度胶囊：同意"保留在右上角、只改形态"吗？

## 第二轮实施记录

按确认的方案实施：

- **标签条**：只作用于会话标签条（`[data-session-surface-tabs]`），文件窗格和终端坞的标签条不变。聊天和文件标签是 32px 胶囊，选中用 raised 底，标签之间的竖线分隔去掉；关闭钮 22px 圆；终端、变更和溢出菜单是 32px 圆形钮，图标 16；项目标签改成 inset 底的胶囊。
- **输入框（方案 A）**：没有用颜色渐变，而是给 `.agent-transcript` 加了 8px 的底部遮罩。原因：Mac/Windows 原生玻璃下主壳背景是 40% 透明，纯色渐变会出现色带；遮罩只淡化内容本身，任何背景下都成立。
- **进度胶囊**：位置、宽屏默认展开、展开记忆都没变。收起态圆角 24、高 44；展开态圆角 16；头部 44px，折叠钮 32px 圆；分组标题 13/600；任务行字 13、行高 1.5、内边距 6×8。任务行没有用 48px 最小高：桌面面板只有 20rem 宽，任务多时 48px 一行太占高度。

## 收尾小项

- **发送动画**：消息被接受后，作曲家给发送列加 320ms 的 `data-send-kick`，发送或停止按钮按 0.86 → 1.08 → 1 弹一下。被拒绝的发送不弹；减少动态效果时关闭。
- **跳到最新**：36px 圆，浮动阴影，距输入框 12px。
- **空状态**：`DiscussionEmpty` 最小高 260、内边距 48×28、说明 15/1.5、最宽 320；新会话的标题 20/28、字重 650、字距 -0.3px。
- **转录图片**：助手消息里的图片最高 300px；单独成段的图片圆角 12，行内小图不加圆角。用户发送的图片缩略图圆角从 19 改为 12。原计划里的"文件名 12"在桌面没有对应元素，没有做。
- **右侧终端坞**：贴右时卡片圆角 20。
- **分段控件**：加了独立的选中块，前缘走 snappy、后缘走 smooth，移动时会拉伸后回弹；Classic 下隐藏选中块，仍用原来的按钮底色。方向在同一次渲染里随新选项一起确定，避免第一次移动用错时序。
