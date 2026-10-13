# Monocode 桌面视觉规格（2026-10-13）

当前桌面以 `/home/wy/projects/claude-ui-analysis` 的最终测量资料为基础；Code composer布局以用户后续提供的截图为优先，覆盖旧资料中冲突的输入区排列。应用保留 Monocode 的真实会话、多个 provider、工具、项目、文件、Git、终端和其他工作区能力。移动端继续使用独立主题和布局。

## 参考与复刻边界

Code composer的排列以[用户补充截图](/tmp/codex-clipboard-517004d9-b744-4f1d-986f-079536a2f73c.png)为首要参考：环境/项目/分支和worktree在输入框上方，附件/权限及模型/effort/context在下方一行。此覆盖仅涉及Code composer；Chat、compact及用户字体/缩放仍保留各自规则。

补充截图未提供CSS尺寸或DPR，因此只用其相对结构和视觉关系指导排列；800宽、42高输入与28高底栏是当前实现的可验证CSS基准，不由截图物理像素反推，不据此声称与附件误差不超过1 CSS px。原分析报告的测量只适用于已对应的界面区域。

其余数值优先级为 [最终比较](/home/wy/projects/claude-ui-analysis/final-comparison.md)、[最终测量 CSV](/home/wy/projects/claude-ui-analysis/verification/final-comparison/metrics.csv)、原始 `source.json`，然后是 [设计变量](/home/wy/projects/claude-ui-analysis/design-tokens.md)、[布局](/home/wy/projects/claude-ui-analysis/layout.md) 和 [菜单](/home/wy/projects/claude-ui-analysis/menu-metrics.md)。最终记录已修正部分早期摘要的侧栏颜色、输入字号和设置导航尺寸。

参考项目的 Aster demo 是独立实现；公开截图来自该 demo，原站私有截图、品牌字体和业务后端不在交付中。参考报告的 206 条指定指标通过不等于整个产品逐像素一致。Monocode 对齐可复用的布局、尺寸、配色与状态表现，保留自身内容和能力；不加入无功能的 Claude 账户、计费或模型入口。

参考未确认的正常生成节奏、交互式终端、页签拆分、永久浮窗和全部业务状态，不能作为已验证的原站行为。Monocode 的既有能力继续使用现有实现。

## 桌面布局与控件

以下为默认字号和缩放下的 CSS px。用户字号、缩放与字体偏好仍优先；含多行内容的控件自然增高。

| 区域 | 有效规格 |
| --- | --- |
| 侧栏 | 默认宽288，顶栏44，搜索32；导航/会话行32，文字14/21，图标20置于28的图标位；底栏48 |
| 模式入口 | 侧栏顶部双图标组70×28，单项34×26、图标16；Chat与Code切换保留两侧会话状态 |
| 新对话 | 输入卡最大宽640、圆角14；输入15/21；问候使用serif、`clamp(1.5rem, 1.15rem + 1vw, 2rem)`、行高1.2 |
| Chat正文 | 独立滚动的居中正文、底部输入；现有附件、消息操作、问题与审批继续可用 |
| Code | 32高的面板顶栏；紧凑输入/工具；AI正文14/20、用户正文14/18；代码和日志继续用等宽字体 |
| Code composer | 上方显示真实Local/Remote环境、项目短名、真实分支及worktree checkbox/既有worktree菜单；中间默认最大宽800、单行输入高42、圆角14、输入14/20、轻量return发送图标；下方单行显示附件/真实权限与模型/按provider能力显示的effort/context，默认行高28、context距末个模型控件8。窄pane上方可换行，底部工具可横向滚动；字号或内容增大时自然增高 |
| 面板 | 圆角10、间距12；保留既有分栏、拖拽、编辑器、Diff和终端网格，关闭与拖拽不中断PTY |
| 项目 | 24/32 serif标题、两列卡片、间距24、卡片圆角12；1280×932默认布局标题x328/y56，卡片x328/y172、444×137；主操作在筛选工具栏右侧，选中页签圆角浅底，窄窗口筛选工具栏换行；实际名称、时间、工作区操作保持现有语义 |
| 设置弹窗 | 最大1024×800、圆角12、居中；1280×932且无原生顶栏偏移时为x128/y66；导航192；内容留白上60、左右24 |
| 设置内部 | 导航项32、14/20、图标20；标题15/20、字重580；去除内容卡片外框，改为带分隔线的设置行；搜索167.2×32 |
| 次级页面窄pane | Notes/Automations可用宽度不超过680时纵向排列，顶部列表最多200高、详情/模板全宽并分别滚动；Automations模板区域小于600时单列，宽窗口保留两栏 |
| 常规按钮 | xs/sm/md/lg/xl最小高度24/28/32/36/40；小号13/19、常规14/20；默认圆角随尺寸为6/7/8/9/10 |
| 图标按钮 | xs/sm/md/lg为20/24/32/40，图标12/16/20/24；保留显式圆形按钮语义 |
| 开关 | 32×20、滑块16、内距2、位移12；受控状态和禁用状态保持原接口 |
| 复选框 | 桌面原生与Radix共用蓝底白勾/横线、透明未选底；默认16×16、圆角5，Code紧凑12×12、圆角3；键盘焦点描边1、间隔1。统一SVG路径与比例，不依赖系统原生勾选绘制；保留显式图标笔画选项 |
| 输入控件 | 默认最小32、14/20、圆角8；带图标输入保留图标/清除按钮空间，源码和终端内容不套此规则 |
| 普通菜单 | 外框padding0、内层滚动gutter4；行32、14/20、padding6×10、gap8、行圆角8、面板圆角12；最小宽128，通常最大320；分隔区共9 |
| 紧凑菜单 | 显式`data-menu-density="compact"`：行24、13/19、padding2.5×8、gap6、行圆角6、面板圆角10；不能按Code模式把侧栏右键全部缩成24 |
| 分支菜单 | 桌面checkout与worktree base共用320宽、最大360高、圆角10；分支行24、13/19、内距8、圆角6、正常字重，无前置分支图标，选中项右侧14蓝勾；列表独立滚动，底部搜索高26、圆角6、外距3；长列表保留6宽可拖滚动条、边缘淡出及滚动提示。短列表自然收缩，短窗按实际空间缩小 |

菜单补充依据为 `menu-metrics.md` 与 `evidence/menu-source-audit.json`：菜单表面使用亮色 `#fff` / 暗色 `#20201f`，以 `--shadow-panel` 的描边与投影代替实体 border，避免总高度额外增加2px。Chat模型菜单宽416；有描述的行最小50，标题14/20、描述13/17、padding6px 10px 7px；Effort选项保持单行32。菜单说明行最小42、13/17、padding4px 10px，账号标题25。内容多行或字号增大时自然增高，长模型目录只设滚动上限。Settings字体菜单option32、14/20、padding4px 12px，零padding的listbox最多四行216×128；外层gutter4后224×136。Chat和Settings勾选20、Code紧凑16，子菜单箭头16。三点和普通菜单复用相同外框，按钮透明，内部绝对定位span负责hover/选中填色；悬浮过渡遵循项目统一缓动与减少动态效果偏好。

权限与模型的桌面composer菜单共用`ComposerMenuPanel`外壳、宽度计算和列表尺寸。Code宽242，Chat宽416；模型目录与权限选项均使用32高、14/20、行圆角8，权限标题使用相同常规字重，只显示图标和名称，移除说明小字。模型已有目录外观与搜索/Provider结构保持；Code设置及Effort子菜单仍为24高。权限触发器提示和运行中的“下一轮生效”提示保留；普通工具页面和移动端继续保留原描述及尺寸。共享样式仅作用于桌面composer，Chat的416宽上限与模型相同。

所有会话列表，包括归档列表，继续使用 `HarnessIcon` 加 `sessionDisplayTitle`；仅清除显示时的应用前缀，保留存储标题与用户文字。

Code composer的环境、项目、分支、worktree、权限和模型沿用真实状态与操作；不添加参考图中没有对应现有功能的麦克风或pet。Worktree checkbox切换既有draft workspace mode/base，菜单仍提供原worktree操作；Chat保持640宽输入，compact保持独立结构。

Code发送按钮按[悬浮参考](/tmp/codex-clipboard-5720c5d5-c711-4a9d-a221-9e9c987c90bb.png)使用统一中性悬浮底色`--color-control`，移除继承的brightness提亮；默认亮色在白底上为`#f3f3f3`，与参考实测像素一致。空输入与可发送状态的底色相同，禁用图标仍保持浅色；按钮24×24、圆角6及既有发送语义保留，仅作用于桌面Code。

Code输入文字按[用户居中反馈](/tmp/codex-clipboard-df3a6089-610f-45e9-9944-bca2caa39b92.png)将编辑区域自身垂直居中：20高的单行文字不再与24高发送按钮底部对齐，消除2px向下偏移。占位文字、textarea和高亮层同步对齐；单行外框仍42高，多行自然增高且发送按钮继续靠底。字体、行高、输入事件及Chat/compact规则保持。

分支/base与worktree checkbox按[用户补充局部图](/tmp/codex-clipboard-350605d2-5c50-4393-8296-c7b2b2277aa0.png)呈现为连体控件：两半等高、零间距，外框对接处无边框和圆角，整体两端圆角6；旁边的worktree菜单入口保持独立。各半内部的悬浮/键盘焦点底色按[悬浮参考](/tmp/codex-clipboard-76b5154f-b968-4012-92ab-3bced59baab6.png)独立圆角4、内缩1，不改变连体外框或点击区域。

勾选工作树默认从本地`main`分支创建，即使当前工作副本在其他功能分支；没有本地`main`时沿用当前分支。已有手动来源选择优先，首次分支列表加载完成前禁止切入工作树，checkbox、菜单与快捷键共用解析规则。恢复缺失/`HEAD`来源时将同一结果写回草稿状态。勾选后的连体控件只显示来源分支名，完整创建语义保留在标题和无障碍名称中；创建仍沿用首次发送时的既有流程。

分支列表按[用户分支菜单参考](/tmp/codex-clipboard-8cd7fadc-e72e-4fb3-bae4-716d367c749e.png)调整：打开及清空搜索时定位当前分支/已选来源，键盘移动同步滚动，鼠标悬浮不推动列表；搜索位于底部且不会随列表滚走。checkout的新建分支操作位于滚动内容末尾，搜索可直接创建未存在的名称；实际分支、远程来源与切换保护逻辑保留。移动端仍采用原280宽/最大280高和顶部搜索。该PNG为495×536，约30物理px行距与24 CSS px紧凑规范在1.25显示倍率下相容；原图DPR/缩放未确认，320/360/24/26为当前实现并实测的CSS基准，不声称截图逐像素验收。

## 颜色、字体与兼容

| 角色 | 浅色 | 深色 |
| --- | --- | --- |
| 页面 | `#fcfcfb` | `#151515` |
| 侧栏 | `color(srgb .982353 .982353 .976471)` | `color(srgb .0658824 .0658824 .0658824)` |
| 内容卡片/菜单 | `#ffffff` | `#1a1a19` / `#20201f` |
| 主文字 | `#0b0b0b` | `#f0efec` |
| 次文字 | `#52514e` | `#c3c2b7` |
| 淡文字 | `#898781` | `#898781` |
| focus/accent | `#2a78d6` | `#2a78d6` |
| hover | 黑5% | 白7.5% |
| 弹窗遮罩 | 黑40% | 黑50% |

桌面表面采用不透明参考材质。语义 `--color-*` 接口保留；桌面alias桥接优先于旧浅色默认值，避免`body-glass`等公共主区域退回旧灰色背景，inline外观值仍优先。Portal也受同一 `html[data-skin]` 作用域约束；Bots额外限定于其桌面host，避免与手机或其他`assistant-chat`样式碰撞。

字体优先使用用户的UI/正文/代码字体，再尝试本机已安装的Anthropic字体，最后使用随应用分发的IBM Plex Sans/Serif/Mono及系统CJK字体。Anthropic名称只使用`local()`，不下载或分发品牌文件。IBM Plex字体和OFL许可位于`public/fonts/ibm-plex/`。不同字体轮廓、CJK回退和换行存在差异，不能声称字形逐像素一致。

没有有效字重偏好时，桌面UI/正文/代码默认400，移动端仍默认500。已存储的有效字体和400/500/600/700字重保持原值，不批量重写用户配置；设置中的恢复默认使用当前文档对应默认值。

`desktopAppearance.ts`继续执行幂等、设备本地的颜色模式迁移：有效新键优先；旧命名皮肤映射到其light/dark方案；auto/classic沿用旧颜色模式；无效值按既有规则回退。首次迁移备份旧偏好且不覆盖已有备份，不删除旧值、不写移动端共享颜色键。运行时标记为`claude-measured-v1`，首绘与原生背景使用同一页面色。

## 动画与样式所有权

参考中独立spring、旧`framer-motion`导入和多种缓动不直接搬入。项目规则优先：免费MIT版`motion/react`、统一`[0.22,1,0.36,1]`，消息180ms、弹出200ms、面板240ms；列表增删排序用AutoAnimate，hover/按压/loading点用CSS。

弹窗使用200ms透明度和`.98↔1`缩放；退出期间保留节点、禁止交互与嵌套Portal，完成后恢复焦点。AppViewDialog仅在其为当前顶层弹窗时处理Tab首尾循环，过滤不可用控件，尊重子控件的defaultPrevented及嵌套Portal，原业务Escape处理保持。菜单保留定位、子菜单、键盘和焦点行为。纵向展开/收起统一使用`AnimatedCollapse`；网格使用`useCollapseMotion`和`animated-collapse-size`；关闭保持零轨道，直接调整尺寸时禁用过渡，终端隐藏时保持挂载。所有动态效果遵循系统和应用的减少动态效果偏好。

颜色在 `desktop-theme.css`，桌面尺寸在 `desktop-tokens.css`，字体与排版统一在 `src/shared/styles/fonts.css` 和 `typography.css`。共享控件通过明确的 `data-ui` 标记接入平台样式；设置、工作区、侧栏、会话各自管理布局。旧 OMB 层和兼容转导出已移除。

具体已运行的检查、截图和未验收环境见[本轮交付记录](desktop-visual-delivery.md)。Chromium154.0.8037.97及Playwright WebKit26.6的离线夹具检查已通过；Projects两主题的WebKit卡片y173相对目标y172存在1 CSS px差异，按记录中的容差通过。该结果不替代WebKitGTK、真实Tauri窗口、provider流式输出或真实PTY验收。旧Grok证据和组件清单可作历史追溯，不能作为本规格的Claude运行态验收结果。

用户新composer截图对应的Chromium/WebKit定向检查分别记录在`build/composer-reference/verification.json`和`build/composer-reference-webkit/verification.json`；此前整页矩阵不是本轮重跑结果。DPR1.25是浏览器设备比例模拟，390宽compact场景只挂载真实Composer，不代表完整手机壳或原生逐像素验收。
