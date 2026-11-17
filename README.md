# GTMC 论坛主题

Discourse 主题：深色优先，草方块绿强调色，圆角收小、边框硬朗；Logo 文字和少数标题用开源像素字体，**正文用系统字体**。
不使用 Mojang 的任何素材，不复刻 Linux.do 的视觉稿。

## 目录

```
about.json              主题元数据、两套配色、像素字体的注册
common/common.scss      手机和桌面共用：字体声明、核心 CSS 变量覆盖、Logo、按钮
desktop/desktop.scss    仅桌面：话题页标题、侧边栏分组标题与选中条
（没有 mobile/：手机端目前不需要额外样式，话题页标题因此保持正文字体；需要时再加 mobile/mobile.scss。
 桌面和手机的样式表是分开编译、按设备二选一加载的，所以 desktop.scss 里的规则不会影响手机。）
locales/                主题描述（theme_metadata.description），没有其他界面文字
assets/                 子集化后的像素字体（woff2）
fonts/                  字体的许可文件、子集字符表（不随主题上传时也要保留，见下）
```

这个主题没有 `settings.yml`：目前没有任何需要管理员在后台调的值。有了再加。

## 开发

需要一个 Discourse 站点和它的管理员 API Key。

```sh
gem install discourse_theme
discourse_theme watch theme/        # 首次运行会问站点地址和 API Key，之后保存修改会实时同步
```

没有测试站的话，视觉效果无从验证，见本文末尾「待验证」。

## 部署到论坛

主题放在仓库的 `theme/` 子目录。Discourse 的「从 Git 仓库安装」会克隆整个仓库并在仓库根目录找 `about.json`
（核心的 `git_importer.rb` 里没有子目录选项），所以这里用压缩包。压缩包导入时，如果解压后只有一个顶层文件夹会自动剥掉，
否则直接把根目录当主题根（`zip_importer.rb` 的 `strip_root_directory`），`about.json` 放在压缩包顶层即可：

```sh
cd theme && zip -r ../gtmc-theme.zip about.json assets common desktop locales
```

后台 → 外观 → 主题 → 安装 → 从你的设备，选择压缩包。之后改了主题再传一次同名压缩包即可更新。
（`fonts/` 不需要上传，里面是给仓库读者看的许可文件和字符表。）

### 装完后在后台要做的设置

1. **设为默认主题**：外观 → 主题，把「GTMC」设为默认。
2. **配色方案**：`about.json` 里 `GTMC Dark` 排在第一，新装主题时 Discourse 把第一个方案设为默认，所以全站默认深色。
   - 这个主题**没有**使用 `only_theme_color_schemes`，`GTMC Light` 不会自动出现在用户的界面偏好里。
     想让用户能切换，到 外观 → 配色方案 → `GTMC Light`，勾选允许用户选择（核心字段名 `user_selectable`，界面文字以当前版本为准）。
   - 在主题的配色设置里，把「深色模式配色」也指向 `GTMC Dark`，免得系统是深色模式的访客看到核心自带的 Dark。
3. **字体**：基础字体和标题字体用系统字体，已由 `infra/discourse/site_settings.rb` 设置
   （`base_font` / `heading_font` 均为 `system`），不需要手动操作。
   原因：核心默认是 Inter，它不含中文，中文会回落到系统字体但字重和间距不一致。
4. **Logo**：不要上传 Logo 图片（核心默认的 Logo 图已由 `site_settings.rb` 清掉）。站点没有 Logo 图片时，页头显示站点标题文字（`site_settings.rb` 设的「GTMC 论坛」），
   这段文字就是用像素字体渲染的。上传了图片则不会走像素字体。
5. **侧边栏**：核心的 `navigation_menu` 设置默认就是 `sidebar`，无需操作；分区和链接的配置见 `infra/README.md`。

## 配色与对比度

颜色只通过 `about.json` 的 `color_schemes` 定义，样式里不写色值，全部取 Discourse 的 CSS 变量。

`about.json` 里除了 12 个基础色，还显式覆盖了几个由 Discourse 自动推算的颜色（`primary-medium`、`primary-600` 等）。
原因：Discourse 对浅色方案的默认推算是「向白色提亮 50%」，得到的次要文字（话题列表里的时间、元信息）对比度只有 2.75:1，
达不到 WCAG AA 的 4.5:1。深色方案把次要文字略微提亮，是为了在列表行底色上也留出余量。
改动配色后，用相同的推算公式重新验算（公式来自核心的 `color_transformations.scss` 和 `dark-light-diff`）。

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

只用在 Logo 文字、桌面端的话题页标题、侧边栏分组标题，**不用在**话题列表、帖子正文、表单和管理后台，
这些地方要紧凑、要看得清。字号只取 12px 的整数倍（24px、12px），原因见 `common/common.scss`。
要扩大使用范围，先在真机上看过非整数倍字号的效果再决定。

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

## 待验证

没有测试站，下面这些**只做了静态检查**，需要在真站上看：

- 桌面和手机宽度下，首页、话题页、发帖框、用户页、管理后台有没有错位或看不清的文字。
- `#site-text-logo`、`#topic-title .fancy-title`、`.sidebar-section-header-text`、`.sidebar-section-link.active`
  这几个核心选择器在当前 Discourse 版本里是否仍然命中（只对照过 `discourse/discourse` 主分支的源码，没有对着运行中的实例看过）。
- 像素字体是否被 Discourse 正确上传并通过 `$gtmc-pixel-font` 注入（浏览器开发者工具里看 `@font-face` 的 `src` 是否是 `/uploads/...`）。
- 压缩包导入是否把 `about.json` 的两套配色、字体资源都建出来。
- 手机端 24px 的 Logo 文字在页头里是否放得下；放不下就新增 `mobile/mobile.scss` 把 `--gtmc-pixel-size-title` 调小。
