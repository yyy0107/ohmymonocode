# Bots REA 改造交付记录（2026-10-12）

## 实现范围

保留 React / TypeScript / Vite / Tauri、monocode 品牌和头像资源。没有新增依赖、修改 Host/provider 协议、提交、推送或发布。

证据映射、修改前差异与计划见 [bots-rea-mapping.md](bots-rea-mapping.md)。审计为 Grok Bot 0.30.0 静态定义，不能证明运行态一致。

| 项目 | 改造前实测 | 改造后实测（CSS px） |
|---|---:|---:|
| 默认侧栏 | 330 | 280，宽窗口可拖拽240–400 |
| 会话行 | 70 | 54，padding8，gap8 |
| 主顶栏 | 76 | 38（采用静态fallback，不声称Grok Linux实际高度） |
| 单行输入框 | 54 / 圆角28 | 44 / 圆角22 |
| 气泡 | padding12/17 / 圆角20 | padding8/12 / 圆角18 |
| 信息面板 | 380 | 默认320 |

宽窗口的侧栏拖拽直接更新网格 token，每帧合并DOM写入，不让拖动逐像素触发 React 页面渲染；设置折叠继续使用 `useCollapseMotion` 与 `animated-collapse-size`，保留零轨道和隐藏组件生命周期。输入框仅在内容或实际宽度变化时测量高度。未改动消息行 memo、增量历史加载和流式 Markdown 机制。

## 修改文件

本次新增：

- `src/features/bots/ui/desktop-bot-tokens.css`：统一尺寸、亮色静态token；暗色沿用项目主题。
- `tests/browser/bots-rea.html`、`bots-rea.tsx`：真实组件离线夹具，60个合成Bot、长消息、代码块、会话工具卡、弹窗与错误场景。
- `tests/browser/bots-rea.capture.mjs`、`bots-rea.verify.mjs`：截图/性能记录和交互检查。
- `docs/bots-rea-mapping.md`、本交付记录。

本次修改：

- `src/features/bots/ui/desktop-bot-messenger.css`：侧栏/列表/气泡/输入/菜单/卡片/设置/窄窗/状态；仅Bot记忆弹窗关闭共享整页模糊。
- `BotChat.tsx`：引入桌面token。
- `BotAvatar.tsx`：支持28/36等规格，保留图形和色板。
- `DesktopBotsChrome.tsx`：顶栏头像28、紧凑输入框入口。
- `DesktopBotsLegacyChrome.tsx`：可选紧凑模式，多行20–120与宽度变化重新测量；旧模式保留原限值。
- `DesktopBotsWorkspace.tsx`：侧栏宽度持久化、共享拖拽钩子、键盘边界、36头像、独立菜单样式作用域。
- `BotMessages.tsx`：相邻气泡连接标记，保留memo。
- `BotMemoryDialog.tsx`：独立弹窗class。
- `src/shared/hooks/useDragResize.ts`：可选CSS属性目标，默认仍为width。
- `DesktopBotsWorkspace.test.ts`、`BotMessages.test.ts`：宽度跨保留页面同步、边界与相邻消息回归。

开始时已存在的10个文件改动保存在本地 `build/bots-rea/pre-existing.patch`。`useWorkspaceController.tsx`、`BotChatChrome.ts`、`DesktopBots.tsx`、`DesktopBots.test.ts`、`bots.css`、`desktop-bots.css` 的已有改动不属于本次实现。

## 截图与复现

本地附件目录：`/projects/monocode/build/bots-rea/`（Git忽略，不作为生产资源）。

- [前后对照页](../build/bots-rea/comparison.html)
- [改造前亮色](../build/bots-rea/before-light.png) / [改造后亮色](../build/bots-rea/after-light.png)
- [改造前设置](../build/bots-rea/before-settings.png) / [改造后设置](../build/bots-rea/after-settings.png)
- 目录内另有暗色、680/540窗口、长消息、多行输入、运行设置、菜单、收件人、空态、弹窗和发送错误截图。

前后均为Chrome 154.0.8037.97，1280×800 CSS viewport（窄窗680×800单列），DPR1，100%缩放，UTC固定时间和合成数据；亮色与暗色分别成对记录。滚动到最新位置，所以尺寸收紧后同一viewport能显示更多内容，顶部可见消息不一定相同。没有拿几何重绘图取色或推断真实字体。

复现：

```sh
npx vite --host 127.0.0.1 --port 1436
node tests/browser/bots-rea.verify.mjs
node tests/browser/bots-rea.capture.mjs after
```

`CHROME_PATH`可指定Chrome可执行文件。基线必须在修改前执行`capture.mjs before`，不能在修改后运行并当作基线。

## 检查结果

| 实际命令/检查 | 结果 |
|---|---|
| 定向Vitest：Workspace、Details、Chat、Messages、Avatar、useDragResize | 6文件80项通过（初次实现） |
| 定向Vitest：Workspace、Messages、Chat、DesktopBots、Memory | 5文件76项通过（含新增回归） |
| 最后定向Vitest：useDragResize、Workspace、DesktopBots | 3文件35项通过（网格token修正后）；与以上有重叠，不相加 |
| `npx tsc --noEmit` | 通过，最终日志`types-final.log` |
| `npm run build` | 通过，最终完整构建日志`build-final.log`；保留大chunk和第三方注释警告 |
| 最后CSS修正后 `npx vite build` | 通过，`build-css-final.log`，16.18s |
| 浏览器交互脚本 | 通过，`scenarios.json`；无pageerror |
| 单独弹窗检查 | computed backdrop-filter为none，无document横向溢出 |
| `git diff --check` | 通过 |

浏览器覆盖拖拽/键盘范围/双击复位、多行输入（外框=文本高度+56）、设置连续开关/子页返回/Escape焦点恢复/草稿保留、收件人取消、菜单取消、空会话、680/540窗口、减少动态效果、弹窗错误和取消、发送失败及重试提示。实际停止远程模型、附件上传/下载、全局设置、无限量历史和所有Host能力组合未实测。现有Chat测试覆盖发送重试、增量历史、Markdown、隐藏菜单、设置反转及移动端协议保留。

Node v24.16.0，Vite 7.3.6，Vitest 3.2.4。没有验证provider CLI兼容性，未运行Host或Rust套件（未改相关代码）。

## 性能

真实组件开发模式，180条长消息数据、部分代码块，50次模拟流式更新，4秒自动滚动；当前历史窗口按现有逻辑渲染。脚本使用CDP Performance差值和requestAnimationFrame间隔。非生产基准、单次采样，未控制机器其他进程。

| 指标 | 改造前 | 改造后 |
|---|---:|---:|
| 主线程Task累计(ms) | 2363.26 | 2644.04 |
| Layout累计(ms) | 60.34 | 41.75 |
| Style累计(ms) | 19.60 | 43.90 |
| Layout次数 | 192.00 | 173.00 |
| Style次数 | 258.00 | 282.00 |
| 帧间隔P95(ms) | 16.8 | 16.8 |
| >50ms帧 | 0 | 0 |

本样本帧间隔没有恶化，但主线程Task和Style累计增加，不能据此宣称性能提升。原始JSON和capture脚本一起保留。未取得桌面引擎相同条件的前后性能样本，也未做整页React commit计数；保留已有memo边界不能等同证明整页绝不重渲染。

## 实际桌面与仍未验证的差异

曾在正在运行的MonoCode Tauri/WebKitGTK窗口通过开发者工具加载同一离线夹具。原窗口stable开发服务禁用热更新，刷新后仍有缓存旧样式，因此采用独立1436服务验证真实WebView渲染，未将浏览器预览称为完整桌面端通过。

桌面实测：viewport约1471×666 CSS px（开发者工具占用窗口下部），DPR1.25，visualViewport.scale1，侧栏280、顶栏38、单行输入44。证据为`desktop-fixture-loading.png`与`desktop-metrics-final.png`。后者第一次查询命中隐藏保留页面得到0，第二次过滤可见元素才得到38/44；仅采用第二组。未完成native性能采样。刷新期间出现Tauri旧回调找不到的警告，不能宣称桌面零错误。

这不是同条件桌面前后截图，也不是完整真实Host端到端。中断后原桌面窗口已不在运行，最后网格拖拽token与弹窗模糊修正仅完成浏览器复验；最终版本需在重新启动的桌面应用中再次验证。未测试Windows/macOS。

其他明确差异/待验证：

- Grok实际DPR、缩放、字体回退、暗色层叠和38/44/52顶栏分支未知。
- 默认亮色采用静态root值；本项目系统字体、monocode品牌/头像、暗色主题保留。
- 工具/委派卡片业务结构不同，12px卡片圆角等是本项目适配，不证明和参考同一组件。
- 多行输入保留稳定的文字列以避免换行阈值反复切换，内部横向padding没有完全复制参考；外框/文本高度与主要圆角遵循证据。
- 相邻气泡的60秒连接判断、hover元信息、沿用的折叠/滑动时长及窄窗断点均属monocode设计，不是原版运行参数。
- 198px设置导航和700px高度属于参考全局设置弹窗，未强套Bot详情或改造monocode全局设置。
- 0.5px边框的实际像素栅格化依赖DPR；未宣称像素级一致。

补充置顶网格检查：240px侧栏下两列（单元格约106px），400px下三项各121px；72px头像及左右padding不再越过单元格。保存`after-pinned.png`和`pinned.json`。字重保留`--ui-font-weight`偏好。
