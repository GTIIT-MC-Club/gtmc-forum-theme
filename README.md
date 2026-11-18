# GTMC 论坛主题

Discourse 主题：浅色、深色两套配色跟随系统，草方块绿强调色，圆角收小、边框硬朗；**开源像素字体只用于标签、在线人数和日期块**，其余一律系统字体。
不使用 Mojang 的任何素材，不复刻 Linux.do 的视觉稿。

## 目录

```
about.json              主题元数据、两套配色、像素字体的注册
common/common.scss      手机和桌面共用：字体声明、核心 CSS 变量覆盖、Logo、按钮
desktop/desktop.scss    仅桌面：页面宽度固定（侧边栏收起时不变窄，开关不动）、侧边栏展开时页脚与正文对齐、右栏的分栏
（没有 mobile/：手机端目前不需要额外样式，需要时再加 mobile/mobile.scss。
 当前版本的核心不按设备二选一，而是给桌面样式表加 media="(width >= 40rem)"：视口不小于 640px 就加载，
 所以手机竖屏不受 desktop.scss 影响，但横屏的平板会加载它。）
javascripts/            页脚、右栏、置顶标签、全局提示的组件（Glimmer）和挂载它们的 api-initializer，见「页脚」「右栏」「全局提示」
test/                   QUnit 测试，随主题上传，见「全局提示 · 测试」
locales/                主题描述、设置项说明（theme_metadata）和页脚的界面文字（中英文）
settings.yml            主题设置：Discord 邀请链接和页脚的两个站内链接，见「页脚」
assets/                 子集化后的像素字体（woff2）
icons/                  像素图标，一个图标一个 .svg 文件，文件名就是图标名，见「图标」
fonts/                  字体的许可文件、子集字符表（不随主题上传时也要保留，见下）
```

## 开发

需要一个 Discourse 站点和它的管理员 API Key。

```sh
gem install discourse_theme
discourse_theme watch theme/        # 首次运行会问站点地址和 API Key，之后保存修改会实时同步
```

本地开发站的搭法不在本仓库里；视觉效果要在站上看，还没逐项看过的见本文末尾「待验证」。

## 部署到论坛

主题放在仓库的 `theme/` 子目录。Discourse 的「从 Git 仓库安装」会克隆整个仓库并在仓库根目录找 `about.json`
（核心的 `git_importer.rb` 里没有子目录选项），所以用压缩包导入。打包、导入、设默认主题、设配色都由
`infra/discourse/import_theme.rb` 完成，不要在后台手动传压缩包：

```sh
docker cp theme app:/tmp/gtmc-theme && docker cp infra/discourse/import_theme.rb app:/tmp/ && \
  docker exec -u discourse -w /var/www/discourse app \
    bundle exec rails runner /tmp/import_theme.rb /tmp/gtmc-theme
```

脚本把 `theme/` 里除 `fonts/`、`icons/`、`README.md` 以外的文件打成压缩包（`fonts/` 和 README 只给仓库读者看），
并把 `icons/` 里的图标拼成一个图标精灵一起打进去，已有 GTMC 主题就原地更新，没有就新建；
导入后检查主题的样式和模板有没有编译错误，有就报错退出。改了主题后重跑即可，可重复执行；
后台里设过的主题设置（如 `discord_invite_url`）不会被覆盖。

### 脚本替你做的设置

1. **设为默认主题**：GTMC 成为全站默认主题。
2. **配色方案跟随系统**：浅色配色设为 `GTMC Light`，深色配色设为 `GTMC Dark`
   （核心字段 `Theme#color_scheme_id` 和 `dark_color_scheme_id`），访客系统是深色模式时自动用深色。
   两套配色都设为允许用户在「偏好设置 → 界面」里自选（`ColorScheme#user_selectable`）。
   这里要显式设两个：新建主题时核心只把 `about.json` 里排第一的配色设为浅色配色、深色配色留空。
   这个主题没有使用 `only_theme_color_schemes`，核心不会替我们设。

下面几项不由 `import_theme.rb` 管，仍按原来的做法：

1. **字体**：基础字体和标题字体用系统字体，已由 `infra/discourse/site_settings.rb` 设置
   （`base_font` / `heading_font` 均为 `system`），不需要手动操作。
   原因：核心默认是 Inter，它不含中文，中文会回落到系统字体但字重和间距不一致。
2. **Logo**：管理员在后台上传 `design/brand/gtmc-logo-3x.png`（步骤见 `infra/content/admin-setup.md`）。
   主题只给 `#site-logo` 加 `image-rendering: pixelated`，缩放时像素保持方块。小 Logo 还没定稿，暂用核心默认。
3. **侧边栏与版块图标**：导入主题之后执行 `infra/discourse/sidebar.rb`（它要用主题里的图标，所以排在导入之后），不要在后台手动配。见 `infra/content/admin-setup.md` 的执行顺序一节。
4. **页脚的 Discord 链接**：外观 → 主题 → GTMC → 设置，把 `discord_invite_url` 填成社团的 Discord 邀请链接；留空则页脚不显示这个链接。

## 配色与对比度

颜色只通过 `about.json` 的 `color_schemes` 定义，样式里不写色值，全部取 Discourse 的 CSS 变量。

`about.json` 里除了 12 个基础色，还显式覆盖了几个由 Discourse 自动推算的颜色（`primary-medium`、`primary-600` 等）。
原因：Discourse 对浅色方案的默认推算是「向白色提亮 50%」，得到的次要文字（话题列表里的时间、元信息）对比度只有 2.75:1，
达不到 WCAG AA 的 4.5:1。深色方案把次要文字略微提亮，是为了在列表行底色上也留出余量。
改动配色后，用相同的推算公式重新验算（公式来自核心的 `color_transformations.scss` 和 `dark-light-diff`）。

## 视觉规范

改样式之前先对照这一节；新规则和这里冲突时，要么改规则，要么先改这一节并说明原因。
借鉴的是 Linux.do 的手感（布局、间距、交互反馈），不是它的配色和视觉稿。下面的 `--gtmc-*` 变量都定义在 `common/common.scss` 的 `:root`；
依赖核心在内层元素上才改写的变量（如 `--d-sidebar-width`）的宽度不要存成 `:root` 变量，直接写在用到的规则里。

### 布局：两级边缘

- **页面级**：页头、正文区、页脚共用同一对左右边缘，即核心 `.wrap` 的宽度。桌面端这个宽度固定为
  侧边栏宽 + 核心的 `--d-max-width`，**侧边栏收起时也不变窄**：
  收起后正文向左占满侧边栏让出的位置，所以页头左上角的开关、Logo 和正文左边缘始终在同一条线上，开关也不会移动（T3 的验收要求）。
- **侧边栏**是正文区网格的第一栏，与正文之间隔核心的 `--d-main-content-gap`；它不改变页面级边缘。
- **右栏**（见「右栏」）的右边缘就是页面级的右边缘：话题列表页它是网格的最后一栏，话题页它是时间线那一栏，两者右边缘重合。
  右栏出现时话题列表变窄，话题级栏宽不变（话题页的右栏本来就在帖子右侧的空位里）。
- **话题级**：话题页里的标题、帖子、帖子下的按钮行、「推荐话题」列表共用一个栏宽
  （核心算帖子宽度的同一个公式：头像宽 + 正文宽 + 两倍内边距，约 760px），左边缘就是页面级的左边缘。
  时间线在这一栏右侧，占用余下的宽度。不要为了「填满」去加宽正文：一行超过约 40 个汉字就难读了。
- 手机宽度下以上区块都占满屏宽，只留核心的 `--d-wrap-padding-x` 边距。

### 字体与字号

- **像素字体只用于标签、在线人数和日期块**：版块标签、置顶标签、版本号这类短标签，右栏的在线人数，活动的日期块。
  正文、标题、按钮、提示框一律系统字体（`AGENTS.md`「界面规则」）：长文字用像素字体难读。
  - 写法：元素加 `gtmc-pixel-text` 类（字体、12px、常规字重、关闭抗锯齿）；大数字再把 `font-size` 换成
    `--gtmc-pixel-font-size-large`（24px）或 `--gtmc-pixel-font-size-huge`（36px）。字号只取 12px 的整数倍，原因见「像素字体」。
  - 版块标签是核心渲染的，`common/common.scss` 直接给核心的 `.badge-category__name` 套同样的规则。
  - 置顶标签由 `gtmc-pinned-label.gjs` 挂在话题列表的 `topic-list-before-status` 出口；核心那个只是标示用的图钉随之隐藏，
    能点的图钉（可以取消置顶）是控件，保留。
- 字号只用核心的几档变量，不写 px：

  | 层级 | 变量 | 用在 |
  |---|---|---|
  | 页面标题 | 核心默认（话题标题、版块名） | 不在主题里改 |
  | 区块标题 | 核心默认（`--font-up-1` 一档） | 话题页下方「新话题和未读话题」这类列表标题 |
  | 正文 | `--font-0` | 帖子、列表标题行、按钮、「想阅读更多？」这类提示句 |
  | 次要 / 元信息 | `--font-down-1`，颜色 `--primary-medium` | 时间、计数、页脚 |
  | 声明 | `--font-down-2` | 页脚的商标声明，只此一处 |

- 强调靠字重和颜色，不靠放大字号；一屏之内的粗体只给标题和名字。

### 交互状态

所有能点的东西用同一套反馈，时长和曲线取下一节的动效令牌。

| 控件 | 悬停 | 按下 | 键盘焦点 |
|---|---|---|---|
| 实心按钮（主、默认、危险、成功） | 核心的悬停色 | 方块下沿消失，整体下移 `--gtmc-pressed-offset` | 焦点环 |
| 扁平 / 图标按钮 | 底色变 `--d-hover` | 底色变 `--d-selected` | 焦点环 |
| 链接 | 核心的悬停色 | 不另加 | 焦点环 |
| 侧边栏项、话题列表行 | 底色变 `--d-hover` | 底色变 `--d-selected` | 焦点环（列表行：标题链接得到焦点时环套在整行） |

- **选中态**：荧光笔，即加粗加 `--gtmc-highlighter`（文字下半截一层半透明强调色），套在文字所在的行内元素上。
  不用左边框竖条，不用整行底色（`AGENTS.md`「界面规则」）。侧边栏当前所在的条目就是这样，图标同时换成强调色。
- **方块下沿**：实心按钮底部 `--gtmc-block-edge-height` 的深色内阴影，像方块的立体边。只给实心按钮，扁平按钮没有底色，加了会像一道划痕。
- **焦点环**：`--gtmc-focus-ring-width` 粗的 `--tertiary` 描边，外移 `--gtmc-focus-ring-offset`。核心让大多数控件的键盘焦点和悬停长得一样，
  键盘用户分不清焦点在哪，所以这里统一加环。`--tertiary` 对两套配色的页面底色都超过 3:1（WCAG 非文字对比度）。
  只用 `:focus-visible`，鼠标点击不出环。
- **减少动态效果**：系统开了「减少动态效果」（`prefers-reduced-motion: reduce`）时过渡时长为 0，按下时不位移。
- **不可点的东西没有悬停效果**。首页的服务器状态卡片是信息块不是链接，只和全站统一边框和圆角；卡片里的复制按钮和地图链接按上表走。

### 动效

只用三个令牌，定义在 `common/common.scss` 的 `:root`，插件也直接取用（`AGENTS.md`「界面规则」）：

| 令牌 | 值 | 用在 |
|---|---|---|
| `--gtmc-duration-state` | 120ms | 悬停、按下、选中、展开这类状态切换；快到感觉不到延迟，又能让颜色变化不生硬 |
| `--gtmc-tooltip-delay` | 400ms | 提示出现前的停留时间，鼠标扫过不会闪（见「全局提示」） |
| `--gtmc-ease` | `cubic-bezier(0.2, 0, 0, 1)` | 所有过渡的曲线，先快后慢 |

系统开了「减少动态效果」时 `--gtmc-duration-state` 为 0；提示的延迟不是动画，照旧。

### 边框与间距

- 区块边框：`1px solid var(--content-border-color)`，圆角 `--d-border-radius`（主题收到 2px）。状态色条、页脚分隔线之类的强调边另算，宽度写成具名变量。
- 间距只用核心的 `--space-1` 到 `--space-12`（4px 一档），不写 px、em。

## 像素字体

- 字体：[Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font)，SIL OFL 1.1，许可全文在 `fonts/OFL.txt`；
  它内含的 Ark Pixel、Cubic 11、Galmuri 的许可在 `fonts/LICENSES/`。
- 版本：发布 `2026.11.10`，资源 `fusion-pixel-font-12px-proportional-ttf.woff2-v2026.11.10.zip`，
  SHA-256 `5dec211c35db7d5aecfe7c482c672313fa122df98510261fea1894c82088d0b3`，取其中的 `fusion-pixel-12px-proportional-zh_hans.ttf.woff2`
  （SHA-256 `36af87a9bfee40173d7eff551558f02258a98304b1ec74dab4773e9931682fc7`）。
  下载地址：`https://github.com/TakWolf/fusion-pixel-font/releases/download/2026.11.10/fusion-pixel-font-12px-proportional-ttf.woff2-v2026.11.10.zip`
- 这是**修改版**（子集化）。OFL 要求修改版不得使用「保留字体名」；该字体的 OFL 声明没有指定保留字体名，
  所以字体内部名称保持原样。CSS 里的 `font-family: "GTMC Pixel"` 只是本站的引用名。
- 子集内容（`fonts/subset-chars.txt`，4038 个字符）：ASCII 可打印字符；GB 2312 第 1 区（全角标点和符号）、
  第 3 区（全角字母数字标点）、第 16–55 区（一级汉字 3755 个，是常用字的主体）；另加「」『』。
  子集之外的字（生僻字、emoji）按 CSS 回落到系统字体。
- 体积：原文件约 959 KB，子集约 135 KB。

### 用在哪里

只用在标签、在线人数和日期块，字号只取 12px 的整数倍（12/24/36px），原因见 `common/common.scss`。
话题标题、侧边栏、按钮、表单、提示框都用系统字体，见「视觉规范 · 字体与字号」。要扩大使用范围，先改那一节并说明理由。

### 重新生成子集

需要 Python 3 和 `fonttools`、`brotli`（本次生成用的是 fonttools 4.65.0）。在一个空目录里执行（不要在仓库里执行，下载的文件不进仓库）。用上面的版本和字符表，产物与仓库里的字节完全一致（已核对 SHA-256 `6fa2ac7f…`）：

```sh
pip install fonttools brotli

curl -LO https://github.com/TakWolf/fusion-pixel-font/releases/download/2026.11.10/fusion-pixel-font-12px-proportional-ttf.woff2-v2026.11.10.zip
shasum -a 256 fusion-pixel-font-12px-proportional-ttf.woff2-v2026.11.10.zip   # 应等于上面的 5dec211c…
unzip fusion-pixel-font-12px-proportional-ttf.woff2-v2026.11.10.zip

# 字符表：已提交在 fonts/subset-chars.txt；需要重新生成时：
python3 - <<'PY'
def rows(zone):  # GB 2312 的一个「区」，区号从 1 起
    for low_byte in range(0xA1, 0xFF):
        try:
            yield bytes([0xA0 + zone, low_byte]).decode("gb2312")
        except UnicodeDecodeError:
            pass

chars = [chr(code) for code in range(0x20, 0x7F)]
for zone in (1, 3, *range(16, 56)):
    chars += rows(zone)
chars += list("「」『』")
open("subset-chars.txt", "w").write("".join(dict.fromkeys(chars)) + "\n")
PY

pyftsubset fusion-pixel-12px-proportional-zh_hans.ttf.woff2 \
  --text-file=subset-chars.txt --flavor=woff2 --layout-features='*' --no-hinting \
  --name-IDs='*' --name-languages='*' \
  --output-file=fusion-pixel-12px-proportional-zh_hans-subset.woff2
```

产物复制到 `theme/assets/`，文件名保持不变（`about.json` 里按这个路径注册）。
`--name-IDs='*'` 是为了保留字体文件里的版权和许可字段（name 表的 0、13、14 号）。

## 图标

`icons/` 里一个图标一个 `.svg` 文件，文件名（不含 `.svg`）就是图标名。Discourse 每个主题只认一个图标精灵
（核心 `lib/svg_sprite.rb` 的 `icons-sprite`），所以 `infra/discourse/import_theme.rb` 在打包时把它们拼成
`assets/gtmc-icons.svg`（只存在于压缩包里，仓库里没有这个文件），
导入主题后可以在任何填图标名的地方使用：版块的图标样式、侧边栏链接、`dIcon`。

- **来源**：全部由本仓库从零绘制，原创，随主题同许可发布。**没有**描摹、取色或参照 Minecraft 原版贴图和图标（PLAN 第 0 节非目标），
  只取告示牌、蛋糕、砖墙这类通用题材。新增图标也必须遵守这一条。
- **规格**：8×8 网格、整数坐标、单色 `fill="currentColor"`、`shape-rendering="crispEdges"`。
  单色是为了让图标跟着所在位置的文字颜色走：侧边栏和版块徽章里取版块颜色，深浅两套配色下都不用另画。
- **显示尺寸**：只以 8px 的整数倍显示（16/24/32px），一个网格格子正好对应整数个屏幕像素，边缘才不发虚（`AGENTS.md`「界面规则」）。
  `common/common.scss` 把所有 `gtmc-` 图标统一定为 `--gtmc-icon-size`（16px），不随所在位置的字号缩放。
  要更大的图标（如右栏的图标块）用 24px 或 32px，不要用别的值。
- **设计稿**：`design/brand/icons-8x8/` 是设计阶段的同一套文件。以本目录为准，改图标改这里。
- **文件**：`icons/gtmc-<英文名>.svg`，普通的独立 SVG，必须有 `viewBox`。打包时颜色会被统一换成 `currentColor`，
  所以画的时候用什么颜色都行，但只能是单色剪影。

| 图标 | 用在 |
|---|---|
| `gtmc-sign` 告示牌 | 公告 |
| `gtmc-cake` 蛋糕 | 活动 |
| `gtmc-bricks` 砖墙 | 建筑展示 |
| `gtmc-gear` 齿轮 | 技术开发 |
| `gtmc-chest` 箱子 | 资源分享 |
| `gtmc-scroll` 卷轴 | 白名单与申诉 |
| `gtmc-bucket` 水桶 | 水吧 |
| `gtmc-crown` 王冠 | 老玩家俱乐部 |
| `gtmc-layers` 叠起的方块 | 侧边栏：最新话题 |
| `gtmc-compass` 指南针 | 新人指南 |
| `gtmc-medal` 奖章 | 侧边栏：徽章 |
| `gtmc-players` 两个人 | 侧边栏：用户 |
| `gtmc-magnifier` 放大镜 | 侧边栏：审核（仅管理人员可见） |
| `gtmc-hammer` 锤子 | 侧边栏：管理（仅管理员可见） |
| `gtmc-quill` 羽毛笔 | 侧边栏「更多」：我的帖子 |
| `gtmc-envelope` 信封 | 侧边栏「更多」：我的消息 |
| `gtmc-door` 门 | 侧边栏「更多」：邀请 |
| `gtmc-info` 信息牌 | 侧边栏「更多」：关于 |
| `gtmc-banner` 旗帜 | 侧边栏「更多」：群组 |
| `gtmc-copy` 两张纸 | 右栏服务器面板：复制地址 |
| `gtmc-chevron` 向下尖角 | 右栏：展开折叠的条目 |
| `gtmc-bubble` 对话气泡 | 回复数 |
| `gtmc-eye` 眼睛 | 浏览数 |
| `gtmc-heart` 心 | 点赞数 |

版块和侧边栏用哪个图标写在 `infra/discourse/sidebar.rb`，改了上表要同步改那里；后五个由插件和主题的组件直接用图标名引用。

### 新增或修改一个图标

1. 用任何能导出 SVG 的工具在 8×8 画布上画（Inkscape、Figma 都行；像素画工具导出的 SVG 也可以），每格一个整数坐标的方块。
   8×8 只容得下剪影：线条 1 格，细节之间至少隔 1 格，否则 16px 下糊成一团。名字用 `gtmc-` 开头，免得和核心或插件的图标重名。
2. 存成 `icons/gtmc-<英文名>.svg`（改已有图标就直接覆盖那个文件）。导入脚本会检查文件名和 `viewBox`，不合格就报错退出。
3. 在上表补一行，提交，然后重新导入主题。
4. 在浏览器里看 16px 下的效果：深浅两套配色都看一遍。

## 右栏

设计稿 C 是三栏：左侧边栏、中间内容、右栏（`design/mockups/c-server-first.html`、`c-topic.html`）。
主题只提供右栏的位置、一个插件出口和面板的外观；服务器、新人进服、近期活动这些面板由插件渲染（PLAN T5b）。

- **插件出口 `gtmc-right-rail`**：插件用 `api.renderInOutlet("gtmc-right-rail", 组件)` 把面板放进右栏。
  出口参数只有 `topic`：话题页是当前话题（核心的 Topic 模型），话题列表页是 `null`。插件按它决定在哪类页面出现。
- **在哪里出现**：
  - 话题列表页（路由名以 `discovery.` 开头：首页、版块列表、某个版块的话题列表），视口不窄于 80rem（核心的 `xl` 断点）时。
    `javascripts/discourse/components/gtmc-right-rail.gjs` 挂在核心的 `after-main-outlet` 出口，成为正文区网格（`#main-outlet-wrapper`）的第三栏，
    出现时 body 带 `gtmc-has-right-rail` 类，`desktop/desktop.scss` 据此分栏。再窄的话三栏并排时话题列表不到 500px，所以不显示。
  - 话题页：核心显示时间线时（桌面视图、视口不窄于 925px）。`gtmc-topic-rail.gjs` 挂在核心的 `topic-navigation` 出口，
    也就是时间线所在的那一栏：帖子那一栏约 760px，再加一条独立的右栏放不下，而时间线那一栏本来就在帖子右边、宽度相当。
    栏里从上到下是参与者、同版块话题、`gtmc-right-rail` 出口，最后是核心的时间线，当作「阅读进度」面板。
    时间线放在最下面，是因为只有它需要在滚动时一直留在屏幕上（sticky），上面几块随页面滚走。
  - 手机宽度不显示右栏，插件在手机上自己换形态（PLAN T5b）。
- **宽度**：`--gtmc-right-rail-width`（300px），列表页和话题页相同，右边缘都对齐页面级的右边缘。
- **面板外观**：外层用 `gtmc-rail-panel` 类，标题用 `h3.gtmc-rail-panel-title`（右侧可放一个 `small` 作计数），
  空状态和失败时的一句话用 `p.gtmc-rail-panel-placeholder`。面板之间的间隔由右栏统一给出，面板自己不加外边距。

## 全局提示

说明性的文字不常驻页面（`AGENTS.md`「界面规则」）：图标、人数、版本号这类元素的说明写在 `data-tooltip` 里，鼠标停留或键盘聚焦时才出现。
主题和插件的元素都这样写，不用各自包提示组件：

```hbs
<button class="btn-flat" aria-label={{this.copyLabel}} data-tooltip={{this.copyLabel}}>{{dIcon "gtmc-copy"}}</button>
```

- **行为**（`javascripts/discourse/lib/gtmc-global-tooltip.js`，移植自负责人的 OpenCard 项目）：
  默认贴着鼠标并跟随；键盘聚焦时立即出现，锚定在控件上；鼠标第一次停留等 `--gtmc-tooltip-delay`（400ms）再淡入；
  放不下时翻到对侧（锚定控件时先对侧、再另一轴，贴鼠标时左右、上下各自翻），始终完整留在视口里；点击、Esc、移开即收起。
  触屏上点按不出提示。
- **可选属性**（写在元素或祖先上，就近生效）：
  - `data-tooltip-anchor="target"`：锚定在控件上而不是贴鼠标。
  - `data-tooltip-placement="top|bottom|left|right"`：锚定时画在哪一侧，默认 `bottom`。水平排列的控件不要用 `left`/`right`，会盖住相邻的控件。
  - `data-tooltip-group`（写在容器上）：容器里相邻的控件共用「热窗口」，第一次等延迟，之后在组内换控件立即换内容、不再淡入；离开容器就收起。
  - `data-tooltip-overflow`：只在文字被截断（省略号）时才提示，用于可能放不下的名字。
- **不要**：有常驻可见文字的控件不再重复同样的提示；只有图标的按钮除了 `data-tooltip` 还要有 `aria-label`，读屏软件不读提示层。
- **结构**：提示层是 `components/gtmc-tooltip-layer.gjs`（挂在 `below-footer` 出口，全站一个），行为在 `lib/gtmc-global-tooltip.js`。
  后者是全站唯一直接操作 DOM 的代码（文档级事件监听、按实时几何位置摆放），这是 `AGENTS.md` 的例外条款，别的地方不要再这样写。
- **核心的 DTooltip**（float-kit，核心和插件里用组件写的提示）行为不改，`common/common.scss` 只把外观改成与全局提示一致：
  深底浅字、系统字体、主题圆角、箭头同色、淡入用动效令牌。
- **测试**：`test/unit/lib/gtmc-global-tooltip-test.js`，在 Discourse 源码目录对着运行中的开发站执行
  `QUNIT_RAILS_ENV=development bin/qunit --theme-name GTMC --qunit-path /theme-qunit`（主题要先导入，测试文件随主题上传）。

## 页脚

`javascripts/discourse/components/gtmc-footer.gjs` 是全站页脚：社团名和一句简介、三到四个链接、Minecraft 商标声明。
`javascripts/discourse/api-initializers/gtmc-footer.js` 用 `api.renderInOutlet("below-footer", …)` 把它挂在页面最底部。
选这个出口是因为它在核心自定义页脚（后台的「自定义 HTML」页脚）之后、所有页面都有，并带 `showFooter` 参数：
核心在话题列表、帖子读到底之前把它置为 `false`（无限滚动），组件据此隐藏，否则页脚会夹在列表中间。

- **文字**：全部在 `locales/zh_CN.yml` 和 `locales/en.yml` 的 `gtmc_footer` 下，经 `themePrefix` 取用，改文字不用动组件。
- **链接**：来自 `settings.yml` 的三个设置，留空的不显示；「关于」是核心自带页面，地址固定为 `/about`。
  - `discord_invite_url`：管理员在后台填（邀请会过期、会重建，没有能写死的值）。
  - `footer_newcomer_guide_url`、`footer_appeal_url`：由 `infra/discourse/sidebar.rb` 写入，分别指向「新人指南」置顶帖和「白名单与申诉」版块。
    地址带数据库 id（`/c/<名字>/<id>`、`/t/<名字>/<id>`），每个站点不同，所以不能写死在主题里。
    **不要在后台手改**，重跑 `sidebar.rb` 会改回来。
- **样式**：在 `common/common.scss`，只用 CSS 变量，类名以 `gtmc-footer` 开头；手机宽度下链接自动换行。
  页脚外层带核心的 `.wrap` 类，宽度和左右边缘与页头、正文一致；它在侧边栏所在的网格之外，侧边栏展开时由 `desktop/desktop.scss` 让出左边一栏，否则会比正文偏左。
- **商标声明**：Minecraft 是 Mojang Synergies AB 的商标；本站是学生社团自办，与 Mojang、Microsoft 无关。
  这句话要保留，文字改动前先和负责人确认。

## 待验证

下面这些还**没有逐项在运行中的站上核对过**（只做了静态检查，或只对照过核心源码）：

- 桌面和手机宽度下，首页、话题页、发帖框、用户页、管理后台有没有错位或看不清的文字。
- 像素字体是否被 Discourse 正确上传并通过 `$gtmc-pixel-font` 注入（浏览器开发者工具里看 `@font-face` 的 `src` 是否是 `/uploads/...`）。
- 压缩包导入是否把 `about.json` 的两套配色、字体资源都建出来。
