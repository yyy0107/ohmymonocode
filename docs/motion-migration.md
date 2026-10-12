# Motion 迁移清单

盘点时间：2026-10-12。此清单在实现开始前生成，基于当前工作区（包含用户已有未提交改动）。范围为桌面、共享层与移动端全部原有手写动画，四个提交按共享层 → 桌面端 → 移动端 → 清理组织。

## 统一规则

`src/shared/motion/tokens.ts` 为唯一 Motion 参数来源：ease `[0.22,1,0.36,1]`，msg 0.18s、pop 0.2s、panel 0.24s、collapse 0.2s；sheet spring 400/38、drawer 380/36、press 600/30。桌面/移动各一个根 MotionConfig，显式 reduced-motion 立即完成 sheet/drawer/page（MotionConfig 本身仍允许 opacity，需要组件零时长）。仅使用免费 MIT Motion，React 从 `motion/react` 引入。

已阅读项目 `.agents/skills/motion/SKILL.md` 与 Motion MCP 免费文档：AnimatePresence、Motion component、MotionConfig、layout、drag/useDragControls/useAnimate。参考：[AnimatePresence](https://motion.dev/docs/react-animate-presence)、[MotionConfig](https://motion.dev/docs/react-motion-config)、[layout](https://motion.dev/docs/react-layout-animations)、[drag](https://motion.dev/docs/react-drag)。

不改变状态/store/路由/事件的业务含义；sheetDrag/drawerGesture 判定保留纯函数。保留 PTY 挂载、隐藏/closing inert 与 SurfaceVisibility、快速反向、缓存内容、焦点/原生 Back、键盘元数据与跟随时机。流式文字移除逐字视觉动画。列表使用 auto-animate，简单 hover/按压与 loading/思考/光标等常驻循环保留 CSS。setTimeout/rAF 候选逐项审查：业务轮询、debounce、长按阈值、焦点调度与直接拖动采样不等同动画计时器。

## 重点替换地图

| 文件/区域 | 动画用途 | 替代方案 |
|---|---|---|
| `src/shared/ui/AnimatedCollapse.tsx` | disclosure、高度、保留内容与 grid lifetime | 保留名字/props；AnimatePresence + height:auto；useCollapseMotion 使用 Motion completion，稳定零轨、隐藏 inert、保留 PTY |
| `src/shared/ui/{Modal,Popover,StatusToast,SearchableSelect,DateTimePicker}.tsx` | 弹出层/选择器开合 | AnimatePresence + pop；DateTimePicker 由调用方 Popover 控制；toast TTL 为业务计时 |
| `src/shared/ui/{ImageLightbox,ParticleText,RollingClock}.tsx`、`src/shared/hooks/useImageZoom.ts` | 缩放、粒子装饰、数位切换 | Motion values/animate/presence，粒子可删除装饰；保留 pinch/阈值与 clock 策略 |
| `src/shared/hooks/{useListReorderMotion,useAnimatedReorder}.ts` | 列表 FLIP、ghost 位移/回弹 | auto-animate + Motion values/animate，保留排序/自动滚动交互 |
| `src/app/shell/{SidebarTransition,SidebarMain}.tsx` | 侧栏/rail 宽度与主区域 | panel + layout；direct resize 不过渡 |
| `src/features/workspace/{hooks/useTabCloseMotion,ui/SurfaceTabs,ui/PaneTree}.tsx` | 标签增删排序、split/fullscreen、pane 出入 | auto-animate/AnimatePresence/layout；删除完成 fallback timer |
| `src/features/terminal/ui/ProjectTerminalDock.tsx` | dock 开合 | 共享 Motion collapse/layout；PTY 不卸载 |
| `src/features/sessions/ui/{TranscriptContentMotion,AgentTranscript}.tsx` | 新消息、prompt rise、自制滚动弹簧、工具阶段 | msg + layout:position + Motion animate/value/completion |
| `src/features/sessions/ui/wordFade.tsx` | 流式逐字 reveal 与 linger | 删除逐字视觉与其动画计时 |
| `src/features/sessions/{model/composerResize,ui/Composer,ui/useComposerDockMotion,ui/SessionPane}` | composer 高度、首次发送下移 | 保留测量/insertion，layout/layoutId |
| `src/features/quick-composer/ui/{useQuickPickerMotion,QuickComposer}` | picker 高度与渐现 | layout/pop；保留 native fit observer |
| `src/features/sessions/ui/BtwSheet.tsx` | composer/sheet 交接 | layoutId/presence；移除双 rAF/WAAPI |
| `src/features/sessions/ui/{turnCelebration,BtwQuestionBurst,AstraWelcome,OpusWelcome,ComposerRunner}`、terminal background | 一次性/canvas 装饰 | Motion completion 或删除装饰，保留状态/freshness gating |
| bots swipe、workflow toast/landing、settings reveal/background、editor search | 手势位移、高亮、装饰与非 React 面板 | Motion value/animate/completion，业务 TTL/判定保留 |
| `src/mobile/{MobileSheetPresence,MobileSheet,sheetDrag}` | sheet 进退场、drag/半全 detent/回弹、anchor | AnimatePresence、drag:y、controls/value/transform + sheet spring；判定与焦点/keyboard/placement 原样保留 |
| `src/mobile/{MobileDrawer,drawerGesture}` | drawer pull/push/回弹 | drag:x + drawer spring；纯阈值函数/long press/haptic 原样保留 |
| `src/mobile/MobilePageTransition.tsx`、`styles/page-motion.css` | 页面前后转场与缓存 header | AnimatePresence popLayout + panel；保留前后方向、两层边界、快速反向同实例、缓存滚动/输入/hidden |
| `src/mobile/{keyboardMotion,useMobileSheetFocus}` | 键盘 inset 与 sheet placement/focus 联动 | Motion values + completion；保留 native listeners/metadata/follow/clearance/layout 时机 |
| `src/mobile/{composerResizeMotion,MobileComposer,MobileSwap}` | composer scale/counter-scale、内容切换 | layout / presence；删除旧采样模块与 fallback timer |
| `src/mobile/{MobileMessageQueue,MobileTranscript,useQueueDrag}` | 队列重排、消息入场、ghost | auto-animate / msg + layout:position / Motion value |
| `src/mobile/glassMotion.ts` | 背景玻璃装饰 | 当前工作区不存在；检查实际 appearance/background 入口 |
| `src/mobile/motion.css` 与 `styles/*.css` | search、dock、sheet/page、notice、capsule/toggle、send 等 | 行为动画全部迁到 Motion；仅指定 CSS 反馈/常驻循环保留 |
| `src/shared/lib/{motion,springs,dampedMotion}.ts` | 手写 timing/CSS spring/数值积分 | 迁移所有调用后删除；不保留第二套动画引擎 |

## 全仓搜索候选（逐文件）

行号为迁移前位置；命中不代表必须删除，例如业务定时器与允许保留的循环 CSS。清理阶段记录最终保留理由。

| 文件 | 动画用途/候选 | 计划替代 | 初始命中行 |
|---|---|---|---|
| `src/app/controller/useWorkspaceController.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 2237, 2304, 7205, 7641, 7652, 8159, 8346, 8360, 9122, 9273, 11778, 11781, 11800 |
| `src/app/hooks/useIdleSessionDetach.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 135 |
| `src/app/model/harnessFlush.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 17, 19 |
| `src/app/model/preloadNavigation.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 15, 16, 20 |
| `src/app/shell/ClosingTab.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 40, 41, 43 |
| `src/app/shell/MenuBar.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 186 |
| `src/app/shell/ProjectList.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 379 |
| `src/app/shell/ProjectSessionSection.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 1661, 1668, 2026 |
| `src/app/shell/ProviderUsageBar.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 379 |
| `src/app/shell/SidebarMain.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 88 |
| `src/app/shell/SidebarTransition.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 |  |
| `src/app/shell/UsageProviderChip.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 217 |
| `src/app/shell/useUpdateStatus.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 54, 91 |
| `src/features/bots/ui/BotAttachmentCard.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 21 |
| `src/features/bots/ui/BotChat.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 413, 436 |
| `src/features/bots/ui/BotImSettings.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 97, 100 |
| `src/features/bots/ui/BotSettings.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 577 |
| `src/features/bots/ui/DesktopBotActivity.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 46, 47 |
| `src/features/bots/ui/DesktopBotDelegations.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 62, 63 |
| `src/features/bots/ui/DesktopBotRoomChat.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 63, 64 |
| `src/features/bots/ui/DesktopBotsButton.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 72, 148 |
| `src/features/bots/ui/DesktopBotsChrome.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 156 |
| `src/features/bots/ui/DesktopBotsWorkspace.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 158, 159, 171, 177, 298 |
| `src/features/bots/ui/bots.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 126, 137, 140, 142, 147, 264, 419, 433, 802, 923, 926, 929, 962, 965, 968, 990, 993, 996, 1138, 1256, 1315, 1320 |
| `src/features/bots/ui/desktop-bot-collaboration.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 35, 73 |
| `src/features/bots/ui/desktop-bot-delegations.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 10, 23 |
| `src/features/bots/ui/desktop-bot-messenger.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 36, 66, 80, 96, 121, 132, 164 |
| `src/features/bots/ui/desktop-bots.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 156, 392, 396, 832, 837 |
| `src/features/bots/ui/useBotDraft.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 14, 39 |
| `src/features/bots/ui/useBotMessageSwipe.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 208 |
| `src/features/bots/ui/useBotReplyMenu.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 13, 64 |
| `src/features/connections/model/connections.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 474, 490, 504, 593, 762 |
| `src/features/connections/model/hostWorkspace.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 206, 240 |
| `src/features/connections/ui/ConnectionsSettings.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 79, 122, 141, 174 |
| `src/features/connections/ui/RemoteSession.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 557, 641, 663, 1119 |
| `src/features/files/editor/editorScrollbar.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 161 |
| `src/features/files/editor/editorSearch.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 732 |
| `src/features/files/model/editorResource.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 16, 40 |
| `src/features/files/model/fileIndex.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 22, 68 |
| `src/features/files/model/fileTree.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 16, 128 |
| `src/features/files/ui/BinaryFileView.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 90, 181 |
| `src/features/files/ui/ExplorerMenu.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 88, 115 |
| `src/features/files/ui/FileEditor.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 311, 342, 781, 983 |
| `src/features/files/ui/FilePreviewSearch.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 179, 196 |
| `src/features/files/ui/FileTree.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 782 |
| `src/features/inbox/ui/InboxView.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 3123 |
| `src/features/notes/ui/NotesView.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 738, 774 |
| `src/features/notifications/model/notificationPreferences.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 186, 197 |
| `src/features/orchestration/model/orchestrationRuntime.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 1450, 1980, 2008 |
| `src/features/orchestration/ui/OrchestrationPreview.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 101 |
| `src/features/projects/ui/CwdPicker.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 146 |
| `src/features/projects/ui/ProjectSearch.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 99 |
| `src/features/projects/ui/SearchableProjectPicker.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 161 |
| `src/features/providers/model/providerAccountCredentials.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 164 |
| `src/features/quick-composer/model/launchDelivery.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 23, 84 |
| `src/features/quick-composer/model/prepareQuickComposer.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 39, 40, 45 |
| `src/features/quick-composer/ui/QuickComposer.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 166, 293, 320 |
| `src/features/quick-composer/ui/QuickGitPopup.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 83 |
| `src/features/quick-composer/ui/useQuickPickerMotion.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 63, 68 |
| `src/features/search/ui/QuickOpen.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 269 |
| `src/features/search/ui/SearchView.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 125, 210 |
| `src/features/sessions/data/nativeSessions.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 50, 117, 258, 265 |
| `src/features/sessions/data/sessionStore.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 719 |
| `src/features/sessions/hooks/useTranscriptSelection.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 73 |
| `src/features/sessions/model/composerResize.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 83 |
| `src/features/sessions/model/handoffTurn.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 23 |
| `src/features/sessions/ui/AgentMarkdown.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 456 |
| `src/features/sessions/ui/AgentTabView.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 70, 81, 109 |
| `src/features/sessions/ui/AgentTranscript.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 14 |
| `src/features/sessions/ui/AgentTranscript.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 671, 682, 1076, 1102, 2060, 2655, 3192, 4347, 4353, 4372, 4527, 4532 |
| `src/features/sessions/ui/ApprovalToasts.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 91 |
| `src/features/sessions/ui/AstraWelcome.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 10, 21, 32, 72, 80, 103, 133, 156, 209, 222, 240, 249, 258, 272, 290, 307, 326 |
| `src/features/sessions/ui/AstraWelcome.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 42 |
| `src/features/sessions/ui/AttachmentList.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 133, 155, 161 |
| `src/features/sessions/ui/BtwQuestionBurst.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 57 |
| `src/features/sessions/ui/BtwSheet.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 582, 596, 610, 622, 639, 641, 664 |
| `src/features/sessions/ui/Composer.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 526, 1018, 1071 |
| `src/features/sessions/ui/ComposerRunner.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 448 |
| `src/features/sessions/ui/CopyTurnButton.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 51 |
| `src/features/sessions/ui/ModelPicker.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 42, 100, 105, 111, 115, 128, 147, 175, 180, 186, 194, 225, 231, 238, 245, 254 |
| `src/features/sessions/ui/ModelPicker.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 1519 |
| `src/features/sessions/ui/OpusWelcome.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 10, 21, 35, 69, 94, 117, 149, 162, 177, 186, 196, 215, 229, 248 |
| `src/features/sessions/ui/OpusWelcome.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 127 |
| `src/features/sessions/ui/PlanPreview.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 60 |
| `src/features/sessions/ui/PromptOutline.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 123, 165, 225 |
| `src/features/sessions/ui/SessionPane.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 630 |
| `src/features/sessions/ui/SessionReview.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 121 |
| `src/features/sessions/ui/SessionStatusPanel.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 142 |
| `src/features/sessions/ui/ToolDiffPreview.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 34, 61, 104 |
| `src/features/sessions/ui/TranscriptContentMotion.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 45 |
| `src/features/sessions/ui/TranscriptFind.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 42, 58 |
| `src/features/sessions/ui/UserLinkPreview.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 217, 226 |
| `src/features/sessions/ui/promptLaunch.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 48, 74, 104 |
| `src/features/sessions/ui/turnCelebration.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 33 |
| `src/features/sessions/ui/useComposerDockMotion.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 47 |
| `src/features/sessions/ui/wordFade.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 265, 298, 300, 337 |
| `src/features/settings/model/appearance.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 518 |
| `src/features/settings/model/newThreadBackgroundEffects.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 149, 181 |
| `src/features/settings/ui/SettingsView.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 564, 5568 |
| `src/features/settings/ui/SharedStateStatus.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 30 |
| `src/features/skills/ui/SkillPromptField.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 154 |
| `src/features/skills/ui/SkillsPage.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 14 |
| `src/features/source-control/hooks/useProjectDiffStats.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 15, 135 |
| `src/features/source-control/model/useReviewSource.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 166 |
| `src/features/source-control/ui/BranchPicker.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 123 |
| `src/features/source-control/ui/CreateBranchDialog.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 20 |
| `src/features/source-control/ui/CreateWorktreeDialog.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 35 |
| `src/features/source-control/ui/GitChangesPanel.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 161, 313 |
| `src/features/source-control/ui/GitHistoryGraph.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 591 |
| `src/features/source-control/ui/GitReviewChangeCard.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 79, 86, 87 |
| `src/features/source-control/ui/ReviewDiffsWorkerPool.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 54, 111 |
| `src/features/source-control/ui/ReviewSourceSelect.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 16, 31, 37, 58 |
| `src/features/source-control/ui/UnifiedDiffView.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 683 |
| `src/features/source-control/ui/WorktreePicker.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 68 |
| `src/features/terminal/ui/ProjectTerminalDock.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 162 |
| `src/features/terminal/ui/TerminalGridBackground.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 395 |
| `src/features/terminal/ui/TerminalView.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 417, 484, 497 |
| `src/features/workflows/kit/app-shell/WorkflowRunPhaseList.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 147 |
| `src/features/workflows/kit/components/ui/toast.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 245, 251, 254, 266, 407, 438 |
| `src/features/workflows/kit/components/workflow-timeline/use-timeline-viewport.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 67, 70, 74 |
| `src/features/workflows/kit/components/workflow-timeline/use-typewriter.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 105, 119 |
| `src/features/workflows/kit/components/workflow-timeline/workflow-face-motion.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 31, 38 |
| `src/features/workflows/kit/settings/saved-workflows/useSavedWorkflowsDirectoryWatch.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 43, 55 |
| `src/features/workflows/model/workflowSessionWatch.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 27, 59 |
| `src/features/workflows/workflows.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 64, 70, 75, 80, 117, 140, 155, 175, 208, 211, 244, 247, 250, 275, 282, 286, 287, 292, 296, 301, 304, 309, 312, 317, 330, 337, 342, 351, 366, 376, 379, 383, 385, 396, 400, 403, 415, 428, 430, 441, 451, 454, 471, 501, 504, 507, 513, 517, 519, 531, 541, 553, 564, 567, 569, 581, 594, 602, 611, 623, 629, 635, 641, 647, 652, 657, 662, 668, 697, 720, 723, 732, 733, 742 |
| `src/features/workspace/hooks/useTabCloseMotion.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 |  |
| `src/features/workspace/model/tabKeys.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 261 |
| `src/features/workspace/ui/PaneTree.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 594, 638, 1320 |
| `src/features/workspace/ui/TabGroupMenu.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 168, 181 |
| `src/features/workspace/ui/WorkspacePicker.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 271, 552 |
| `src/integrations/harness/core/auth.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 90, 122 |
| `src/integrations/harness/core/child.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 104, 232 |
| `src/integrations/harness/core/jsonRpc.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 106, 178, 183 |
| `src/integrations/harness/core/registry.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 112, 173 |
| `src/integrations/harness/core/titleCoordinator.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 24, 95, 102, 131, 135 |
| `src/integrations/harness/providers/antigravity/antigravity.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 71, 334 |
| `src/integrations/harness/providers/claude/claude.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 173, 1746, 1913, 1968 |
| `src/integrations/harness/providers/claude/claudeCatalog.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 336 |
| `src/integrations/harness/providers/claude/claudeText.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 207, 434 |
| `src/integrations/harness/providers/codex/codex.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 80, 396 |
| `src/integrations/harness/providers/codex/codexAccountRequest.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 85, 91 |
| `src/integrations/harness/providers/codex/codexCatalog.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 291, 297 |
| `src/integrations/harness/providers/codex/codexText.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 167 |
| `src/integrations/harness/providers/cursor/cursor.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 91, 101, 1005, 1144 |
| `src/integrations/harness/providers/cursor/cursorCatalog.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 473, 479 |
| `src/integrations/harness/providers/grok/grokCatalog.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 142 |
| `src/integrations/harness/providers/hermes/hermes.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 558 |
| `src/integrations/harness/providers/hermes/hermesCatalog.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 105 |
| `src/integrations/harness/providers/opencode/opencode.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 1443 |
| `src/integrations/harness/providers/opencode/opencodeText.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 440 |
| `src/integrations/harness/providers/pi/piCatalog.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 52, 68 |
| `src/integrations/harness/providers/pi/piClient.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 53 |
| `src/integrations/harness/providers/pi/piFamily.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 1151, 1154, 1197, 1200 |
| `src/integrations/harness/providers/pi/piText.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 167, 172 |
| `src/integrations/workflow/dynamic-workflow/analysis/callbacks.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 89 |
| `src/main.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 63, 74, 75 |
| `src/mobile/MobileAppUpdates.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 26 |
| `src/mobile/MobileComposer.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 132, 203 |
| `src/mobile/MobileConnections.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 69, 107 |
| `src/mobile/MobileDrawer.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 177, 217, 248, 376, 418 |
| `src/mobile/MobileFileSheet.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 146 |
| `src/mobile/MobileGitReviewSheet.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 164, 202 |
| `src/mobile/MobileHome.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 159, 242 |
| `src/mobile/MobilePageTransition.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 59 |
| `src/mobile/MobileQrScanner.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 50, 91 |
| `src/mobile/MobileSessionStatus.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 43 |
| `src/mobile/MobileSheet.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 71, 316, 341, 382, 386, 398, 399, 400, 403, 430, 485 |
| `src/mobile/MobileSheetPresence.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 |  |
| `src/mobile/MobileSwap.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 34 |
| `src/mobile/MobileToolSheet.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 128 |
| `src/mobile/app/useMobileAppController.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 440, 455, 653, 698, 1212, 1381 |
| `src/mobile/client.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 261, 726 |
| `src/mobile/composerResizeMotion.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 111 |
| `src/mobile/keyboardMotion.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 199, 313, 314, 315 |
| `src/mobile/mobileLazy.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 28, 34 |
| `src/mobile/motion.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 71, 90, 95, 102, 107, 117, 123, 146, 149, 152, 158, 167, 171, 176, 179 |
| `src/mobile/outputHaptics.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 4, 58 |
| `src/mobile/sessionListStore.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 20, 21, 33, 88 |
| `src/mobile/sheetDrag.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 175, 319, 327 |
| `src/mobile/styles/03-header.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 24, 59, 62, 65, 69, 76, 79, 297 |
| `src/mobile/styles/04-forms.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 126, 234 |
| `src/mobile/styles/05-home.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 148, 369, 409, 439, 465, 490, 561, 585, 592 |
| `src/mobile/styles/06-chat.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 112 |
| `src/mobile/styles/07-composer.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 205, 209, 211, 239, 246, 284, 288, 290, 296, 305, 308, 324, 327 |
| `src/mobile/styles/08-sheets.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 5, 45, 61, 83, 88, 96, 103, 130, 133, 135, 140, 144, 147, 150, 153, 155, 175, 437, 684, 717, 719, 739 |
| `src/mobile/styles/09-transcript.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 3, 154, 518, 536, 554, 562, 573, 703, 868 |
| `src/mobile/styles/10-drawer.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 105, 117, 125, 129, 152, 161, 177, 377, 384 |
| `src/mobile/styles/11-settings.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 153, 156, 223, 230, 373, 392, 406, 417 |
| `src/mobile/styles/12-sheet-pages.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 330, 369 |
| `src/mobile/styles/assistant.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 40, 154, 215, 231, 246, 256, 467, 490, 570, 728, 826, 841, 879, 882, 885, 896, 921, 998 |
| `src/mobile/styles/git-review.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 120, 127 |
| `src/mobile/styles/notes.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 8 |
| `src/mobile/styles/page-motion.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 29, 32, 34, 42, 51 |
| `src/mobile/styles/provider-accounts.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 136, 140 |
| `src/mobile/theme/tokens.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 68, 74, 80, 86, 144 |
| `src/mobile/useHostConnectionStatus.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 18, 27 |
| `src/mobile/useMobileActivity.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 317, 381 |
| `src/mobile/useMobileAssistantUnread.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 28, 59 |
| `src/mobile/useMobileGitIndex.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 30, 54 |
| `src/mobile/useMobileHostDirectory.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 34, 61 |
| `src/mobile/useMobileSheetFocus.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 13, 53, 54, 55, 56 |
| `src/mobile/useMobileTextareaAutosize.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 38 |
| `src/mobile/useQueueDrag.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 129, 147 |
| `src/platform/tauri/pty.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 28, 122 |
| `src/shared/hooks/useAnimatedReorder.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 135, 269, 274, 347, 349, 398 |
| `src/shared/hooks/useDragResize.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 108 |
| `src/shared/hooks/useImageZoom.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 115, 118 |
| `src/shared/hooks/useListReorderMotion.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 102 |
| `src/shared/lib/dampedMotion.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 |  |
| `src/shared/lib/drag.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 110 |
| `src/shared/lib/reducedMotion.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 |  |
| `src/shared/lib/springs.ts` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 106, 113 |
| `src/shared/ui/AnimatedCollapse.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 42, 147, 205 |
| `src/shared/ui/HoverSummary.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 133, 251 |
| `src/shared/ui/ParticleText.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 229, 234 |
| `src/shared/ui/ReadonlyTextEditor.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 99, 262 |
| `src/shared/ui/RollingClock.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 51, 55, 82, 87, 92, 97, 109 |
| `src/shared/ui/SearchableSelect.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 106 |
| `src/shared/ui/StatusToast.tsx` | 动画 helper / DOM 动画 / 生命周期或业务调度候选 | 视觉动画交给 Motion value/layout/presence 完成回调；逐项区分并保留业务计时与事件逻辑 | 33, 51, 97 |
| `src/shared/ui/composer-notice.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 51 |
| `src/shared/ui/omb/omb.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 45, 56, 64, 72 |
| `src/shared/ui/status-toast.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 43, 47, 80, 91, 121, 127, 134, 151, 155, 161 |
| `src/styles/desktop-controls.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 16, 38, 55, 73, 88, 99, 103, 104, 106, 110, 122, 127, 129, 140, 143, 151 |
| `src/styles/desktop-workspaces.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 12, 30, 31, 57, 58, 60, 68, 70, 72 |
| `src/styles/index.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 302, 401, 450, 459, 510, 535, 541, 546, 623, 667, 677, 694, 787, 918, 1009, 1015, 1090, 1101, 1133, 1153, 1165, 1175, 1187, 1195, 1204, 1227, 1245, 1251, 1281, 1309, 1312, 1330, 1349, 1359, 1379, 1388, 1400, 1410, 1424, 1427, 1461, 1474, 1500, 1506, 1527, 1537, 1565, 1569, 1574, 1582, 1585, 1594, 1608, 1622, 1637, 1652, 1744, 1747, 1998, 2140, 2193, 2227, 2247, 2257, 2274, 2355, 2457, 2463, 2598, 2790, 2886, 2919, 2929, 2938, 2947, 3156, 3325, 3337, 3340, 3350, 3355, 3359, 3369, 3373, 3385, 3424, 3470, 3476, 3482, 3533, 3564, 3573, 3581, 3592, 3596, 3600, 3612, 3619, 3646, 3673, 3676, 3687, 3693, 3697, 3701, 3704, 3715, 3726, 3738, 3742, 3749, 3760, 3873, 3883, 4115, 4123, 4131, 4142, 4166, 4177, 4185, 4190, 4197, 4224, 4230, 4243, 4258, 4269, 4288, 4297, 4304, 4318, 4338, 4357, 4366, 4371, 4383, 4394, 4401, 4404, 4416, 4419, 4427, 4437, 4442, 4457, 4462, 4471, 4475, 4481, 4641, 4654, 4675, 4679, 4680, 4705, 4710, 4772, 4802, 4811, 4827, 4838, 4847, 4869, 4887, 4916, 4927, 4930, 4941, 4954, 5001, 5011, 5028, 5052, 5066, 5071, 5080, 5092, 5096, 5102, 5108, 5189, 5224, 5226, 5242, 5246 |
| `src/styles/omb-metrics.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 141, 616, 700, 719, 723 |
| `src/styles/omb-skin.css` | 进出场、尺寸/位置、状态反馈或常驻循环（按选择器逐项检查） | 进出场/尺寸/位置移入 Motion；列表移入 auto-animate；仅 hover/按压/loading 等循环保留 CSS | 78, 82, 86, 90, 94, 98, 102, 106, 111, 115, 119, 123, 256, 533, 560, 565, 568, 589, 635, 696, 736 |

## 实施、测试与视觉证据

以下记录实际完成的迁移与验证；未执行的原生设备场景单独说明。

## 实施结果

共享参数统一在 `src/shared/motion/tokens.ts`；使用 Motion 14.1.0、AutoAnimate 0.10.0，两个包均为 MIT。桌面主窗口、独立 Quick Composer 窗口和移动入口均有根 MotionConfig。应用现有动画偏好与系统 reduced-motion 同时生效；Sheet、Drawer、页面和共享弹层显式使用零时长策略，运行中切换策略也能收敛。

- 共享层：AnimatedCollapse 保留组件名、props、lazy/keepMounted、onEntered、SurfaceVisibility、inert、反向和 PTY 生命周期；height:auto / grid 轨道由 Motion 驱动。Modal/Popover/选择器/Toast/图片缩放/时钟使用 presence、MotionValue 与完成回调。列表增删排序统一 AutoAnimate，拖动项/ghost 使用 Motion。新增 PresenceBoundary 只包装原来条件卸载的菜单：每次重新打开保留原来的新实例语义，退出期间禁用交互，隐藏祖先立即撤下门户。
- 桌面：侧栏/rail、tab 增删、pane/split/fullscreen、terminal dock、settings、workflow/bot/文件面板、箭头/开关、Composer 高度与发送反馈完成迁移。消息用 msg，流式内容立即显示，位置变化 layout="position"；工具/审批披露复用 AnimatedCollapse。自动跟随滚动由 Motion animate 重定向，用户滚动意图与暂停/恢复规则保留。
- 移动：Sheet drag="y"、Drawer drag="x"、useDragControls/useMotionValue/useTransform；松手仍调用原纯判定函数。Page 用 popLayout，保留前后方向、缓存、两层边界和快速反向；keyboardMotion 保留原生事件/时长/曲线元数据，用 MotionValue 跟随；anchored Sheet 用 useScroll。Composer layout、queue AutoAnimate、消息/搜索/浮层/开关均完成迁移。
- 装饰：删除逐字/逐词视觉 pacing；移除闲置 ComposerRunner 物理模拟、被动 terminal board 连续模拟及全局主题/玻璃背景颜色淡变，保留静态装饰。显式 arcade 游戏的规则与动画活动暂停逻辑保留，帧调度改由 Motion。循环 loading/思考/光标和简单 hover/按压反馈仍为 CSS。

### 删除的旧模块

| 路径 | 原用途与处理 |
|---|---|
| `src/shared/lib/motion.ts` | 手写 DOM/WAAPI 过渡 helper；所有消费者改 Motion 后删除 |
| `src/shared/lib/springs.ts` | CSS linear() spring 曲线/时长生成器；改共享 tokens 后删除 |
| `src/shared/lib/dampedMotion.ts` | 数值积分动画引擎；滚动/装饰改 Motion 后删除 |
| `src/mobile/composerResizeMotion.ts` | Composer rAF scale/counter-scale；改 layout 后删除 |
| `src/mobile/motion.ts` | 移动 CSS spring 生成转导；改 tokens 后删除 |
| `src/mobile/styles/page-motion.css` | 删除页面进退 keyframes；静态定位规则迁到 `page-layout.css` |
| `src/features/sessions/model/composerRunner.ts` | 仅供旧装饰动画的物理模型；现静态 mascot + Motion exit，无消费者 |
| `src/features/sessions/model/composerRunner.test.ts` | 上述闲置物理模型的帧/轨迹专项；随模型删除，UI 生命周期回归仍在 |

`glassMotion.ts`、名为 `keyboardMotion.ts` 的其他桌面模块、`pageMotion.css` 在初始工作区没有对应文件；盘点覆盖实际的 glass/background、移动 keyboardMotion 与 page-motion.css。

### CSS 清理

删除结构性进出场、高度/宽度/grid、位移/回弹、segmented indicator、页面方向、Composer resize/send kick、折叠箭头与一次性装饰的 keyframes/transition/animation；删除相应 spring 自定义属性、旧 animationend/transitionend/fallback timer 接线。主要涉及 `src/styles/{index,desktop-controls,desktop-workspaces,omb-metrics,omb-skin}.css`，bots/workflow CSS，shared toast/clock CSS，以及 `src/mobile/motion.css` 和 `src/mobile/styles/` 的 sheet/drawer/header-search/page/composer/transcript 等段落。`index.html` 的启动进场 keyframes/transition 删除，启动遮罩退场由根 Motion 处理。静态样式与布局保留。

### 测试修改原则及专项

业务断言（RPC、路由、draft/选择、焦点、PTY、隐藏/关闭禁用、缓存、反向、滚动中断和队列）保留；对退出节点的查询限定当前 non-inert 表面，或者等待实际完成，避免命中仍为退出动画保留的旧节点。未修改已知基线失败的业务断言来使测试变绿。

- `AnimatedCollapse.test.ts` 删除只针对旧 WAAPI/rAF/deadline 后端的实现断言，保留双向、反向、首次/保留挂载、门户与交互、onEntered、live reduced 回归。
- `sheetDrag.test.ts` 删除旧 CSS transition 字符串、rAF 数量与旧动画时钟断言，保留纯阈值和 detent/header/grip/scroll/viewport 交互；原 settleDetent 函数和 8 条纯判定断言逐字一致。`drawerGesture.ts` 与 `drawerGesture.test.ts` 整文件逐字一致。
- `motion.test.ts` 从旧 CSS spring 字符串测试改为 tokens/免费 import/presence/drag/无旧 timer 契约；`omb-metrics.test.ts` 仅删除与旧 spring 生成器同步的专项，其余尺寸/skin 断言保留。
- wordFade、各 Transcript/Bot/Remote pacing 专项改为收到的完整内容立即显示，并保留 history/background/restored/节点 identity；这是本次明确要求的流式显示方式。
- AgentTranscriptScroll 的旧积分器单帧 8px/停顿 180px 上限改为 Motion 单调有界重定向与终点/中断验证，滚动业务规则保留。
- ComposerRunner/TerminalGridBackground 测试改为现有静态装饰的挂载/测量/exit-once/reduced 与被动场景不连续调度，显式游戏逻辑断言保留。TerminalSpinner 原 80ms glyph interval 专项改为 CSS animationPlayState，offscreen/background/reduced/hidden/StrictMode 断言保留。
- 新增 tokens 参数/引用与无字面量 Motion 时长扫描；新增 PresenceBoundary 快速重开状态重置；新增 Radix live reduced 保留输入子树与隐藏门户；Sheet 三种 placement、Drawer、Page 前后方向均验证 reduced 首帧到位；Composer 附件弹层验证 live reduced 时输入节点 identity。
- 测试工具驱动 Motion 自身 frameSteps 或局部几何边界，AutoAnimate 保留原生 WAAPI；HappyDOM 取消 Promise rejection 被消费，并按真实 duration/delay/iterations 完成。没有给生产增加动画定时器。


### 修改/新增测试逐文件清单

下表列出本任务相对初始工作区的测试文件变化；未列入未改动的逻辑测试。

| 文件 | 原因 |
|---|---|
| `src/app/App.appViews.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/app/shell/ActivityBar.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/app/shell/MenuBar.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/app/shell/ProjectList.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/app/shell/ProjectSessionSection.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/app/shell/SidebarMain.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/app/shell/SidebarRename.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/app/shell/SidebarTabs.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/app/shell/SidebarTransition.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/app/shell/UsageProviderChip.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/bots/ui/BotChat.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/bots/ui/BotChatPacing.test.ts` | 按要求完整 chunk 即时显示；保留 history/streaming/identity 规则 |
| `src/features/bots/ui/BotMemory.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/bots/ui/BotMessageMeta.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/bots/ui/BotMessages.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/bots/ui/DesktopBotsWorkspace.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/bots/ui/useBotMessageSwipe.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/connections/ui/ConnectionsSettings.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/connections/ui/RemoteSession.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/connections/ui/RemoteTranscriptPacing.test.ts` | 按要求完整 chunk 即时显示；保留 history/streaming/identity 规则 |
| `src/features/inbox/ui/InboxNotificationMenu.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/inbox/ui/InboxPrChecksRepair.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/inbox/ui/InboxViewWorkspace.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/inbox/ui/LinkedWorkItemPanel.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/notifications/ui/NotificationMuteControl.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/notifications/ui/ProjectNotificationSettings.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/providers/ui/ProviderAccountUsage.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/quick-composer/main.test.ts` | 仅适配新增根 MotionConfig 的包装层 |
| `src/features/quick-composer/ui/QuickComposer.commands.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/quick-composer/ui/useQuickPickerMotion.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/model/composerRunner.test.ts` | 删除：仅旧装饰物理模型/动画帧专项，模型已无消费者 |
| `src/features/sessions/ui/AgentTranscript.historyMotion.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/ui/AgentTranscript.promptRise.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/ui/AgentTranscript.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/ui/AgentTranscriptErrorDisclosure.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/ui/AgentTranscriptPacing.test.ts` | 按要求完整 chunk 即时显示；保留 history/streaming/identity 规则 |
| `src/features/sessions/ui/AgentTranscriptScroll.test.ts` | 旧积分器帧上限改 Motion 收敛/重定向；滚动意图与中断断言保留 |
| `src/features/sessions/ui/ApprovalToasts.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/ui/AttachmentChip.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/ui/BtwQuestionBurst.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/ui/ComposerPopover.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/ui/ComposerRunner.test.ts` | 旧装饰动画专项改静态/exit-once/无被动调度；显式游戏与生命周期保留 |
| `src/features/sessions/ui/ModelPicker.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/ui/SessionStatusPanel.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/ui/useComposerDockMotion.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/sessions/ui/wordFade.test.ts` | 按要求完整 chunk 即时显示；保留 history/streaming/identity 规则 |
| `src/features/settings/ui/SettingsView.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/settings/ui/TitleModelSettings.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/skills/ui/SkillsPage.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/source-control/ui/GitChangesPanel.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/source-control/ui/GitReviewPane.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/source-control/ui/ReviewDiffViewer.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/source-control/ui/ReviewSourceSelect.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/source-control/ui/Worktrees.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/terminal/ui/TerminalGridBackground.test.ts` | 旧装饰动画专项改静态/exit-once/无被动调度；显式游戏与生命周期保留 |
| `src/features/terminal/ui/TerminalView.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/workflows/kit/components/ui/motion-presence.test.ts` | 新增：Radix live reduced 输入 identity、隐藏门户立即清理 |
| `src/features/workspace/ui/PaneTreeEnter.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/workspace/ui/PaneTreeSurfaces.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/features/workspace/ui/SessionSurfaceToolbar.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/integrations/harness/providers/codex/codexApprovalUi.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/MobileAgentSheet.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/MobileAssistant.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/MobileDrawer.test.ts` | 真实 Motion 生命周期/手势；新增 reduced 首帧到位 |
| `src/mobile/MobileHome.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/MobileListPreview.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/MobilePageTransition.test.ts` | 真实 Motion 生命周期/手势；新增 reduced 首帧到位 |
| `src/mobile/MobileProjectPicker.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/MobileSessionProgress.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/MobileSessionTranscript.test.ts` | 逐字 pacing 专项改即时 chunk，入场/历史/审批等业务断言保留 |
| `src/mobile/MobileSheet.test.ts` | 真实 Motion 生命周期/手势；新增 reduced 首帧到位 |
| `src/mobile/MobileToolSheet.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/activitySheet.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/activityUi.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/composer.test.ts` | Motion resize/附件 presence；新增 live reduced 输入 identity |
| `src/mobile/connectionSettings.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/followUpSettings.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/keyboardMotion.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/messageQueue.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/mobileLazy.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/motion.test.ts` | 旧 CSS spring 字符串专项改 tokens/drag/presence/无旧 timer 契约 |
| `src/mobile/projectPickerFlow.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/sessionLoading.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/sheetDrag.test.ts` | 旧 CSS/rAF 后端专项改真实 Motion 手势；原 8 条纯判定逐字保留 |
| `src/mobile/transcript.test.ts` | 逐字 pacing 专项改即时 chunk，入场/历史/审批等业务断言保留 |
| `src/mobile/updates.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/useMobileSheetFocus.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/mobile/useQueueDrag.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/shared/hooks/useAnimatedReorder.test.ts` | 旧 FLIP/WAAPI 时钟改 AutoAnimate；顺序/并发/拖拽行为保留 |
| `src/shared/hooks/useAnimatedReorderConcurrency.test.ts` | 旧 FLIP/WAAPI 时钟改 AutoAnimate；顺序/并发/拖拽行为保留 |
| `src/shared/hooks/useAnimatedReorderFloating.test.ts` | 旧 FLIP/WAAPI 时钟改 AutoAnimate；顺序/并发/拖拽行为保留 |
| `src/shared/hooks/usePauseOffscreenAnimation.test.ts` | 旧 glyph interval 专项改 CSS animationPlayState，6条暂停行为保留 |
| `src/shared/motion/tokens.test.ts` | 新增：统一参数及组件引用、不写死 Motion 时长/弹簧 |
| `src/shared/ui/AnimatedCollapse.test.ts` | 删除旧 WAAPI/deadline 后端专项，保留双向/反向/生命周期/隐藏/reduced |
| `src/shared/ui/HoverSummary.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/shared/ui/ImageLightbox.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/shared/ui/Popover.test.ts` | 改为 Motion 完成等待/当前活动 surface 查询；业务断言保留 |
| `src/shared/ui/PresenceBoundary.test.ts` | 新增：快速重开恢复原 remount 语义、保留既有 child key |
| `src/styles/omb-metrics.test.ts` | 仅删除旧 spring 生成器同步专项；其余 skin/尺寸保留 |

### 清理阶段补充测试

| 文件 | 原因 |
|---|---|
| `src/features/source-control/ui/BranchPicker.test.ts` | 新增：新建分支草稿快速关闭重开恢复新实例；旧退出节点 inert |
| `src/features/sessions/ui/AgentTranscript.firstPaint.test.ts` | 仅补 MediaQueryList 测试 fixture 的 listener API；原 1900 业务断言保留（基线失败） |
| `src/features/sessions/ui/ToolDiffPreview.test.ts` | 活动 surface 查询及真实 Motion 完成；新增退出保留/inert/完成清理 |
| `src/features/inbox/ui/ProjectNotificationMenu.test.ts` | 真实 Motion 完成/活动 surface 查询，业务 mute 时间与焦点断言保留 |
| `src/features/projects/ui/ProjectGroups.test.ts` | 活动 surface 查询，group 创建/样式/分配/删除断言保留 |
| `src/features/workspace/ui/TabGroupMenu.test.ts` | Motion 完成等待，hover 179+1ms 业务阈值保持 |
| `src/features/skills/ui/SkillPromptField.test.ts` | Motion 完成等待，slash/键盘选择/Escape 行为断言保留 |
| `src/features/notes/ui/NotesView.test.ts` | Motion 完成/活动 picker 查询，焦点/路由/移动失败重试断言保留 |
| `src/features/workspace/ui/SurfaceTabsMenu.test.ts` | 活动菜单查询，原路径/外部打开/reveal/close 断言保留 |
| `src/features/sessions/ui/Composer.test.ts` | 活动菜单查询，原 context actions/disable/compact/draft 断言保留 |
| `src/features/sessions/ui/AgentMarkdownMenu.test.ts` | 活动菜单查询，原文件打开/行列/路径/reveal/copy 断言保留 |
| `src/features/orchestration/ui/OrchestrationFlow.test.ts` | 活动菜单查询，原显式确认/模型/effort/分配断言保留 |
| `src/features/workflows/kit/components/ui/toast.test.ts` | 新增 6 条真实 Motion 回归：退出禁用 action/dismiss、自动过期、普通/anchored 程序关闭、dedupe 替换、reduced；不替换业务断言 |

### 最终保留项与边界

静态审查未发现待迁移的手写结构性动画或原生 timer 插值。53 个 CSS 文件保留 20 个 keyframes、19 条有效 animation 声明，全部 infinite：loading、thinking、光标、skeleton shimmer、agent mascot。CSS 颜色/边框/阴影/hover 显隐与按压反馈保留；TypingDots 保留。全局 animation-paused、系统偏好和应用 override 均继续生效。最终逐项审计及原始统计保存在 `build/motion-migration/{remaining-audit.md,css-statistics.json}`。

剩余 setTimeout/rAF 为网络/轮询/debounce/提示 TTL、长按/双击/手势阈值、焦点/选区、DOM 测量/虚拟化/直接 resize/PTY fit、滚动恢复和真实经过时间显示；它们不按 elapsed 插值 UI 动画。8 处浏览器原生 scrollTo/scrollIntoView 平滑导航保留目标/触发和对齐，全部有 reduced-motion auto/instant guard。原生窗口关闭（QuickGitPopup 等）保持立即隐藏/关闭，不插入延迟；窗口外壳的系统动画不由 React Motion 接管。

手势一致性机器证明在 `build/motion-migration/gesture-proof.json`：Sheet 判定函数及原 8 条断言、四个阈值逐字保留，Drawer 源码与测试整文件逐字保留。

### 分阶段检查记录

每个阶段都执行 `npx tsc --noEmit`、完整 `npx vitest run --maxWorkers=4`（未筛选测试）。中间阶段独立快照还保留后续阶段的旧动画调用/计时断言；清理阶段统一适配退出 DOM 与旧动画后端专项，因此这些中间记录不是全绿。桌面、移动提交的纯暂存树也在生成 workflow 标准 lib 后单独 tsc 通过，避免已有未提交工作掩盖类型依赖。

| 快照 | tsc | 完整 Vitest |
|---|---|---|
| 迁移前隔离基线 | 未单独记录 | 10 files failed，14 tests failed，7272 passed，17 skipped；2 unhandled errors |
| 共享层 `e77b0716` | 通过 | 38 files failed，109 tests failed，7165 passed，17 skipped；1 unhandled error |
| 桌面 `095210fa` | 通过（含纯暂存树） | 36 files failed，114 tests failed，7152 passed，17 skipped；旧移动与菜单时钟断言尚未清理 |
| 移动 `e0b87585` | 通过（含纯暂存树） | 18 files failed，35 tests failed，7232 passed，17 skipped；7 条基线失败，28 条旧菜单退出查询，已在清理阶段适配 |
| 清理/最终冻结源码 | 通过（含纯暂存树） | 7 files failed，7 tests failed，7251 passed，17 skipped；无 unhandled error |

最终剩余项均在迁移前基线中存在，测试没有全绿：

| 文件 | 既有失败 |
|---|---|
| `src/mobile/MobileFileSheet.{images,repro}.test.ts` | 2 个套件的 Capacitor mock 缺少 registerPlugin，加载失败 |
| `src/mobile/MobileGitReview.test.ts` | 3 条零行更改摘要期待 `+0−0` |
| `src/mobile/transcript.test.ts` | 1 条重连审批按钮 disabled 断言 |
| `src/features/source-control/ui/Worktrees.test.ts` | 1 条自定义选择器数量期待 1、实际 2 |
| `src/features/sessions/ui/AgentTranscript.firstPaint.test.ts` | 1 条 directionless wheel 开场底部定位期待 1900、实际 200 |
| `src/features/sessions/ui/AgentTranscript.interjection.test.ts` | 1 条 fitting text toggle 测量断言 |

参数最终审查另补 ProjectList 折叠时长从旧 280ms 改为 collapse token；tokens/ProjectList/ProjectSessionSection/SidebarRename 220/220 通过后，再次完整运行得到上表最终结果。所有日志在 `build/motion-migration/checks/`。运行环境：Node 24.16.0、npm 12.0.1、TypeScript 5.8.3、Vitest 3.2.7、Playwright 1.63.0。未运行 Rust/Host 发布任务，无推送/PR/发布。

### 最终视觉与性能证据

使用 Playwright 1.63.0 调用 `/opt/google/chrome/chrome`（指定的 `/opt/pw-browsers/chromium` 在环境中不存在）。四组均采用实际迁移组件和本地确定性数据：桌面 1440×900、移动 390×844，各运行 normal/reduced-motion。没有接入真实 Host/provider 或原生 Tauri/Android 外壳。

桌面覆盖 SidebarTransition/rail 开合、SegmentedControl 和实际 SurfaceTabs 切换/关闭、实际 AgentTranscript 工具错误详情展开/折叠、45 个流式 chunk、Composer 四行输入及 Modal；移动覆盖 Sheet 小拖拽回弹/越阈值关闭、Drawer 触摸拖拽关闭、页面前进/后退。脚本使用 CDP touch 事件触发移动手势，未用鼠标替代触摸。

| 录制 | 视频 | 连拍截图 / Performance trace |
|---|---|---|
| desktop-normal | `build/motion-migration/desktop-normal/capture.webm` | `build/motion-migration/desktop-normal-*.png` / `desktop-normal-performance.json` |
| desktop-reduced | `build/motion-migration/desktop-reduced/capture.webm` | `build/motion-migration/desktop-reduced-*.png` / `desktop-reduced-performance.json` |
| mobile-normal | `build/motion-migration/mobile-normal/capture.webm` | `build/motion-migration/mobile-normal-*.png` / `mobile-normal-performance.json` |
| mobile-reduced | `build/motion-migration/mobile-reduced/capture.webm` | `build/motion-migration/mobile-reduced-*.png` / `mobile-reduced-performance.json` |

证据入口 `build/motion-migration/results.json`；可复现脚本 `tests/browser/motion-migration.capture.mjs`，以端口 1438 的 Vite 启动本地 fixture 后运行。人工查看了桌面工具卡片展开、流式输出/Composer、移动 Sheet 回弹与 reduced 后退截图，未见意外遮挡或布局重叠。所有录制 `pageerror=[]`，侧栏关闭宽度 0，实际标签 aria-selected=true，折叠内容保持 mounted/hidden；Sheet 回弹、Sheet/Drawer 关闭均为 true。reduced 首次 paint：Sheet y=410 与稳定终点一致，Drawer x=0，页面 x=0 且只保留 1 层。

Performance 证据来自 Chrome CDP `devtools.timeline` trace，可载入 Chrome Performance；没有声称人工操作了原生 DevTools 面板。以下仅统计标记的流式/拖拽区间，避免将截图开销误当业务动画掉帧：

| 场景 | 采样帧 | p95 / max 帧间隔 | >34ms 帧 | >50ms task | 最大单次布局 | 非用户触发布局位移 |
|---|---:|---|---:|---:|---|---:|
| desktop-normal / stream | 113 | 16.7ms / 16.8ms | 0 | 0（5228 tasks） | 10.147ms | 0 |
| desktop-reduced / stream | 112 | 16.7ms / 16.8ms | 0 | 0（4005 tasks） | 5.711ms | 0 |
| mobile-normal / drag | 260 | 16.8ms / 16.8ms | 0 | 0（6706 tasks） | 0.743ms | 0 |
| mobile-reduced / drag | 259 | 16.8ms / 16.8ms | 0 | 0（4295 tasks） | 0.640ms | 0 |

整段桌面 normal 录制有 6 帧 >34ms，最大 83.3ms，发生在上述流式区间之外，包含截图/初始化/场景切换开销；不能据此宣称整段绝无掉帧。流式与拖拽所测区间均无 >34ms 帧、无 >50ms task，四组非用户触发布局位移为 0。原生软键盘、物理 Android 设备、原生桌面窗口及真实网络流尚未视觉验证。

最终复查补齐 Workflow Toast、StatusToast 的独立 `createRoot` 配置，5 个生产 React 根（桌面、移动、Quick Composer、两类 Toast）均有 `MotionConfig reducedMotion="user" transition={defaultTransition}`。Workflow Toast 的退出节点立即 inert/aria-hidden/禁用 action 与 dismiss；在稳定的外层 AnimatePresence 中完成程序化关闭、dedupe 替换及 anchored 最后一项的退出，业务队列与回调判定不变。专门 6/6 回归及 tsc 通过；完整检查和两端构建在此修复后重新执行。

最后一次完整 Vitest（补 Toast 后）：678 个文件，669 passed / 7 failed / 2 skipped；7251 tests passed / 7 failed / 17 skipped，96.53s，无 unhandled error。剩余失败项与前述隔离基线一致，新增 Toast 6 项全部通过。启动页清理首次构建曾发现内联 CSS 缺失闭括号，已修复并通过整块 PostCSS 解析；保留首次失败日志 `checks/desktop-build-first-css-error.log`。

最终源码构建：`npm run build` 通过（Vite 15.58s）；`npm run mobile:build` 通过（Vite 9.77s），均仅有 chunk 大小/静态与动态 import 同时存在的警告。完整日志分别为 `build/motion-migration/checks/desktop-build-final.log`、`mobile-build-final.log`。构建没有运行 Tauri 打包、Android APK、LAN publication 或部署。

### 连续用户消息重叠回归修复

用户截图反馈连续两个用户气泡重叠。根因在 `promptLaunch.ts`：移植 WAAPI 时沿用了取消动画的清理语义，Motion 的 `cancel()` 会将运行中的位移动画恢复到起点，留下 `y` 位移。连续发送或隐藏会话中断入场时，上一条气泡、媒体和前一个 turn 因此停在错误位置。改为 `complete()`，使所有参与节点落到终点；发送状态、pending 透明度、入场交接及后续内容显隐判定均保持原逻辑。

新增 `src/features/sessions/ui/promptLaunch.test.ts` 使用真实 Motion，覆盖运行中/已结束、普通/pending、媒体和 recorded 替换节点、首帧前释放及重复释放。修复前 2 failed / 3 passed，运行中释放残留 `y=80px`；修复后 5/5 通过。`AgentTranscript.promptRise.test.ts` 仅将旧取消 API 专项断言改为完成 API，52/52 通过，原业务断言保留；没有删除测试。

新增 `tests/browser/transcript-prompt-overlap.spec.ts`，复用实际 AgentTranscript fixture，以 1440×900 Chrome 验证连续发送、pending→recorded 交接、隐藏恢复和 reduced-motion，分别覆盖 anchor 开/关。修复前普通模式 4 项失败、reduced 2 项通过；修复后 6/6 通过，所有气泡与 turn 的最终位移为 0，相邻气泡间距大于 0。截图人工检查确认消息顺序和间距恢复。该测试只注入本地文本数据，不执行截图中的命令。

证据保存在 `build/prompt-overlap/`：`before.png` / `after.png` 为相同 anchor 场景的前后截图；`before/`、`after/` 包含四组连续发送截图，`checks/` 包含修复前后浏览器及真实 Motion 日志。`npx tsc --noEmit` 通过。此前全套录制与 Performance 记录不覆盖连续发送中断这一回归，本节新增验证补上该场景。

纳入清理提交前重新完整运行：`npx vitest run --maxWorkers=4` 得到 679 个文件，670 passed / 7 failed / 2 skipped；7256 tests passed / 7 failed / 17 skipped，117.41s，无 unhandled error。失败文件及断言与上表既有失败一致，新增 5 条全部通过。`npm run build`、`npm run mobile:build` 均通过（Vite 25.09s / 13.90s）；原有 chunk/import/依赖注解警告不影响构建。日志在 `build/prompt-overlap/checks/{vitest-final,desktop-build,mobile-build}.log`。未发布、推送或创建 PR。
