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

待各阶段填入实际结果；未执行的场景不得标为通过。
