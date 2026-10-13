# Claude 参考桌面重构交付记录（2026-10-13）

本记录保留 `/home/wy/projects/claude-ui-analysis` 整体桌面重构的检查，并追加用户最新Composer截图的覆盖规则与本轮定向验证。[有效规格](desktop-visual-spec.md)取代旧 Grok 静态阶段的冲突规格，Code composer以用户新图为优先。保留 Monocode 的provider、用户内容、工作区操作和移动端独立外观；没有构建、推送、合并或局域网发布。

## 菜单尺寸补充（2026-10-13）

依据参考项目的 `menu-metrics.md`、`evidence/menu-source-audit.json` 与用户补充的三点菜单说明，统一共享菜单外框padding0、滚动gutter4、菜单专用阴影，清除实体border与额外行间gap。保留普通32/紧凑24的显式场景区分、真实菜单动作及字体偏好；模型目录移除固定高度，保留滚动上限。字体listbox与gutter分层，菜单按钮和三点触发器使用内部span绘制悬浮色，禁用项不填色。其余已触及菜单只补共享背景层和文字标记，没有改变操作回调。

本轮定向检查：Vitest3.2.7的ModelPicker32、Settings Select1、Workflow Select3、Popover/ComposerPopover/TranscriptSelectionMenu/SurfaceTabsMenu合计29、Inbox连接菜单2、Composer相关6、共享OMB控件2，均通过；没有执行完整测试套件。`tsc --noEmit`和`git diff --check`通过。

Chromium **155.0.8059.39** 在真实组件离线夹具上通过12组尺寸/状态检查，见[菜单记录](../build/menu-metrics/verification.json)：亮暗主题的普通4项加分隔区为145高、紧凑版113高；字体外框224×136、listbox216×128、选项32；Chat/Code模型菜单宽416/242、单行32/24；Radix单项菜单40高、两项Select72高。验证透明按钮、内部hover背景、禁用项不填色及危险项实色。另有[补充记录](../build/menu-metrics/extra-verification.json)：描述行50、标题/说明20/17、五项Effort逐项32（本地无说明的该状态总高168）、长分支菜单320×360、行24、底部搜索26；减少动态效果时hover过渡0s。描述行首次实测49，修正普通行样式覆盖后复核为50。所有完成场景的页面错误为空。

这些结果仅覆盖所列Chromium组件夹具；未重跑历史WebKit矩阵，未验收真实Tauri窗口或实体手机。没有构建、推送、合并或发布。

## 用户补充Composer参考与本轮验证

本轮采用[用户补充截图](/tmp/codex-clipboard-517004d9-b744-4f1d-986f-079536a2f73c.png)替换旧Code composer排列：上方为真实Local/Remote环境、项目短名、分支与worktree checkbox及既有菜单；中间为默认最大800宽、单行42高、圆角14的输入框和轻量return发送控件；下方为同一行附件、真实权限、模型/effort及context。功能来自现有组件和状态，没有加入无对应功能的麦克风或pet；用户字体/缩放、Chat及compact继续保持。

定向脚本为`tests/browser/composer-reference.verify.mjs`，结果见[Chromium记录](../build/composer-reference/verification.json)和[WebKit记录](../build/composer-reference-webkit/verification.json)。Chromium154.0.8037.97为7场景/7截图，WebKit26.6为7场景/8截图（多1张composer元素截图）；两者均3组检查、status passed、errors为空、全部场景无文档横向溢出。

用户图没有CSS尺寸或DPR信息。本轮对齐其相对结构，以当前实现的800/42/28 CSS基准验证，保留字号与缩放；不从附件物理像素推导误差阈值。以下基准几何在两引擎一致。

| 本轮检查 | 观察结果 |
| --- | --- |
| Code1280×932，浅暗主题、DPR1 | 实际宽800；上方32.1875高、输入42高、14/20、下方28高；context距末个模型控件8 |
| 中文20px字号、1000×800 | 输入宽680、高47、正文20/28.5714；工具随文字增高并保持可达 |
| DPR1.25、1280×932 | CSS几何保持，截图物理尺寸1600×1165；属于浏览器DPR模拟 |
| 中文窄split、1000×800 | 两个输入宽387.1875/236.796875；窄pane上方换行、底部工具保持一行，无页面横向溢出 |
| Picker/Worktree/模式保留 | project、branch、worktree、access、model五个picker的Escape回textarea；checkbox切draft mode/base再回当前分支；Chat/Code各自textarea身份与独立未发送草稿保持 |
| Chat与compact隔离 | Chat输入仍640宽、105高；390宽隔离挂载的真实compact Composer可输入且无溢出，不代表完整手机壳 |
| 本轮最终聚焦组件检查 | Vitest3.2.7：Composer56、Worktrees38（含WorkspacePicker新增7）、SearchableSelect2、Workflow Select3，共99/99通过；不与此前101项或旧范围累加 |
| 本轮类型/静态检查 | `tsc --noEmit -p tests/browser/tsconfig.desktop.json`通过，覆盖生产src与三个UI夹具、不包含Vitest文件；inventory重新生成及check通过393文件/886声明，脚本`node --check`和diff检查通过 |

上轮Code composer整体结构（本轮连体修正另列于下方）：

![当前Code composer](/home/wy/projects/monocode/build/composer-reference-webkit/code-light-1280-composer.png)

随后按[用户局部参考](/tmp/codex-clipboard-350605d2-5c50-4393-8296-c7b2b2277aa0.png)修正分支/base与worktree为连体外观：零间距、两半等高24.1875、中间边框与圆角为0、外角6；底部工具栏的通用圆角规则限定在toolbar，不再覆盖上方分支。仅调整CSS，未修改操作或状态。Chromium154.0.8037.97浅色和WebKit26.6深色，各验证勾选/未勾选，共4场景通过；checkbox切换、分支/base菜单及Escape回输入框通过，无页面错误。见[局部记录](../build/composer-connected/verification.json)。本次未重跑上轮99项组件测试及整页矩阵。

![修正后的连体控件](/home/wy/projects/monocode/build/composer-connected/chromium-light-checked.png)

进一步按[内部悬浮参考](/tmp/codex-clipboard-76b5154f-b968-4012-92ab-3bced59baab6.png)将分支/base与worktree的悬浮底色独立为内缩1、圆角4的内层，保留外框对接处的直边与连续轮廓。键盘可见焦点使用同样底色，禁用态不响应悬浮；没有新增动画或改变点击区域。

Chromium154.0.8037.97浅色、WebKit26.6深色的勾选前后检查通过，含12张局部基准/悬浮截图；内层底色实际可见，鼠标移开清除，外轮廓与尺寸不变，键盘焦点、切换及Escape正常，无页面错误。见[悬浮记录](../build/composer-hover/verification.json)，另有[Chromium复查](../build/composer-hover-chromium/verification.json)。本次仍仅检查CSS影响，没有重跑此前组件与整页矩阵。

![内部圆角悬浮](/home/wy/projects/monocode/build/composer-hover-chromium/current-worktree-hover.png)

随后按[默认main参考](/tmp/codex-clipboard-29e606af-027d-433d-ab65-b8868454364f.png)统一checkbox、菜单和快捷键的来源选择：有本地`main`时优先使用它，无本地`main`时回退当前分支；显式选择其他来源后保留，首次加载期间不允许切入。缺失/`HEAD`草稿来源同步成相同结果，避免显示与首次发送的创建来源不一致；连体控件显示`main`，保留完整aria/title。没有更改Provider、Host或存储合同。

本轮Vitest3.2.7：Composer56、Worktrees41、QuickGitPopup8，共105项通过；TypeScript定向检查、清单生成/check（393/886）、脚本语法和diff检查通过，不与此前99项累加。[真实组件浏览器检查](../build/worktree-main/verification.json)覆盖Chromium154.0.8037.97浅色和WebKit26.6深色：在`feature/current`上勾选会将草稿来源存为`main`，手动改为`release`可保留，取消后回到原工作分支，再勾选恢复默认`main`；同一textarea和未发送草稿保持，离线fixture未调用checkout、无页面错误。未实际创建Git工作树或运行原生Provider流程。

![默认main来源](/home/wy/projects/monocode/build/worktree-main/chromium-light-main.png)

同轮继续按用户要求统一勾选外观：桌面原生checkbox与共享Radix checkbox采用相同SVG勾/横线、蓝底白色标记、默认16/圆角5，Code紧凑12/圆角3，键盘焦点描边1/间隔1。自绘ProjectSelection沿用现有图标并统一笔画，避免叠加第二个勾；原生switch、Radix表单隐藏代理及手机主题不套此样式，保留显式`checkIconStrokeWidth`。没有新增勾选动画。

新增真实控件gallery检查和[勾选记录](../build/checkbox-reference/verification.json)：Chromium154.0.8037.97浅色、WebKit26.6深色，原生/共享控件鼠标和Space同步切换、原生混合态、禁用态、焦点轮廓、自绘标记无重复、switch尺寸32×20、隐藏代理及桌面marker隔离均通过；工作树仍默认`main`。共4张控件/工作树截图，零页面错误；最终TypeScript与diff检查通过，没有为CSS重复运行前述105项组件测试或整页矩阵。

![统一勾选样式](/home/wy/projects/monocode/build/checkbox-reference/chromium-light-worktree.png)

本轮按[分支列表参考](/tmp/codex-clipboard-8cd7fadc-e72e-4fb3-bae4-716d367c749e.png)统一桌面checkout/base菜单：320宽、最大360高，24高分支行，正常字重、无前置图标、右侧14蓝勾与圆角6浅灰选中背景；26高搜索框固定在底部，列表单独滚动。长列表加入边缘淡出、提示与始终可见的6宽可拖动滚动条，悬浮不会推动列表。打开和清空搜索定位当前项，短列表不强制填满，短窗按可用空间缩小；新建分支入口在滚动内容末尾，远程引用与既有切换保护保留。手机菜单仍用原尺寸/顶部搜索。

本轮Vitest3.2.7：BranchPicker8、WorktreeBasePicker4、Worktrees41、QuickGitPopup8，共61项；定向TypeScript检查通过。浏览器脚本`node tests/browser/branch-menu.verify.mjs`覆盖Chromium155.0.8059.39浅色/WebKit26.6深色，共6情景、4张局部截图，零页面错误。1280×932/DPR1两种菜单均实测320×360、列表高326、行高24、搜索312×26、选中行304×24；两引擎选中项滚动位置相差1 CSS px。检查包括当前项可见、搜索固定、滚动条拖动、悬浮不滚动、过滤/清空、Enter当前项不checkout、远程来源`origin/release`保留、同一textarea及中英文草稿保留、Escape恢复输入。640×240短窗菜单实测115.8125高，搜索完整可见。结果见[分支菜单记录](../build/branch-menu-reference/verification.json)。Node24.16.0、TypeScript5.8.3；没有运行构建、发布、真实Git checkout/创建、Provider或原生独立弹窗。

参考图495×536的约30物理px行距与24 CSS px在1.25倍率下相容，但原图DPR/缩放不明；本轮记录实现尺寸，不据此宣称±1 CSS px的原图验收。当前截图如下，旧范围不与本轮61项重复累加：

![分支菜单](/home/wy/projects/monocode/build/branch-menu-reference/chromium-light-checkout.png)

以下整体桌面矩阵是此前阶段已运行记录，本轮未重跑该完整矩阵；旧Code composer截图只能追溯早期排列。本轮新输入区的现行截图位于`build/composer-reference/`，不声称与原生参考逐像素一致。

发送按钮按[用户悬浮参考](/tmp/codex-clipboard-5720c5d5-c711-4a9d-a221-9e9c987c90bb.png)修正两条桌面Code CSS规则：空输入和可发送时共用中性圆角悬浮底色，禁用图标继续使用浅色，取消通用主按钮的brightness滤镜。默认亮色截图底色实测`#f3f3f3`，与参考采样一致；24×24/圆角6保持。[本轮定向检查](../build/send-hover-reference/verification.json)使用真实Composer，Chromium155.0.8059.39与WebKit26.6各浅暗主题，共4情景/8张截图通过，零页面错误；检查空输入/有草稿底色相同、移开清除、禁用图标保留、自定义accent不覆盖及Chat选择器隔离。仅CSS修正，未重复运行组件测试或TypeScript，未运行构建、发布或原生场景。检查脚本位于忽略目录`build/send-hover-reference/inspect.mjs`。

输入文字居中修正仅给桌面Code的`.composer-editor`增加`align-self:center`，使20高文字在24高操作行中居中；外框、字体和输入行为不变。[定向检查](../build/input-center-reference/verification.json)使用当前1437端口的真实Composer，Chromium155.0.8059.39/WebKit26.6各浅暗主题，4情景/8截图、零页面错误。通过局部覆盖重现旧规则时，文字中心比42高输入框中心低2px；修正后占位/中英文单行中心差为0，高亮层与textarea位置一致；两行外框58高、文字40高、发送按钮底部与编辑区底部一致，清空后恢复42高及居中。脚本位于忽略目录`build/input-center-reference/inspect.mjs`；纯CSS修正未重复运行组件测试/TypeScript、构建、发布或原生场景。

开发服务已恢复，并保留现有桌面进程。本轮未执行原生Tauri窗口、真实provider、原生输入法或真实PTY验收；服务可用不计作这些环境的验证结果。


## 权限与模型共用面板

权限菜单接入模型使用的`ComposerMenuPanel`，共用桌面宽度及列表尺寸，移除权限选项下方说明，并将标题改为与模型一致的常规字重。Code两者实测宽242、选项32高、字号14/20、圆角8；模型现有搜索、Provider行、目录和设置子菜单保留，Effort选项仍24高。Chat共享宽度为416；修正共享外框的max-width，避免权限被通用320上限截断。generic权限菜单不附加composer样式/字体，继续保留描述；运行中权限生效提示和触发器tooltip保留。

[本轮浏览器记录](../build/model-menu-reference/verification.json)覆盖Chromium155.0.8059.39/WebKit26.6各浅暗主题，4情景、8张模型/权限截图通过，零pageerror；模型搜索过滤/清空、选中标记、Effort密度、Escape及返回输入焦点通过。模型与权限尺寸直接相互比较；没有把用户PNG物理像素当CSS尺寸。模型参考343×514，权限参考332×259，DPR/缩放未知；本轮保持模型已校准的目录尺寸，并按用户最终澄清复用它。Chat权限和generic/mobile菜单未单独运行浏览器场景，相关宽度逻辑与样式隔离作源代码检查，不声称运行态验收。

ModelPicker32项、Composer56项测试通过（Vitest3.2.7）；生产src与三套夹具TypeScript检查通过（5.8.3），Node24.16.0。静态清单重新生成并check通过，当前397文件/891组件声明；脚本语法及diff检查通过。检查脚本与截图位于忽略目录`build/model-menu-reference/`，没有构建、发布或真实原生/provider场景验证。

![权限菜单](/projects/monocode/build/model-menu-reference/chromium-light-code-access.png)

## 此前整体桌面重构

- 桌面亮暗主题改为参考的页面、侧栏、表面、文字、hover、描边和遮罩颜色，继续提供原语义变量与设备本地颜色模式迁移。
- 桌面颜色alias桥接优先于旧`html.theme-light`默认值，统一修正主区域和次级页面继承的窗口、面板、卡片、菜单hover、accent与link颜色；保留inline外观值及显式用户强调色。
- 侧栏使用288宽、44高顶栏、32高导航/会话行和顶部Chat/Code切换；模式对应的会话状态保持。项目、历史与归档列表保留agent图标和用户标题规则。
- Projects的真实Open project/New chat操作放在筛选工具栏右侧并使用主按钮，选中页签使用圆角浅底；筛选工具栏允许换行，窄窗口保持项目页内部无横向溢出。
- Notes与Automations按可用pane宽度适配：不超过680时顶部列表最多200高、详情/模板全宽，列表和正文分别滚动；Automations模板区域小于600时单列，宽窗口保留两栏。
- Chat使用居中问候、640宽输入和15/21输入文字；Code使用紧凑32高面板顶栏、14/20正文及14/18用户消息。保留多个会话、工具、附件、问题、审批、文件、Git和终端能力。
- 设置改为居中1024×800弹窗、192导航和无卡片外框的分隔行。设置搜索、恢复默认、分区导航、键盘和原生拖拽入口继续可用。共享菜单区分普通32高和显式紧凑24高。
- IBM Plex字体和OFL许可本地分发；只尝试本机Anthropic字体，不下载品牌文件。用户字体和有效已存储字重优先；无有效偏好时桌面字重400，手机仍500。
- 弹窗、菜单与折叠沿用共享Motion/AnimatedCollapse规则。AppViewDialog在当前顶层弹窗内循环Tab焦点，尊重嵌套弹窗和已处理的键盘事件，继续由业务页处理Escape；关闭后恢复原控件焦点。修复Workflow Select关闭后丢失选中标签：动画期间保留可见内容，结束后让Radix的隐藏DocumentFragment继续登记选项；退出或父界面隐藏时禁止交互及嵌套Portal。
- Workflows上次运行徽标补齐7个`automations.time.*`消息映射及中文模板，过去/未来时间不再显示原始翻译键；不改时间计算或用户/provider内容。

## 此前整页与交互检查

实测工具版本：Node24.16.0、TypeScript5.8.3、Vitest3.2.7、Playwright1.63.0；浏览器实际版本见下表。

聚焦检查分批运行，以下数量不可相加为互不重复的总测试数：

最终交互合并复查为App79、SidebarTransition3、AppViewDialog3、automationFormat16，共101项全部通过（`/tmp/monocode-claude-final-interaction-tests.log`）。该范围与下表重叠，不另外累加；类型检查结果与浏览器补充范围分别记录。

| 命令/范围 | 观察结果 |
| --- | --- |
| `vitest run`：desktopSkin、desktopSkin.mobile、desktopSkin.contrast、desktopAppearance、omb-metrics、SearchableSelect、Modal七个文件 | 45项通过；主题迁移、移动隔离、语义文字对比度、尺寸作用域及公共控件 |
| `SettingsView.test.ts -t 'drags the window from the popup header\|only leaves Settings on Escape'` | 2项通过；搜索/动作/关闭/正文不触发拖窗，Escape只关闭活动设置 |
| `AppViewDialog.test.ts` | 最终3项通过；退出保留/inert、嵌套可见性、重复关闭限制和焦点恢复；双向Tab边界、不可用控件过滤、defaultPrevented与嵌套弹窗优先 |
| typography与SettingsView，`-t 'appearance profiles\|restore\|Restore defaults'` | 8项通过；桌面400、移动500、保留有效用户字体/字重、恢复默认 |
| Workflow `select.test.ts` | 3项通过；默认/受控选中标签、退出生命周期、隐藏父界面、减少动态效果 |
| Workflow `automationFormat.test.ts` | 16项通过；实际workflowIntl的英/中文分钟、小时、天、过去/未来及即时文案 |
| App、desktopMode、ProjectsPage三个文件，分批`vitest run --silent` | 105项通过（最终App79、模式21、项目5）；App包括3项启动模式回归 |
| 侧栏/项目/归档/搜索聚焦检查 | 181项通过（7、57、6、111项分组），保留agent图标、标题和操作行为 |
| WorkspaceSnapshot与language | 77项通过 |
| ToolsDock | 4项通过；按需挂载、关闭/反转、减少动态效果、键盘调尺寸、Changes及已访问pane状态保留 |
| Composer | 56项通过；输入和picker在busy及模式变化时保持 |
| 模型picker/会话工具栏/既有MotionPresence | 46项通过（32、11、3），菜单密度和退出状态 |
| `node scripts/desktop-visual-inventory.mjs`及`--check` | 最终通过；393个source文件、886个组件声明；Claude有效元数据和`connections/files`分组已更新，不推断运行覆盖 |
| `npx tsc --noEmit --pretty false -p tests/browser/tsconfig.desktop.json` | 最终通过；全部生产src与desktop-visual、desktop-pages、desktop-tools三个真实UI夹具；配置明确不包含Vitest测试文件 |
| `git diff --check`及`node --check tests/browser/desktop-states.verify.mjs` | 最终通过 |
| `node tests/browser/desktop-visual.verify.mjs` | 通过；Chromium154.0.8037.97、DPR1，47张截图、17组检查，零pageerror |
| `VISUAL_BROWSER=webkit node tests/browser/desktop-visual.verify.mjs` | 通过；Playwright WebKit26.6、DPR1，49张截图、18组检查，含新增Projects两主题几何检查，零pageerror |
| 最终会话CSS补充检查 | 通过；刷新17张Chat/Code截图，浅暗Code顶栏背景等于页面色；200%正文得到Chat32/52、Code28/40，零pageerror |
| Projects两主题补充测量 | 标题x328/y56；卡片x328/y172、444×137；模式切换x207.703125/y10、70×28；WebKit完整检查的卡片y173，在1px容差内 |
| Projects最终工具栏布局 | Chromium/WebKit×浅暗×1280/1000/800共12情景通过；项目页内部无横向溢出，零pageerror；ProjectsPage原5项测试再次通过 |
| MenuBar窄窗口检查 | 800px下菜单滚动、Tab焦点与窗口按钮hit test通过 |
| 最终主题alias聚焦检查 | Chromium与WebKit两主题通过；10组alias映射一致，真实shell/Settings/Bots背景正确，inline窗口色/用户强调色保留，移动标记移除桌面覆盖；刷新12张截图、零pageerror |
| AppViewDialog真实Settings焦点检查 | Chromium/WebKit各4组通过、零pageerror；47个可聚焦控件首尾循环，完整Tab遍历不离开弹窗，Escape/Close退出后恢复原控件 |
| 桌面工具组合离线夹具 | Chromium浅暗两主题、8张截图、6组检查通过，零pageerror；真实Files/GitReview/SourceControl/CodeMirror/xterm组件与会话并存，保留输入/编辑器/终端节点，退出与快速反转、模拟隐藏输出、减少动态效果及1280×932无溢出 |
| `node tests/browser/desktop-pages.verify.mjs` | Chromium154.0.8037.97通过；29页面情景与侧栏回归，共30张截图、5组检查，零pageerror、零未实现RPC、零文档横向溢出 |
| `DESKTOP_PAGES=automations node tests/browser/desktop-pages.verify.mjs` | 最终8情景通过，零pageerror/RPC/溢出；800中文列表最多200高且模板/编辑器全宽，1280仍两栏；与前一矩阵合并为31张不同截图 |
| `node tests/browser/desktop-states.verify.mjs` | 浅暗主题4张Question/Approval截图、6组检查通过，零pageerror；真实问题回调/焦点、Allow/Deny request9、合成IME Enter防误发及发送→busy Stop→idle UI回调 |
| 已执行草稿与附件保留检查 | 人工浏览器检查保留Code原textarea节点、两行草稿及附件，切Chat独立草稿再回Code，侧栏切换及减少动态效果后仍保持，零pageerror；另有组件测试范围记录 |

Bots离线浏览器runner另有9组场景通过、errors为空，记录在`build/bots-rea/scenarios.json`；macOS关闭侧栏后的44高折叠入口有独立截图检查。它们不等于真实原生窗口验收。

浏览器结果在[Chromium结构化记录](../build/desktop-visual/chromium-verification.json)、[WebKit结构化记录](../build/desktop-visual/webkit-verification.json)和`build/desktop-visual/claude-browser.log`。Projects补充数据在[独立几何记录](../build/desktop-visual/projects-geometry.json)。这些文件和截图位于忽略的build目录；不随源码提交，可用夹具脚本重新生成。

Projects最终工具栏布局见[12情景补充记录](../build/desktop-visual/projects-final-layout.json)，两引擎两主题同名截图已刷新。1280×932时标题与卡片的基准几何保持；1000×800和800×600时筛选工具栏换行，单列卡片宽664和464、高137，Chromium卡片y212/y252、WebKit y217/y257，均无内部横向溢出。

最后的会话行高及Code顶栏颜色调整另有[补充记录](../build/desktop-visual/claude-conversation-refresh.json)，已刷新对应截图；默认Chat输入仍640×105、Code输入800×42。

完整浏览器检查后的主题alias修正另有[双引擎聚焦记录](../build/desktop-visual/desktop-theme-aliases.json)。Projects、真实Settings及Bots两主题截图已刷新：共享主区域与Bots为`#fcfcfb`/`#151515`，Settings表面为`#fff`/`#1a1a19`。此检查验证共享继承与列出的实际组件，不代表全部次级业务页面都已运行。

Workflows时间徽标的[单页语言补充记录](../build/desktop-pages/workflows-time-localization.json)确认真实组件分别显示`Completed · 21h ago`、`已完成 · 21 小时前`，不含原始ID或未替换占位符，零pageerror。相对时间随检查时刻变化，记录中的21小时不是固定界面文案。

AppViewDialog的[双引擎焦点记录](../build/desktop-visual/app-dialog-focus.json)使用生产SettingsView、实际弹窗与背景触发按钮，确认完整键盘循环和退出恢复。工具组合的[结构化记录](../build/desktop-tools-visual/verification.json)使用生产嵌套关系，Files工具表面全高、终端仅占工作区列，工具track288包含8px右边距，实际面板280；最终leaf铺满工作区。覆盖真实UI组件与人工内容；终端输出和原生RPC为模拟数据，未启动或验证真实PTY。

次级页面的[矩阵记录](../build/desktop-pages/verification.json)包含Workflows、Automations、Notes、Inbox和Search：1280×932浅暗主题24个主页/详情/历史情景，800×800中文5个主页情景，以及侧栏回归。覆盖工作流定义/运行历史、Automation编辑/历史、Note Markdown源码、Inbox PR检查及真实Search结果。Notes窄pane采用顶部最多200px列表和下方全宽详情，第二条笔记仍可选择；Automation模板窄pane改为单列。

Automations最终纵向适配有[8情景补充记录](../build/desktop-pages/verification-automations.json)，覆盖800中文模板和已有自动化编辑器的名称、运行、保存、触发与指令入口；宽窗口保留两栏。两份页面报告存在重叠，最终不同截图共31张（原30张加窄窗编辑器1张），不把两轮数量相加。

侧栏实测初始关闭宽0，展开/关闭50ms都处于中间宽度，快速反转回288；直接拖动保存368并在重新展开时恢复，拖动期间关闭释放resize状态，减少动态效果立即打开/关闭。Search浅暗主页和结果保留HarnessIcon及应用前缀显示规则；浏览器夹具的Search关闭回调为空，关闭归属由App测试覆盖，本轮不声称Search浏览器级关闭后焦点恢复已验证。

[Question/Approval及输入状态记录](../build/desktop-state-visual/verification.json)使用真实问题选项和审批控件，确认Send精确回调并回到composer焦点，Allow/Deny回传request9且不执行命令。合成`isComposing` Enter不发送，结束合成后Enter进入夹具busy状态，实际Stop点击回到idle；这验证UI事件链，不等于原生输入法或真实provider启停验收。[草稿与附件保留记录](../build/desktop-visual/retained-state-check.json)列明已执行人工步骤与组件测试范围；人工记录不能作为可自动重放的脚本。

浏览器实测包括：

- 1280×932下浅/深设置弹窗均为x128/y66、1024×800；导航192；标题x344/y126、15/20；搜索x140/y78、167.1875×32。常规像素容差0.1，宽度取整保留实际值。
- Gallery和真实Settings组件在两个主题、1280×932、1440×900、1000×800、800×600均无文档横向溢出；800×600使用中文与125%文字。另测120%CSS zoom；没有把CSS zoom当原生缩放验收。
- 全部12个现有设置分区以离线数据渲染。检查按钮24/28/32/36/40、开关32×20/滑块16/位移12、普通/紧凑菜单32/24、实际WAAPI弹出时长200ms、退出inert和卸载、Escape、选择后的焦点归还、快速折叠反转及减少动态效果。
- 真实Chat/Code空态和会话在两个主题渲染：侧栏288、Chat输入宽640/圆角14/15/21、Code顶栏32/正文14/20/用户14/18；模型菜单宽416/242。另捕获Code双面板、运行中、问题和Chat附件状态；native/provider RPC使用人工离线响应。
- Projects浅暗两主题在1280×932下，标题x328/y56、24/32；卡片x328/y172、444×137；模式切换x207.703125/y10、70×28。WebKit完整记录中卡片y173，其余上述几何一致，按1 CSS px容差通过。
- 本地IBM Plex字体成功加载；应用排版初始化默认400，显式用户字体和600字重优先。设置移动标记后桌面作用域和尺寸token被移除；没有操作实体手机。

## 截图与复现

| 范围 | 截图 |
| --- | --- |
| 设置1280×932 | [浅色](../build/desktop-visual/chromium-settings-light-1280.png)、[深色](../build/desktop-visual/chromium-settings-dark-1280.png) |
| 中文/125%文字800×600 | [深色设置](../build/desktop-visual/chromium-settings-dark-800-large.png) |
| 公共控件 | [浅色](../build/desktop-visual/chromium-gallery-light-1280.png)、[深色](../build/desktop-visual/chromium-gallery-dark-1280.png) |
| Chat空态 | [浅色](../build/desktop-visual/chromium-chat-empty-light-1280.png)、[深色](../build/desktop-visual/chromium-chat-empty-dark-1280.png) |
| Code会话 | [浅色](../build/desktop-visual/chromium-code-conversation-light-1280.png)、[深色](../build/desktop-visual/chromium-code-conversation-dark-1280.png) |
| Code双面板 | [浅色](../build/desktop-visual/chromium-code-split-light-1280.png)、[深色](../build/desktop-visual/chromium-code-split-dark-1280.png) |
| 模型菜单 | [Chat](../build/desktop-visual/chromium-chat-model-light-1280.png)、[Code](../build/desktop-visual/chromium-code-model-dark-1280.png) |
| Projects | [Chromium浅色](../build/desktop-visual/chromium-projects-light-1280.png)、[Chromium深色](../build/desktop-visual/chromium-projects-dark-1280.png)、[WebKit浅色](../build/desktop-visual/webkit-projects-light-1280.png)、[WebKit深色](../build/desktop-visual/webkit-projects-dark-1280.png) |
| WebKit设置 | [浅色](../build/desktop-visual/webkit-settings-light-1280.png)、[深色](../build/desktop-visual/webkit-settings-dark-1280.png) |
| MenuBar800px | [Alt菜单](../build/desktop-visual/audit-alt-menu-at800.png)、[固定菜单](../build/desktop-visual/audit-pinned-menu-at800.png) |
| 工具组合 | [浅色Files/Review/终端](../build/desktop-tools-visual/code-light-files-review-terminal-1440.png)、[深色SourceControl/编辑器/终端](../build/desktop-tools-visual/code-dark-source-control-editor-terminal-1440.png) |
| 次级页面800中文 | [Notes](../build/desktop-pages/notes-home-light-800-zh-CN.png)、[Automations](../build/desktop-pages/automations-home-light-800-zh-CN.png)、[Search](../build/desktop-pages/search-home-light-800-zh-CN.png) |
| Automations窄窗编辑器 | [800中文](../build/desktop-pages/automations-editor-light-800-zh-CN.png) |
| Question/Approval | [浅色Question](../build/desktop-state-visual/code-question-light-1280.png)、[深色Approval](../build/desktop-state-visual/code-approval-dark-1280.png) |
| 本轮Code composer | [浅色](../build/composer-reference/code-light-1280.png)、[深色](../build/composer-reference/code-dark-1280.png) |
| 本轮WebKit composer | [浅色](../build/composer-reference-webkit/code-light-1280.png)、[深色](../build/composer-reference-webkit/code-dark-1280.png)、[实际元素截图](../build/composer-reference-webkit/code-light-1280-composer.png) |
| 本轮composer适配 | [中文20px](../build/composer-reference/code-font20-1000-zh-CN.png)、[DPR1.25](../build/composer-reference/code-dpr125-1280.png)、[窄split](../build/composer-reference/code-narrow-split-1000-zh-CN.png)、[Chat](../build/composer-reference/chat-light-1280.png)、[隔离compact](../build/composer-reference/compact-light-390.png) |

直接启动Vite，不运行build/publication：

```sh
./node_modules/.bin/vite --host 127.0.0.1 --port 1436 --strictPort
node tests/browser/desktop-visual.verify.mjs
VISUAL_BROWSER=webkit node tests/browser/desktop-visual.verify.mjs
node tests/browser/desktop-pages.verify.mjs
node tests/browser/desktop-tools.verify.mjs
node tests/browser/desktop-states.verify.mjs
node tests/browser/composer-reference.verify.mjs
VISUAL_BROWSER=webkit node tests/browser/composer-reference.verify.mjs
```

脚本支持`VISUAL_BASE_URL`、`CHROME_PATH`、`VISUAL_BROWSER=webkit`。夹具只用于开发测试，不加入应用路由。所有截图都是Monocode真实组件和人工内容，不是参考应用截图。

## 验收边界

本轮浏览器验证覆盖Chromium154.0.8037.97和Playwright WebKit26.6离线夹具。Playwright WebKit通过不等于WebKitGTK或Tauri真实窗口通过；没有验证WebKitGTK、真实Tauri窗口、Windows、实体移动端、原生首绘/缩放/多窗口同步、原生输入法、真实provider流式输出/启停、真实终端PTY、全部编辑器/Diff/Bots业务组合或原生弹窗。既有终端与工作区行为测试不能替代这些环境的实际运行。

参考自身也未覆盖正常流式输出、交互式shell、全部设置业务、页签拆分/永久浮窗等行为；替代字体与Monocode内容会改变字形和换行。当前记录证明列出的几何、状态与检查结果，不声称整个应用或全部参考状态逐像素一致。
