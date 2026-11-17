import Component from "@glimmer/component";
import { themePrefix } from "virtual:theme";
import PluginOutlet from "discourse/components/plugin-outlet";
import TopicParticipants from "discourse/components/topic-map/topic-participants";
import lazyHash from "discourse/helpers/lazy-hash";
import { i18n } from "discourse-i18n";
import GtmcSameCategoryTopics from "./gtmc-same-category-topics.gjs";

// 话题页的右栏：参与者、同版块话题、插件出口 gtmc-right-rail，下面紧接核心的时间线（当作「阅读进度」面板）。
// 挂在核心的 topic-navigation 出口里，也就是时间线所在的那一栏：话题页正文（约 760px）加一条独立的右栏放不下，
// 时间线那一栏本来就在帖子右边、宽度与列表页的右栏相当，直接把它当右栏用，核心时间线的跳转和管理菜单都保留。
// 只在核心渲染时间线时出现（@outletArgs.renderTimeline：桌面视图且视口不窄于 925px），手机上没有右栏。
export default class GtmcTopicRail extends Component {
  get topic() {
    return this.args.outletArgs.topic;
  }

  get participants() {
    return this.topic.details?.participants ?? [];
  }

  <template>
    {{#if @outletArgs.renderTimeline}}
      <div class="gtmc-topic-rail">
        {{#if this.participants.length}}
          <section class="gtmc-rail-panel">
            <h3 class="gtmc-rail-panel-title">
              {{i18n (themePrefix "gtmc_rail.participants.title")}}
              <small
                data-tooltip={{i18n
                  (themePrefix "gtmc_rail.participants.count_tooltip")
                  count=this.topic.participant_count
                }}
              >{{this.topic.participant_count}}</small>
            </h3>
            <div class="gtmc-topic-participants">
              <TopicParticipants @participants={{this.participants}} />
            </div>
          </section>
        {{/if}}

        <GtmcSameCategoryTopics @topic={{this.topic}} />

        <PluginOutlet
          @name="gtmc-right-rail"
          @outletArgs={{lazyHash topic=this.topic}}
        />
      </div>
    {{/if}}
  </template>
}
