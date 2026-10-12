# Desktop Bots REA evidence mapping — 2026-10-12

Implementation scope: React 19 + TypeScript + Vite + Tauri/WebKitGTK; existing CSS, lucide and shared motion/resize primitives. No provider protocols or mobile redesign.

## Evidence boundary

Local report: `/home/wy/Documents/Codex/2026-10-12/task/grok-audit-20261012/deliverables/grok-bot-audit.html`; sections 方法与可复核证据 / 重点组件表 / CSS token. `components.json`, `components.csv`, `style-branches.csv`, `css-tokens.csv` and ZIP were inspected. 81 curated / 452 branches / 1,087 tokens are static records, not runtime measurements. ASAR SHA256 `ad732a5ba40b43e7c42c776a9124b0a05ce891167dab3307c964e9acab836858`. No reference private content or brand assets used.

## Differences and implementation plan (recorded before implementation)

1. Capture baseline in offline real-component fixture; preserve pre-existing diff.
2. Apply scoped tokens and primary layout; reuse resize and collapse mechanisms.
3. Detail states, menus, dialogs, settings, narrow layout.
4. Same-environment screenshots/performance; focused tests, TypeScript and build; distinguish Chromium from desktop verification.

| Target | Evidence IDs | Current implementation | Before | Proposal |
|---|---|---|---|---|
|侧栏|S001 S077|DesktopBotsWorkspace.tsx / desktop-bot-messenger.css|330px，窄窗260/220/72px；无拖拽|280默认、240–400拖拽、88窄窗；沿用现有折叠机制|
|会话与置顶|S007 S008 S009 S010 S011 S012 S081|DesktopBotsWorkspace.tsx / BotAvatar.tsx|行min70，padding12/10，gap12，圆角14；头像40|行54，padding8，gap8，圆角10，头像36；置顶72；不改头像图形|
|顶栏|S002 S003 S004 S081|DesktopBotsChrome.tsx|min76、padding14/24、头像40|min38、padding0/8/12、gap12、头像28；标题与线程并排，溢出省略|
|消息|S005 S013 S014 S015 S016 S017 S018 S019 S064|BotMessages.tsx / desktop-bot-messenger.css|padding12/17、圆角20、max min85%/680；横留白≥24|padding8/12、圆角18、max min88%/640/100%-82、正文14/20、横16；连接角只作用相邻同发送者|
|输入框|S006 S020 S021 S022 S023 S024 S025 S079 S080|DesktopBotsLegacyChrome.tsx|单行至少54、圆角28、按钮36；文本最高200|44高/22角、按钮28；多行文本20–120、圆角18、内容驱动高度；保持附件、停止和重试|
|按钮与图标|S026 S027 S028 S029 S030 S031 S032 S033 S034 S035 S036|DesktopBotsChrome.tsx / desktop-bot-messenger.css|复用assistant按钮；尺寸分散|统一20/24/28图标按钮与13/18字体；保留lucide和HarnessIcon；focus/disabled/error|
|工具与附件卡片|S054 S056|BotSessionCard.tsx / BotAttachmentCard.tsx / DesktopBotDelegations.tsx|现有业务卡片；附件310宽/16角|附件C0198：fit-content,min220,max340,12角,.5边框；工具卡套用12角/8间距是项目适配，非同组件证明|
|菜单|S037 S038 S039 S040 S041|BotRecipientPicker.tsx / BotThreadSwitcher / ExplorerMenu|收件人460/18角；线程菜单14角|收件人min560/100%-26,14角,.5边；线程12角；保持定位与键盘处理，portal不可用父级选择器|
|弹窗|S042 S043 S044 S045 S046 S068 S069 S070 S071 S072 S073 S074 S075 S076|BotMemoryDialog.tsx / BotSettings.tsx|现有共享dialog与嵌入设置|仅Bots拥有的弹窗采用14角/.5边框、标题12/16、正文0/16/16；保留共享焦点和关闭逻辑|
|设置与详情|S047 S048 S049 S050 S051 S052 S053 S054 S055 S057 S058 S059 S060 S078|DesktopBotDetails.tsx / BotSettings.tsx|详情380、标题min50、设置行padding13/10|详情320、标题44/横10、卡12角/pad8/gap8；全局设置198导航/700高度不适用于Bot inspector，不重构全局设置|
|排版颜色|S061 S062 S063 S064 S065 S066 S067|desktop-bot-messenger.css / src/styles|继承monocode并混色|统一14/20、13/18、12/16、11/16；亮色取css-tokens root声明，暗色保留项目值|

## Exact static specifications

All values below are CSS px unless the original expression says otherwise. Missing values are **unverified**, never zero. `inherit` is not a measured font. Conditions must remain distinct. Width/height are fixed only where explicit; min/max are bounds; other sizes remain content-driven. Colors come from separately named tokens, not the geometric redraw.

### S001 应用三栏外壳

`width: 100%`; `height: 100%`; `min-width: 0`; `min-height: 0`; `font-family: var(--cursor-font-family, var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif))`; `display: grid`; `grid-template-columns: var(--sand-sidebar-width) minmax(0,1fr) auto`; `overflow: hidden`; `conditions: ；选择器状态 .sand-1x1t2sy:is([data-sidebar-animating])`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3920101, "label": "fy.shell"}]`. grid: 侧栏变量 / minmax(0,1fr) / auto；聊天最小宽度 token 424px 不等同始终应用 min-width。

### S002 标题栏（titlebar 分支）



Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3920767, "label": "fy.shellTitlebar"}]`. 分支 token 44px；是否激活未知。

### S003 标题栏（window controls 分支）



Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3920908, "label": "fy.shellWindowControls"}]`. 分支 token 52px；不能直接当作本次 Linux 运行高度。

### S004 主对话顶栏

`min-height: var(--sand-titlebar-block,38px)`; `padding-top: 0`; `padding-right: calc(12px + var(--sand-content-controls-inset,0px))`; `padding-bottom: 0`; `padding-inline-start: 8px`; `gap: 12px`; `display: flex`; `align-items: center`; `justify-content: space-between`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2917056, "label": ["sand-toolbar"]}]`. min-height 回退38px，受 --sand-titlebar-block 覆盖。

### S005 对话滚动区

`padding-inline: 16px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3719525, "label": ["sand-virtual-transcript"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S006 输入区容器

`width: 100%`; `gap: 8px`; `display: flex`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2913023, "label": ["sand-input-area"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S007 会话列表行：展开

`width: 100% | 54px [@container sand-sidebar (max-width: 130px)]`; `height: 54px`; `min-width: 0`; `padding-inline: 8px | 9px [@container sand-sidebar (max-width: 130px)]`; `padding-block: 8px | 9px [@container sand-sidebar (max-width: 130px)]`; `gap: 8px`; `border-radius: 10px`; `font-size: inherit`; `line-height: inherit`; `font-family: inherit`; `display: flex`; `align-items: center`; `conditions: ；选择器状态 .sand-1pw415p:hover:not(:disabled) | @container sand-sidebar (max-width: 130px)`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1759189, "label": "au.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 1759848, "label": "au.expanded"}]`. 常规宽100%、高54px、padding8px；容器≤130px时宽54px、padding9px。

### S008 会话列表行：收起

`width: 54px`; `height: 54px`; `min-width: 0`; `padding-inline: 9px`; `padding-block: 9px`; `gap: 8px`; `border-radius: 10px`; `font-size: inherit`; `line-height: inherit`; `font-family: inherit`; `display: flex`; `align-items: center`; `justify-content: flex-start`; `conditions: ；选择器状态 .sand-1pw415p:hover:not(:disabled)`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1759189, "label": "au.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 1760092, "label": "au.collapsed"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S009 置顶项目

`width: 100%`; `height: 100%`; `min-width: 0`; `padding-top: 6px`; `padding-bottom: 4px`; `padding-inline: 4px`; `gap: 6px`; `border-radius: 10px`; `font-size: inherit`; `line-height: inherit`; `font-family: inherit`; `display: flex`; `align-items: center`; `conditions: ；选择器状态 .sand-1pw415p:hover:not(:disabled)`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1759189, "label": "au.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 1760341, "label": "au.pinned"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S010 列表文本组

`min-width: 0`; `gap: 0`; `display: flex`; `flex-grow: 1 | 0 [@container sand-sidebar (max-width: 130px)]`; `flex-shrink: 1`; `flex-basis: 0`; `overflow: hidden`; `conditions: @container sand-sidebar (max-width: 130px)`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1760768, "label": "au.body"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S011 列表预览行

`min-width: 0`; `min-height: 18px`; `gap: 4px`; `display: flex`; `align-items: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1761650, "label": "au.previewRow"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S012 置顶状态点

`width: 10px`; `height: 10px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1763114, "label": "au.pinnedDot"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S013 消息气泡：助手

`max-width: min(88%,640px,calc(100% - 82px)) | 100% [；选择器状态 .sand-qprlqo.sand-qprlqo:where(.sand--default-marker:is(.sand-thread-root-group) *)]`; `padding-top: 8px`; `padding-bottom: 8px`; `padding-inline-start: 12px`; `padding-inline-end: 12px`; `border-radius: 18px`; `conditions: ；选择器状态 .sand-qprlqo.sand-qprlqo:where(.sand--default-marker:is(.sand-thread-root-group) *)`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3624495, "label": "yl.message"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S014 消息气泡：用户

`max-width: min(88%,640px,calc(100% - 82px)) | 100% [；选择器状态 .sand-qprlqo.sand-qprlqo:where(.sand--default-marker:is(.sand-thread-root-group) *)]`; `padding-top: 8px`; `padding-bottom: 8px`; `padding-inline-start: 12px`; `padding-inline-end: 12px`; `margin-inline-start: auto | 0 [；选择器状态 .sand-iwaow4.sand-iwaow4:where(.sand--default-marker:is(.sand-thread-root-group) *)]`; `border-radius: 18px`; `conditions: ；选择器状态 .sand-qprlqo.sand-qprlqo:where(.sand--default-marker:is(.sand-thread-root-group) *) | ；选择器状态 .sand-iwaow4.sand-iwaow4:where(.sand--default-marker:is(.sand-thread-root-group) *)`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3624495, "label": "yl.message"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 3624696, "label": "yl.user"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S015 连续助手气泡：上连接

`border-start-start-radius: 6px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3625349, "label": "yl.assistantContinuedPrev"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S016 连续用户气泡：下连接

`border-end-end-radius: 6px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3625294, "label": "yl.userContinuedNext"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S017 独立 emoji 消息

`padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 0`; `padding-inline-end: 0`; `border-radius: 0`; `font-size: 32px`; `line-height: 38px`; `display: flex`; `align-items: flex-start`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3624905, "label": "yl.standaloneEmoji"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S018 媒体消息

`padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 0`; `padding-inline-end: 0`; `border-radius: 0`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3625503, "label": "yl.mediaOnly"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S019 消息正文

`min-width: 0`; `gap: 10px`; `font-size: inherit`; `line-height: 20px | inherit [；选择器状态 .sand-1w1fagr.sand-1w1fagr:where(.sand--default-marker:is([data-standalone-emoji]) *)]`; `display: flex`; `conditions: ；选择器状态 .sand-1w1fagr.sand-1w1fagr:where(.sand--default-marker:is([data-standalone-emoji]) *)`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3628274, "label": ["sand-message-prose"]}]`. 基础与子选择器分开记录。正文最终字号由父级继承，不能凭此行确定。

### S020 输入框边框

`width: 100%`; `border-width: .5px`; `box-sizing: border-box`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2920942, "label": "PM.frame"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S021 输入框文本宿主

`width: 100%`; `min-width: 0`; `min-height: var(--x-minHeight)`; `max-height: var(--x-maxHeight)`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3176494, "label": "Zf.fieldHost"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 3176762, "label": "Zf.fieldHostBounds"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S022 回复引用胶囊

`width: 100%`; `min-width: 0`; `padding-top: 4px`; `padding-bottom: 4px`; `padding-inline-start: 8px`; `padding-inline-end: 4px`; `gap: 6px`; `border-radius: 10px`; `font-size: 14px`; `line-height: 22px`; `display: flex`; `align-items: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3145581, "label": ["sand-prompt-reply-pill"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S023 引用关闭按钮

`width: 20px`; `height: 20px`; `padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 0`; `padding-inline-end: 0`; `border-radius: 9999px`; `border-width: 0`; `display: inline-flex`; `flex-shrink: 0`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3146442, "label": ["sand-prompt-reply-pill__clear"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S024 语音处理按钮

`width: 28px`; `height: 28px`; `display: flex`; `flex-shrink: 0`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3035955, "label": ["sand-prompt-voice-processing"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S025 附件横向条

`height: 6px [；选择器状态 .sand-1itlbx3::-webkit-scrollbar]`; `gap: 8px`; `border-radius: 9999px [；选择器状态 .sand-9xsh1y::-webkit-scrollbar-thumb]`; `display: flex`; `conditions: ；选择器状态 .sand-1itlbx3::-webkit-scrollbar | ；选择器状态 .sand-9xsh1y::-webkit-scrollbar-thumb`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3144941, "label": ["sand-prompt-attachments"]}]`. 6px height 仅对应滚动条伪元素，非附件条总高。

### S026 图标按钮 xs

`width: 20px`; `height: 20px`; `padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 0`; `padding-inline-end: 0`; `border-radius: 6px`; `border-width: 0`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2006348, "label": "of.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 2006909, "label": "of.sizeXs"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 2006975, "label": "of.shapeSquare"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S027 图标按钮 sm

`width: 24px`; `height: 24px`; `padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 0`; `padding-inline-end: 0`; `border-radius: 6px`; `border-width: 0`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2006348, "label": "of.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 2006849, "label": "of.sizeSm"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 2006975, "label": "of.shapeSquare"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S028 图标按钮 md

`width: 28px`; `height: 28px`; `padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 0`; `padding-inline-end: 0`; `border-radius: 6px`; `border-width: 0`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2006348, "label": "of.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 2006788, "label": "of.sizeMd"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 2006975, "label": "of.shapeSquare"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S029 胶囊按钮 xs

`height: 22px`; `padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 8px`; `padding-inline-end: 8px`; `gap: 6px`; `border-radius: 11px`; `border-top-width: 1px`; `border-bottom-width: 1px`; `border-inline-end-width: 1px`; `font-size: 12px`; `line-height: 16px`; `font-family: inherit`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1849381, "label": "So.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 1850471, "label": "So.sizeXs"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S030 胶囊按钮 sm

`height: 26px`; `padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 10px`; `padding-inline-end: 10px`; `gap: 6px`; `border-radius: 13px`; `border-top-width: 1px`; `border-bottom-width: 1px`; `border-inline-end-width: 1px`; `font-size: 12px`; `line-height: 16px`; `font-family: inherit`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1849381, "label": "So.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 1850661, "label": "So.sizeSm"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S031 胶囊按钮 md

`height: 30px`; `padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 13px`; `padding-inline-end: 13px`; `gap: 6px`; `border-radius: 15px`; `border-top-width: 1px`; `border-bottom-width: 1px`; `border-inline-end-width: 1px`; `font-size: 13px`; `line-height: 18px`; `font-family: inherit`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1849381, "label": "So.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 1850849, "label": "So.sizeMd"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S032 胶囊按钮 lg

`height: 34px`; `padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 15px`; `padding-inline-end: 15px`; `gap: 6px`; `border-radius: 17px`; `border-top-width: 1px`; `border-bottom-width: 1px`; `border-inline-end-width: 1px`; `font-size: 13px`; `line-height: 18px`; `font-family: inherit`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1849381, "label": "So.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 1851040, "label": "So.sizeLg"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S033 胶囊按钮 xl

`height: 38px`; `padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 18px`; `padding-inline-end: 18px`; `gap: 6px`; `border-radius: 19px`; `border-top-width: 1px`; `border-bottom-width: 1px`; `border-inline-end-width: 1px`; `font-size: 14px`; `line-height: 22px`; `font-family: inherit`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1849381, "label": "So.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 1851231, "label": "So.sizeXl"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S034 内容按钮 sm

`padding-top: 4px`; `padding-bottom: 4px`; `padding-inline-start: 6px`; `padding-inline-end: 6px`; `gap: 4px`; `border-radius: 6px`; `border-width: 0`; `font-family: inherit`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2031785, "label": "oo.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 2032234, "label": "oo.sizeSm"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S035 内容按钮 md

`padding-top: 6px`; `padding-bottom: 6px`; `padding-inline-start: 10px`; `padding-inline-end: 10px`; `gap: 4px`; `border-radius: 8px`; `border-width: 0`; `font-family: inherit`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2031785, "label": "oo.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 2032109, "label": "oo.sizeMd"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S036 内容按钮 lg

`padding-top: 8px`; `padding-bottom: 8px`; `padding-inline-start: 12px`; `padding-inline-end: 12px`; `gap: 4px`; `border-radius: 10px`; `border-width: 0`; `font-family: inherit`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2031785, "label": "oo.root"}, {"file": "index-DCpFUyZ2.js", "utf16_offset": 2032360, "label": "oo.sizeLg"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S037 新对话菜单

`width: min(560px,calc(100% - 26px))`; `border-radius: 14px`; `border-width: .5px`; `display: flex`; `overflow: hidden`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2951623, "label": ["sand-new-chat-menu"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S038 PR 菜单

`min-width: 260px`; `max-width: 360px`; `border-radius: 12px`; `border-width: 1px`; `overflow: hidden`; `box-sizing: border-box`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3012036, "label": ["sand-pr-menu"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S039 PR 列表

`width: 100%`; `padding: 4px`; `gap: 1px`; `margin: 0`; `display: flex`; `box-sizing: border-box`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3012314, "label": ["sand-pr-listbox"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S040 emoji 菜单

`padding-top: 6px`; `padding-bottom: 6px`; `border-radius: 12px`; `border-width: 1px`; `overflow: hidden`; `box-sizing: border-box`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3005464, "label": ["sand-emoji-menu"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S041 通用菜单 md

`border-radius: 12px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1105166, "label": "d7.sizeMd"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S042 通用弹窗表面

`border-radius: 14px`; `border-top-width: .5px`; `border-bottom-width: .5px`; `border-inline-end-width: .5px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2037956, "label": "Da.surface"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S043 弹窗标题区

`padding-top: 12px`; `padding-bottom: 12px`; `padding-inline-start: 16px`; `padding-inline-end: 16px`; `gap: 4px`; `display: flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: flex-start`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2038707, "label": "Da.header"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S044 弹窗正文区

`min-height: 0`; `padding-top: 0`; `padding-bottom: 16px`; `padding-inline-start: 16px`; `padding-inline-end: 16px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2039192, "label": "Da.body"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S045 弹窗操作区

`padding-top: 12px`; `padding-bottom: 12px`; `padding-inline-start: 16px`; `padding-inline-end: 12px`; `gap: 8px`; `display: flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: flex-end`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2039358, "label": "Da.actions"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S046 弹窗关闭按钮

`width: 32px`; `height: 32px`; `min-width: 32px`; `min-height: 32px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2039742, "label": "Da.close"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S047 设置整体布局

`height: min(700px,calc(100vh - 96px))`; `min-height: 0`; `display: flex`; `box-sizing: border-box`

Source: `[{"file": "surface-Dv5uDTRw.js", "utf16_offset": 1565, "label": ["sand-settings-layout"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S048 设置导航

`width: 198px`; `padding-top: 16px`; `padding-bottom: 16px`; `padding-inline-start: 12px`; `padding-inline-end: 12px`; `gap: 2px`; `border-inline-end-width: .5px`; `display: flex`; `flex-grow: 0`; `flex-shrink: 0`; `flex-basis: auto`; `box-sizing: border-box`

Source: `[{"file": "surface-Dv5uDTRw.js", "utf16_offset": 1773, "label": ["sand-settings-nav"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S049 设置主面板

`min-width: 0`; `display: flex`; `flex-grow: 1`; `flex-shrink: 1`; `flex-basis: auto`; `box-sizing: border-box`

Source: `[{"file": "surface-Dv5uDTRw.js", "utf16_offset": 2884, "label": ["sand-settings-panel"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S050 设置标题区

`padding-top: 32px`; `padding-bottom: 6px`; `padding-inline-start: 32px`; `padding-inline-end: 32px`; `gap: 2px`; `display: flex`; `flex-grow: 0`; `flex-shrink: 0`; `flex-basis: auto`; `box-sizing: border-box`; `align-items: center`; `justify-content: space-between`

Source: `[{"file": "pane-header-DlPK_Nkr.js", "utf16_offset": 793, "label": ["sand-settings-pane-header"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S051 设置详情顶栏

`height: 44px`; `padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 10px`; `padding-inline-end: 10px`; `gap: 12px`; `display: flex`; `flex-grow: 0`; `flex-shrink: 0`; `flex-basis: auto`; `box-sizing: border-box`; `align-items: center`

Source: `[{"file": "pane-header-DlPK_Nkr.js", "utf16_offset": 1454, "label": ["sand-settings-detail-bar"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S052 设置关闭按钮

`width: 32px`; `height: 32px`; `min-width: 32px`; `min-height: 32px`; `padding-top: 0`; `padding-bottom: 0`; `padding-inline-start: 0`; `padding-inline-end: 0`; `margin-top: 0`; `margin-bottom: 0`; `margin-inline-start: 0`; `margin-inline-end: 0`; `border-radius: 9999px`; `border-top-width: 0`; `border-bottom-width: 0`; `border-inline-end-width: 0`; `font-size: inherit`; `line-height: inherit`; `font-family: inherit`; `display: inline-flex`; `flex-shrink: 0`; `box-sizing: border-box`; `align-items: center`; `justify-content: center`

Source: `[{"file": "surface-Dv5uDTRw.js", "utf16_offset": 3143, "label": ["sand-settings-panel__close"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S053 设置行

`row-gap: 8px`; `column-gap: 24px`; `display: flex`; `box-sizing: border-box`; `align-items: flex-start`; `justify-content: space-between`; `conditions: ；选择器状态 .sand-jodmca:hover`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 3536231, "label": ["sand-settings-row"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S054 Bot 设置卡片

`padding-top: 8px`; `padding-bottom: 8px`; `padding-inline-start: 8px`; `padding-inline-end: 8px`; `gap: 8px`; `border-radius: 12px`; `display: flex`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2574262, "label": ["sand-agent-settings__card"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S055 Bot 设置控件行

`padding-top: 4px`; `padding-bottom: 4px`; `padding-inline-start: 6px`; `padding-inline-end: 4px`; `row-gap: 8px`; `column-gap: 12px`; `display: flex`; `align-items: center`; `justify-content: space-between`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2574439, "label": ["sand-agent-settings__row"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S056 触发器卡片

`padding: 6px`; `gap: 2px`; `border-radius: 12px`; `border-width: .5px`; `display: flex`; `box-sizing: border-box`

Source: `[{"file": "automation-detail-panel-DBpuqUy0.js", "utf16_offset": 58649, "label": ["sand-trigger-card"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S057 账户卡片

`padding-top: 14px`; `padding-bottom: 14px`; `padding-inline-start: 16px`; `padding-inline-end: 16px`; `gap: 14px`; `display: flex`; `box-sizing: border-box`; `align-items: center`

Source: `[{"file": "general-pane-Mstks3q5.js", "utf16_offset": 9687, "label": ["sand-account-card"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S058 头像编辑区域

`width: 96px`; `height: 96px`; `border-radius: 50%`; `overflow: hidden`

Source: `[{"file": "agent-avatar-editor-DMuwUCf-.js", "utf16_offset": 10392, "label": ["sand-avatar-editor__stage"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S059 头像触发按钮

`width: 64px`; `height: 64px`; `display: inline-flex`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2567000, "label": ["sand-avatar-trigger"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S060 插件弹窗

`width: min(1000px,calc(100vw - 40px))`; `max-width: calc(100vw - 32px)`; `padding: 0`

Source: `[{"file": "view-BnARtRH5.js", "utf16_offset": 119607, "label": ["sand-plugins-dialog"]}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S061 标题 H1

`font-size: 26px`; `line-height: 32px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1678854, "label": "Lt.heading1"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S062 标题 H2

`font-size: 22px`; `line-height: 28px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1678939, "label": "Lt.heading2"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S063 标题 H3

`font-size: 17px`; `line-height: 24px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1679024, "label": "Lt.heading3"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S064 正文 body1

`font-size: 14px`; `line-height: 20px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1679107, "label": "Lt.body1"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S065 正文 body2

`font-size: 13px`; `line-height: 18px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1679189, "label": "Lt.body2"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S066 标签 label

`font-size: 12px`; `line-height: 16px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1679270, "label": "Lt.label"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S067 辅助 caption

`font-size: 11px`; `line-height: 16px`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 1679354, "label": "Lt.caption"}]`. 未定义值表示本条证据未直接定义；不代表 0。样式组合、继承和最终渲染未验证。

### S068 弹窗宽度规格 360

`width: min(360px,calc(100vw - 32px))`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2038339, "label": "Da.width360"}]`. 静态可选规格；具体业务弹窗选择需运行态或调用处验证。

### S069 弹窗宽度规格 380

`width: min(380px,calc(100vw - 32px))`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2038380, "label": "Da.width380"}]`. 静态可选规格；具体业务弹窗选择需运行态或调用处验证。

### S070 弹窗宽度规格 400

`width: min(400px,calc(100vw - 32px))`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2038422, "label": "Da.width400"}]`. 静态可选规格；具体业务弹窗选择需运行态或调用处验证。

### S071 弹窗宽度规格 440

`width: min(440px,calc(100vw - 32px))`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2038463, "label": "Da.width440"}]`. 静态可选规格；具体业务弹窗选择需运行态或调用处验证。

### S072 弹窗宽度规格 460

`width: min(460px,calc(100vw - 32px))`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2038504, "label": "Da.width460"}]`. 静态可选规格；具体业务弹窗选择需运行态或调用处验证。

### S073 弹窗宽度规格 480

`width: min(480px,calc(100vw - 32px))`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2038545, "label": "Da.width480"}]`. 静态可选规格；具体业务弹窗选择需运行态或调用处验证。

### S074 弹窗宽度规格 500

`width: min(500px,calc(100vw - 32px))`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2038586, "label": "Da.width500"}]`. 静态可选规格；具体业务弹窗选择需运行态或调用处验证。

### S075 弹窗宽度规格 520

`width: min(520px,calc(100vw - 32px))`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2038627, "label": "Da.width520"}]`. 静态可选规格；具体业务弹窗选择需运行态或调用处验证。

### S076 弹窗宽度规格 608

`width: min(608px,calc(100vw - 32px))`

Source: `[{"file": "index-DCpFUyZ2.js", "utf16_offset": 2038668, "label": "Da.width608"}]`. 静态可选规格；具体业务弹窗选择需运行态或调用处验证。

### S077 侧栏宽度约束

`width: 280px 默认；88px 收起`; `min-width: 240px（展开）`; `max-width: 400px（展开）`

Source: `[{"file": "index-DCpFUyZ2.js", "unicode_codepoint_offset": 2046714, "excerpt": "const zA=280,qk=240,z4=400,O3e=88,$A=320,zp=280,$4=424,MI={slice:\"ui-layout\",schemaVersion:3,scope:\"client-persisted\",accountSensitive:!1},Vne"}]`. O3e=88，BA=O3e；窗口剩余空间和持久化设置可覆盖默认。未读取用户设置。

### S078 信息侧栏宽度

`width: 320px 默认`; `min-width: 280px`

Source: `[{"file": "index-DCpFUyZ2.js", "unicode_codepoint_offset": 2046714, "excerpt": "const zA=280,qk=240,z4=400,O3e=88,$A=320,zp=280,$4=424,MI={slice:\"ui-layout\",schemaVersion:3,scope:\"client-persisted\",accountSensitive:!1},Vne"}]`. 宽度来自 ui-layout 静态默认及 Math.max(zp,…)；运行时用户宽度未知。

### S079 输入框单行状态

`height: 44px`; `padding: 上下12px；左44px；右16px+按钮簇宽度`; `border-radius: 22px`; `line-height: 20px`

Source: `[{"file": "index-DCpFUyZ2.js", "unicode_codepoint_offset": 2920365, "excerpt": "const df=20,$$t=6,zae=df*$$t,uH=44,F$t=uH/2,B$t=18,dH=28,vT=8,fH=8,yL=10,$ae=12,q$t=10,n7e=q$t+dH+vT,U$t=vT+dH+fH,Fae=(uH-df)/2,V$t=df*2-1;fu"}]`. Fae=(44-20)/2；U$t=8+28+8；W$t(Ln)=8+Ln+8。Ln 实测值未知。

### S080 输入框多行状态

`height: 56px + 实测文本高度`; `min-height: 文本宿主20px`; `max-height: 文本宿主120px`; `padding: 上10px，左右12px，下46px`; `border-radius: 18px`

Source: `[{"file": "index-DCpFUyZ2.js", "unicode_codepoint_offset": 2920365, "excerpt": "const df=20,$$t=6,zae=df*$$t,uH=44,F$t=uH/2,B$t=18,dH=28,vT=8,fH=8,yL=10,$ae=12,q$t=10,n7e=q$t+dH+vT,U$t=vT+dH+fH,Fae=(uH-df)/2,V$t=df*2-1;fu"}]`. zae=20×6；G$t(true,e)=10+e+(10+28+8)。若e为20–120，外框条件推导76–176px；不是运行态观测。

### S081 头像尺寸规格

`width: xs16 / sm22 / md28 / lg36 / xl72 px`; `height: 同宽`

Source: `[{"file": "index-DCpFUyZ2.js", "unicode_codepoint_offset": 2241839, "excerpt": "const Q1={xs:16,sm:22,md:28,lg:36,xl:72};function S2(t){const e=ne.c(31),{avatarKey:n,dataUrl:s,size:r,fillPx:i,state:a,shape:o,color:l,isS"}]`. 调用方可用 fillPx 覆盖；不把头像画布等同着色图形边界。

## Unverified / intentional adaptations

- Runtime DPR, zoom, font fallback, theme cascade, hover/focus/loading reachability, 38/44/52 titlebar conditions are unknown for Grok. No pixel-perfect claim.
- 198px settings navigation is a global settings layout, not the Bot inspector. Existing MonoCode information architecture is preserved.
- No direct equivalent is established for every MonoCode tool/delegation/approval card. Shared visual tokens are an adaptation.
- Reference animations are not measured. All motion continues to be MonoCode design using shared collapse utilities and reduced-motion support.
- Existing user typography preferences remain supported; no container scaling or remote fonts.

## Implementation outcome

See [delivery and verification](bots-rea-delivery.md) for the actual file list, checks, screenshots, performance deltas and desktop limitations. Geometry references are static design inputs, not assertions of runtime equivalence. CSS colors explicitly map light root defaults (`--sand-text-primary`, `--sand-text-secondary`, `--sand-border-default`, `--sand-fill-bubble-agent`, `--sand-fill-bubble-user`, `--sand-fill-ghost-hover`, `--sand-fill-ghost-selected`, `--sand-text-on-primary` at CSS UTF16 offset 356614). Sidebar surface adapts the `--sand-border-cutout-on-subtle` value to MonoCode's surface role; this does not establish the reference sidebar's final computed background.
