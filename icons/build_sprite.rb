# frozen_string_literal: true

# 把本目录下的像素图标（*.txt）拼成主题的 SVG 图标精灵 theme/assets/gtmc-icons.svg。
# 用法（在仓库根目录）：ruby theme/icons/build_sprite.rb
# 只用 Ruby 标准库。改了任何 .txt 都要重新运行，并把 .txt 和生成的 .svg 一起提交。
#
# .txt 的格式：正好 16 行、每行 16 个字符，`#` 是实心像素，`.` 是空白。文件名（去掉 .txt）就是图标名，
# 必须以 gtmc- 开头，避免和核心或其他插件的图标重名（核心按 symbol 的 id 合并所有精灵，后注册的会覆盖先注册的）。

GRID_SIZE = 16
ICON_NAME_PATTERN = /\Agtmc-[a-z0-9-]+\z/
ICONS_DIR = __dir__
SPRITE_PATH = File.expand_path("../assets/gtmc-icons.svg", __dir__)

def read_grid(path)
  rows = File.readlines(path, chomp: true)
  if rows.size != GRID_SIZE
    abort "#{path}: expected #{GRID_SIZE} rows, found #{rows.size}"
  end

  rows.each_with_index do |row, row_index|
    unless row.match?(/\A[#.]{#{GRID_SIZE}}\z/)
      abort "#{path}: row #{row_index + 1} must be #{GRID_SIZE} characters of '#' or '.'"
    end
  end
  rows
end

# 每一行里连续的实心像素合成一段矩形子路径（M x y h 宽 v 1 h -宽 z），坐标都是整数，
# 配合 crispEdges 在 16px 及其整数倍下每个格子正好对齐屏幕像素。
def path_data(rows)
  rows
    .each_with_index
    .flat_map do |row, y|
      row
        .enum_for(:scan, /#+/)
        .map do
          x = Regexp.last_match.begin(0)
          width = Regexp.last_match[0].length
          "M#{x} #{y}h#{width}v1h-#{width}z"
        end
    end
    .join
end

symbols =
  Dir
    .glob(File.join(ICONS_DIR, "*.txt"))
    .sort
    .map do |path|
      icon_name = File.basename(path, ".txt")
      abort "#{path}: icon name must match #{ICON_NAME_PATTERN.source}" unless icon_name.match?(ICON_NAME_PATTERN)

      <<~SYMBOL.chomp
        <symbol id="#{icon_name}" viewBox="0 0 #{GRID_SIZE} #{GRID_SIZE}"><path fill="currentColor" shape-rendering="crispEdges" d="#{path_data(read_grid(path))}"/></symbol>
      SYMBOL
    end

File.write(SPRITE_PATH, <<~SVG)
  <!-- 由 theme/icons/build_sprite.rb 从 theme/icons/*.txt 生成，不要手改。图标为本仓库原创，见 theme/README.md「图标」。 -->
  <svg xmlns="http://www.w3.org/2000/svg">
  #{symbols.join("\n")}
  </svg>
SVG

puts "wrote #{symbols.size} icons to #{SPRITE_PATH}"
