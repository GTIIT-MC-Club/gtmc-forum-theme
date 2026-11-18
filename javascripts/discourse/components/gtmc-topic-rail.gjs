import Component from "@glimmer/component";
import { themePrefix } from "virtual:theme";
import PluginOutlet from "discourse/components/plugin-outlet";
import TopicParticipants from "discourse/components/topic-map/topic-participants";
import lazyHash from "discourse/helpers/lazy-hash";
import { i18n } from "discourse-i18n";
import GtmcSameCategoryTopics from "./gtmc-same-category-topics.gjs";

// 话题页的右栏：挂在核心的 topic-navigation 出口，也就是时间线所在的那一栏，直接把时间线那一栏当右栏用，
// 核心时间线的跳转和管理菜单都保留。出现条件、栏内顺序和理由见 README「右栏」。
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
