#!/usr/bin/env ruby
# frozen_string_literal: true

# 把 icons/*.svg 拼成主题的图标精灵 assets/gtmc-icons.svg（about.json 的 icons-sprite 指向它）。
#
# Discourse 每个主题只认一个图标精灵（核心 lib/svg_sprite.rb 的 icons-sprite），而图标在仓库里一个文件一个，
# 方便单独画、单独改。主题从 Git 安装时核心不跑任何构建步骤，所以生成的精灵要提交进仓库。
#
# 用法（在仓库根目录）：
#   ruby scripts/build_icon_sprite.rb           改了 icons/ 之后执行，重新生成精灵，和图标一起提交
#   ruby scripts/build_icon_sprite.rb --check   只检查提交的精灵是否与 icons/ 一致，不一致时退出码为 1
#
# 只用 Ruby 标准库（REXML），不需要 bundle install。

require "rexml/document"

REPOSITORY_ROOT = File.expand_path("..", __dir__)
ICONS_DIRECTORY = File.join(REPOSITORY_ROOT, "icons")
SPRITE_PATH = File.join(REPOSITORY_ROOT, "assets", "gtmc-icons.svg")
ICON_NAME_PATTERN = /\Agtmc-[a-z0-9-]+\z/
# 导出工具可能写死颜色；一律换成 currentColor，图标才能跟着版块颜色和深浅配色变色
ICON_COLOR_ATTRIBUTES = %w[fill stroke]

# 每个图标文件是一个独立的 SVG（任何绘图工具导出的都行），文件名就是图标名。
# 取根元素的 viewBox 和全部子元素，包成 <symbol id="图标名">；颜色统一成 currentColor。
def icon_symbol(icon_path)
  icon_name = File.basename(icon_path, ".svg")
  unless icon_name.match?(ICON_NAME_PATTERN)
    abort "icon file #{icon_path}: the name must start with gtmc- and use lowercase letters, digits and -"
  end

  # 属性统一用双引号，生成结果才和手写的 SVG 一个样子，diff 也好读
  svg = REXML::Document.new(File.read(icon_path), attribute_quote: :quote).root
  abort "icon file #{icon_path} is not an SVG" if svg.nil? || svg.name != "svg"
  view_box = svg.attributes["viewBox"] || abort("icon file #{icon_path} has no viewBox")

  svg.each_recursive do |element|
    ICON_COLOR_ATTRIBUTES.each do |attribute|
      value = element.attributes[attribute]
      element.attributes[attribute] = "currentColor" if value && value != "none"
    end
  end
  %(<symbol id="#{icon_name}" viewBox="#{view_box}">#{svg.children.map(&:to_s).join.strip}</symbol>)
end

def build_icon_sprite
  icon_paths = Dir.glob(File.join(ICONS_DIRECTORY, "*.svg")).sort
  abort "no icons found in #{ICONS_DIRECTORY}" if icon_paths.empty?

  symbols = icon_paths.map { |icon_path| icon_symbol(icon_path) }
  [%(<svg xmlns="http://www.w3.org/2000/svg">\n#{symbols.join("\n")}\n</svg>\n), icon_paths.size]
end

sprite, icon_count = build_icon_sprite

case ARGV
in []
  File.write(SPRITE_PATH, sprite)
  puts "wrote #{SPRITE_PATH} from #{icon_count} icons"
in ["--check"]
  committed_sprite = File.exist?(SPRITE_PATH) ? File.read(SPRITE_PATH) : nil
  if committed_sprite != sprite
    abort "#{SPRITE_PATH} does not match icons/; run ruby scripts/build_icon_sprite.rb and commit the result"
  end
  puts "#{SPRITE_PATH} matches #{icon_count} icons"
else
  abort "usage: ruby scripts/build_icon_sprite.rb [--check]"
end
