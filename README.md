# GTMC 论坛主题

Discourse 主题：浅色、深色两套配色跟随系统，草方块绿强调色，圆角收小、边框硬朗；**只有 Logo 文字用开源像素字体**，其余一律系统字体。
不使用 Mojang 的任何素材，不复刻 Linux.do 的视觉稿。

## 目录

```
about.json              主题元数据、两套配色、像素字体的注册
common/common.scss      手机和桌面共用：字体声明、核心 CSS 变量覆盖、Logo、按钮
desktop/desktop.scss    仅桌面：侧边栏选中条、页面宽度固定（侧边栏收起时不变窄，开关不动）、侧边栏展开时页脚与正文对齐
（没有 mobile/：手机端目前不需要额外样式，需要时再加 mobile/mobile.scss。
 当前版本的核心不按设备二选一，而是给桌面样式表加 media="(width >= 40rem)"：视口不小于 640px 就加载，
 所以手机竖屏不受 desktop.scss 影响，但横屏的平板会加载它。）
javascripts/            页脚组件（Glimmer）和挂载它的 api-initializer，见「页脚」
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
2. **Logo**：不要上传 Logo 图片（核心默认的 Logo 图已由 `site_settings.rb` 清掉）。站点没有 Logo 图片时，页头显示站点标题文字（`site_settings.rb` 设的「GTMC 论坛」），
   这段文字就是用像素字体渲染的。上传了图片则不会走像素字体。
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
- **话题级**：话题页里的标题、帖子、帖子下的按钮行、「推荐话题」列表共用一个栏宽
  （核心算帖子宽度的同一个公式：头像宽 + 正文宽 + 两倍内边距，约 760px），左边缘就是页面级的左边缘。
  时间线在这一栏右侧，占用余下的宽度。不要为了「填满」去加宽正文：一行超过约 40 个汉字就难读了。
- 手机宽度下以上区块都占满屏宽，只留核心的 `--d-wrap-padding-x` 边距。

### 字体与字号

- **像素字体只用于 Logo 文字**（`#site-text-logo`）。话题标题是用户内容，侧边栏、按钮、表单都是界面，一律用系统字体；
  像素字体和系统字体在同一块区域里混排会像两个产品拼在一起。
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

所有能点的东西用同一套反馈，时长都取 `--gtmc-state-transition-duration`（120ms：快到感觉不到延迟，又能让颜色变化不生硬）。

| 控件 | 悬停 | 按下 | 键盘焦点 |
|---|---|---|---|
| 实心按钮（主、默认、危险、成功） | 核心的悬停色 | 方块下沿消失，整体下移 `--gtmc-pressed-offset` | 焦点环 |
| 扁平 / 图标按钮 | 底色变 `--d-hover` | 底色变 `--d-selected` | 焦点环 |
| 链接 | 核心的悬停色 | 不另加 | 焦点环 |
| 侧边栏项、话题列表行 | 底色变 `--d-hover` | 底色变 `--d-selected` | 焦点环（列表行：标题链接得到焦点时环套在整行） |

- **方块下沿**：实心按钮底部 `--gtmc-block-edge-height` 的深色内阴影，像方块的立体边。只给实心按钮，扁平按钮没有底色，加了会像一道划痕。
- **焦点环**：`--gtmc-focus-ring-width` 粗的 `--tertiary` 描边，外移 `--gtmc-focus-ring-offset`。核心让大多数控件的键盘焦点和悬停长得一样，
  键盘用户分不清焦点在哪，所以这里统一加环。`--tertiary` 对两套配色的页面底色都超过 3:1（WCAG 非文字对比度）。
  只用 `:focus-visible`，鼠标点击不出环。
- **减少动态效果**：系统开了「减少动态效果」（`prefers-reduced-motion: reduce`）时过渡时长为 0，按下时不位移。
- **不可点的东西没有悬停效果**。首页的服务器状态卡片是信息块不是链接，只和全站统一边框和圆角；卡片里的复制按钮和地图链接按上表走。

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

只用在 Logo 文字（`#site-text-logo`），字号 24px，是 12px 的整数倍，原因见 `common/common.scss`。
话题标题、侧边栏、按钮、表单都用系统字体，见「视觉规范 · 字体与字号」。要扩大使用范围，先改那一节并说明理由。

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
| `gtmc-gear` 齿轮 | 红石与技术 |
| `gtmc-chest` 箱子 | 模组与资源 |
| `gtmc-scroll` 卷轴 | 白名单与申诉 |
| `gtmc-bucket` 水桶 | 水吧 |
| `gtmc-crown` 王冠 | 老玩家俱乐部 |
| `gtmc-layers` 叠起的方块 | 侧边栏：最新话题 |
| `gtmc-compass` 指南针 | 侧边栏：新人指南 |
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

## 页脚

`javascripts/discourse/components/gtmc-footer.gjs` 是全站页脚：社团名和一句简介、三到四个链接、Minecraft 商标声明。
`javascripts/discourse/api-initializers/gtmc-footer.js` 用 `api.renderInOutlet("below-footer", …)` 把它挂在页面最底部。
选这个出口是因为它在核心自定义页脚（后台的「自定义 HTML」页脚）之后、所有页面都有，并带 `showFooter` 参数：
核心在话题列表、帖子读到底之前把它置为 `false`（无限滚动），组件据此隐藏，否则页脚会夹在列表中间。

- **文字**：全部在 `locales/zh_CN.yml` 和 `locales/en.yml` 的 `gtmc_footer` 下，经 `themePrefix` 取用，改文字不用动组件。
- **链接**：来自 `settings.yml` 的三个设置，留空的不显示；「关于」是核心自带页面，地址固定为 `/about`。
  - `discord_invite_url`：管理员在后台填（邀请会过期、会重建，没有能写死的值）。
  - `footer_newcomer_guide_url`、`footer_appeal_url`：由 `infra/discourse/sidebar.rb` 写入，与侧边栏指向同一处。
    地址带数据库 id（`/c/<名字>/<id>`、`/t/<名字>/<id>`），每个站点不同，所以不能写死在主题里。
    **不要在后台手改**，重跑 `sidebar.rb` 会改回来。
- **样式**：在 `common/common.scss`，只用 CSS 变量，类名以 `gtmc-footer` 开头；手机宽度下链接自动换行。
  页脚外层带核心的 `.wrap` 类，宽度和左右边缘与页头、正文一致；它在侧边栏所在的网格之外，侧边栏展开时由 `desktop/desktop.scss` 让出左边一栏，否则会比正文偏左。
- **商标声明**：Minecraft 是 Mojang Synergies AB 的商标；本站是学生社团自办，与 Mojang、Microsoft 无关。
  这句话要保留，文字改动前先和负责人确认。

## 待验证

下面这些还**没有逐项在运行中的站上核对过**（只做了静态检查，或只对照过核心源码）：

- 桌面和手机宽度下，首页、话题页、发帖框、用户页、管理后台有没有错位或看不清的文字。
- `#site-text-logo`、`.sidebar-section-link.active`
  这几个核心选择器在当前 Discourse 版本里是否仍然命中（只对照过 `discourse/discourse` 主分支的源码，没有对着运行中的实例看过）。
- 像素字体是否被 Discourse 正确上传并通过 `$gtmc-pixel-font` 注入（浏览器开发者工具里看 `@font-face` 的 `src` 是否是 `/uploads/...`）。
- 压缩包导入是否把 `about.json` 的两套配色、字体资源都建出来。
- 手机端 24px 的 Logo 文字在页头里是否放得下；放不下就新增 `mobile/mobile.scss` 把 `--gtmc-logo-font-size` 调小。
