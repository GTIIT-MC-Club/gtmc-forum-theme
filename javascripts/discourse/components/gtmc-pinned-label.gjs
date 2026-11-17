import { themePrefix } from "virtual:theme";
import { i18n } from "discourse-i18n";

// 话题列表里置顶话题标题前的「置顶」标签（设计稿 c-server-first.html），像素字体，说明放在悬停提示里。
// 核心本来只画一个图钉图标；不能点的那种图钉由 common.scss 隐藏，能点的（可以取消置顶的）保留，它是个控件。
const GtmcPinnedLabel = <template>
  {{#if @outletArgs.topic.pinned}}
    <span
      class="gtmc-pinned-label gtmc-pixel-text"
      data-tooltip={{i18n "topic_statuses.pinned.help"}}
    >{{i18n (themePrefix "gtmc_topic_list.pinned")}}</span>
  {{/if}}
</template>;

export default GtmcPinnedLabel;
